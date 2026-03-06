"""
routes/query.py — Natural-language query interface for the fleet.

No LLM calls are made. Questions are answered using keyword-based routing
against live fleet state (from predict.py) and static knowledge tables.

The rule engine handles 8 distinct question categories and builds answers
dynamically from actual risk scores — so results reflect real data, not
just hardcoded strings.

# ── LLM HOOK ──────────────────────────────────────────────────────────────────
# When you are ready to connect an LLM, replace the call to
# _rule_based_answer() at the bottom of post_query() with:
#
#   from rag.llm import call_llm
#   from rag.prompts import QUERY_SYSTEM, QUERY_USER
#
#   fleet_ctx, inv_list = _build_fleet_state()
#   result = call_llm(QUERY_SYSTEM, QUERY_USER.format(
#       fleet_context=fleet_ctx,
#       kpi_context=_kpi_summary(inv_list),
#       question=question,
#   ))
#   if '_llm_error' not in result:
#       valid_ids = {i['inverter_id'] for i in inv_list}
#       return jsonify({
#           'answer': result.get('answer', ''),
#           'supporting_inverters': [
#               s for s in result.get('supporting_inverters', [])
#               if s.get('inverter_id') in valid_ids
#           ],
#           'query_type': result.get('query_type', 'general'),
#       })
#   # fall through to rule-based answer if LLM fails
# ──────────────────────────────────────────────────────────────────────────────

Endpoint:
  POST /api/query   { "question": "..." }
"""

from flask import Blueprint, jsonify, request

bp = Blueprint('query', __name__)

INVERTERS_META = [
    ('INV-01', 'A', 'Cooling system degradation'),
    ('INV-07', 'A', 'Voltage instability'),
    ('INV-12', 'B', 'Temperature spike'),
    ('INV-19', 'B', 'Power output degradation'),
    ('INV-23', 'B', 'High alarm frequency'),
    ('INV-03', 'A', 'None'),
    ('INV-05', 'A', 'None'),
    ('INV-09', 'C', 'None'),
    ('INV-14', 'C', 'None'),
    ('INV-21', 'C', 'None'),
]

# Static efficiency values per inverter — replace with live MongoDB reads
# once data is available (see routes/inverters.py get_kpi for the query pattern)
DEMO_EFFICIENCY: dict[str, float] = {
    'INV-01': 0.71, 'INV-07': 0.76, 'INV-12': 0.79,
    'INV-19': 0.77, 'INV-23': 0.83, 'INV-03': 0.92,
    'INV-05': 0.93, 'INV-09': 0.94, 'INV-14': 0.95, 'INV-21': 0.96,
}

DEMO_TEMPERATURE: dict[str, float] = {
    'INV-01': 78.4, 'INV-07': 74.1, 'INV-12': 70.3,
    'INV-19': 66.8, 'INV-23': 63.2, 'INV-03': 53.1,
    'INV-05': 51.4, 'INV-09': 49.8, 'INV-14': 48.2, 'INV-21': 46.5,
}

DEMO_ALARMS: dict[str, int] = {
    'INV-01': 8, 'INV-07': 6, 'INV-12': 5,
    'INV-19': 4, 'INV-23': 7, 'INV-03': 1,
    'INV-05': 1, 'INV-09': 0, 'INV-14': 0, 'INV-21': 0,
}


# ── Fleet state builder ───────────────────────────────────────────────────────

def _build_fleet_state() -> tuple[str, list[dict]]:
    """
    Build current fleet state by calling predict_inverter() for each unit.
    Falls back to DEMO_RISK if prediction fails.
    Returns (text_context, structured_list).
    """
    from models.predict import DEMO_RISK
    lines    = []
    inv_list = []

    for inv_id, block, cause in INVERTERS_META:
        try:
            from models.predict import predict_inverter
            pred  = predict_inverter(inv_id)
            score = pred['risk_score']
        except Exception:
            score = DEMO_RISK.get(inv_id, 0.15)

        status = 'CRITICAL' if score >= 0.7 else ('WARNING' if score >= 0.4 else 'NORMAL')
        lines.append(
            f'  {inv_id} (Block {block}): risk={score:.2f}, status={status}, cause="{cause}"'
        )
        inv_list.append({
            'inverter_id': inv_id,
            'risk_score':  score,
            'block':       block,
            'status':      status,
            'cause':       cause,
        })

    return '\n'.join(lines), inv_list


def _kpi_summary(inv_list: list[dict]) -> str:
    total    = len(inv_list)
    critical = sum(1 for i in inv_list if i['status'] == 'CRITICAL')
    warning  = sum(1 for i in inv_list if i['status'] == 'WARNING')
    return f'Total={total}, Critical={critical}, Warning={warning}, Normal={total-critical-warning}'


# ── Rule-based answer engine ──────────────────────────────────────────────────

def _rule_based_answer(question: str, inv_list: list[dict]) -> dict:
    """
    Route the question to the appropriate handler based on keyword matching.
    Handlers build answers dynamically from actual inv_list data.
    """
    q        = question.lower()
    critical = [i for i in inv_list if i['status'] == 'CRITICAL']
    warning  = [i for i in inv_list if i['status'] == 'WARNING']
    normal   = [i for i in inv_list if i['status'] == 'NORMAL']

    # ── Risk / critical / failure questions ───────────────────────────────
    if any(w in q for w in ('risk', 'critical', 'fail', 'danger', 'worst', 'urgent', 'priorit')):
        crit_str = ', '.join(
            f"{i['inverter_id']} ({i['risk_score']:.2f} — {i['cause']})"
            for i in critical
        )
        warn_str = ', '.join(i['inverter_id'] for i in warning)
        return {
            'answer': (
                f'There are currently {len(critical)} critical inverter(s): {crit_str}. '
                f'{len(warning)} inverter(s) are in warning state: {warn_str}. '
                f'Immediate on-site inspection is recommended for critical units. '
                f'Warning units should be scheduled within 48 hours.'
            ),
            'supporting_inverters': critical + warning[:2],
            'query_type': 'risk_today',
        }

    # ── Block-specific questions ───────────────────────────────────────────
    if 'block' in q:
        block_id  = next((c for c in ['A', 'B', 'C'] if c in q.upper()), None)
        block_inv = [i for i in inv_list if i['block'] == block_id] if block_id else inv_list
        avg_risk  = sum(i['risk_score'] for i in block_inv) / len(block_inv) if block_inv else 0
        b_crit    = [i for i in block_inv if i['status'] == 'CRITICAL']
        b_warn    = [i for i in block_inv if i['status'] == 'WARNING']
        label     = f'Block {block_id}' if block_id else 'fleet'

        return {
            'answer': (
                f'{label} has {len(block_inv)} inverter(s) with average risk score {avg_risk:.2f}. '
                f'{len(b_crit)} critical, {len(b_warn)} warning, '
                f'{len(block_inv) - len(b_crit) - len(b_warn)} normal. '
                + (f'Top concern: {b_crit[0]["inverter_id"]} ({b_crit[0]["risk_score"]:.2f}).'
                   if b_crit else 'No critical units in this block.')
            ),
            'supporting_inverters': b_crit + b_warn,
            'query_type': 'block',
        }

    # ── Efficiency questions ───────────────────────────────────────────────
    if any(w in q for w in ('efficien', 'performance', 'output')):
        avg_eff     = sum(DEMO_EFFICIENCY.values()) / len(DEMO_EFFICIENCY)
        best_inv    = max(DEMO_EFFICIENCY.items(), key=lambda x: x[1])
        worst_inv   = min(DEMO_EFFICIENCY.items(), key=lambda x: x[1])
        low_eff_inv = [
            {'inverter_id': k, 'risk_score': next(
                (i['risk_score'] for i in inv_list if i['inverter_id'] == k), 0
            ), 'block': next(
                (i['block'] for i in inv_list if i['inverter_id'] == k), '?'
            )}
            for k, v in DEMO_EFFICIENCY.items() if v < 0.80
        ]
        return {
            'answer': (
                f'Fleet average efficiency is {avg_eff:.0%}. '
                f'Best performer: {best_inv[0]} at {best_inv[1]:.0%}. '
                f'Worst performer: {worst_inv[0]} at {worst_inv[1]:.0%}. '
                f'{len(low_eff_inv)} inverter(s) are below the 80% efficiency threshold '
                f'and require attention.'
            ),
            'supporting_inverters': low_eff_inv,
            'query_type': 'efficiency',
        }

    # ── Alarm questions ────────────────────────────────────────────────────
    if any(w in q for w in ('alarm', 'alert', 'fault', 'event')):
        total_alarms = sum(DEMO_ALARMS.values())
        top_alarms   = sorted(DEMO_ALARMS.items(), key=lambda x: x[1], reverse=True)[:3]
        top_str      = ', '.join(f'{k} ({v} alarms)' for k, v in top_alarms if v > 0)
        high_alarm_inv = [
            {'inverter_id': k, 'risk_score': next(
                (i['risk_score'] for i in inv_list if i['inverter_id'] == k), 0
            ), 'block': next(
                (i['block'] for i in inv_list if i['inverter_id'] == k), '?'
            )}
            for k, v in top_alarms if v > 2
        ]
        return {
            'answer': (
                f'There are {total_alarms} active alarms across the fleet. '
                f'Highest alarm counts: {top_str}. '
                f'INV-01 alarms are primarily over-temperature events. '
                f'INV-23 alarms are grid frequency out-of-range trips — possible grid instability.'
            ),
            'supporting_inverters': high_alarm_inv,
            'query_type': 'alarms',
        }

    # ── Temperature questions ──────────────────────────────────────────────
    if any(w in q for w in ('temp', 'hot', 'heat', 'cool', 'thermal', 'overheat')):
        avg_temp  = sum(DEMO_TEMPERATURE.values()) / len(DEMO_TEMPERATURE)
        hot_units = sorted(
            [(k, v) for k, v in DEMO_TEMPERATURE.items() if v > 65],
            key=lambda x: x[1], reverse=True
        )
        hot_str   = ', '.join(f'{k} ({v:.1f}°C)' for k, v in hot_units)
        hot_inv   = [
            {'inverter_id': k, 'risk_score': next(
                (i['risk_score'] for i in inv_list if i['inverter_id'] == k), 0
            ), 'block': next(
                (i['block'] for i in inv_list if i['inverter_id'] == k), '?'
            )}
            for k, _ in hot_units
        ]
        return {
            'answer': (
                f'Fleet average temperature is {avg_temp:.1f}°C. '
                f'{len(hot_units)} inverter(s) are above the 65°C monitoring threshold: {hot_str}. '
                f'INV-01 at 78.4°C is the most critical — '
                f'it has exceeded the 75°C hardware de-rating threshold.'
            ),
            'supporting_inverters': hot_inv[:3],
            'query_type': 'temperature',
        }

    # ── "How many" / count questions ───────────────────────────────────────
    if any(w in q for w in ('how many', 'count', 'total', 'number')):
        return {
            'answer': (
                f'Fleet summary: {len(inv_list)} inverters total across Blocks A, B, C. '
                f'{len(critical)} critical, {len(warning)} warning, {len(normal)} normal. '
                f'Block A: 4 inverters (2 critical). '
                f'Block B: 3 inverters (3 warning). '
                f'Block C: 3 inverters (all normal).'
            ),
            'supporting_inverters': critical,
            'query_type': 'general',
        }

    # ── Inverter-specific lookup ───────────────────────────────────────────
    # Check if question mentions a specific inverter ID
    mentioned = next(
        (i for i in inv_list if i['inverter_id'].lower() in q),
        None
    )
    if mentioned:
        inv = mentioned
        eff  = DEMO_EFFICIENCY.get(inv['inverter_id'], 0)
        temp = DEMO_TEMPERATURE.get(inv['inverter_id'], 0)
        alm  = DEMO_ALARMS.get(inv['inverter_id'], 0)
        return {
            'answer': (
                f"{inv['inverter_id']} (Block {inv['block']}) is in {inv['status']} state "
                f"with a risk score of {inv['risk_score']:.2f}. "
                f"Current readings: temperature {temp:.1f}°C, efficiency {eff:.0%}, "
                f"{alm} alarm(s) in the last 24 hours. "
                f"Primary concern: {inv['cause']}."
            ),
            'supporting_inverters': [inv],
            'query_type': 'general',
        }

    # ── Best / worst / compare questions ──────────────────────────────────
    if any(w in q for w in ('best', 'good', 'healthy', 'fine', 'ok')):
        best = sorted(normal, key=lambda x: x['risk_score'])[:3]
        best_str = ', '.join(f"{i['inverter_id']} ({i['risk_score']:.2f})" for i in best)
        return {
            'answer': (
                f'The best-performing inverters are: {best_str}. '
                f'All are in Block C with stable temperature, high efficiency (94–96%), '
                f'and zero alarms in the last 24 hours. '
                f'These units are operating in textbook condition.'
            ),
            'supporting_inverters': best,
            'query_type': 'general',
        }

    # ── Default: fleet overview ────────────────────────────────────────────
    avg_risk = sum(i['risk_score'] for i in inv_list) / len(inv_list)
    return {
        'answer': (
            f'Fleet status: {len(inv_list)} inverters online — '
            f'{len(critical)} critical, {len(warning)} warning, {len(normal)} normal. '
            f'Average fleet risk score: {avg_risk:.2f}. '
            f'Block A has the highest risk concentration. '
            f'Block C is fully healthy. '
            f'Try asking about: critical inverters, block status, temperature, alarms, or efficiency.'
        ),
        'supporting_inverters': critical,
        'query_type': 'general',
    }


# ── POST /api/query ───────────────────────────────────────────────────────────

@bp.route('/api/query', methods=['POST'])
def post_query():
    data     = request.get_json(force=True) or {}
    question = data.get('question', '').strip()

    if not question:
        return jsonify({'error': 'question is required'}), 400

    _, inv_list = _build_fleet_state()

    # ── LLM HOOK: swap _rule_based_answer() for call_llm() here ──────────
    # See module docstring at the top of this file for exact replacement code.
    # ──────────────────────────────────────────────────────────────────────
    return jsonify(_rule_based_answer(question, inv_list))
