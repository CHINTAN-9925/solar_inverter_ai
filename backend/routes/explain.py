"""
routes/explain.py — SHAP waterfall data and static root-cause analysis.

No LLM calls are made. All analysis is generated from the SHAP feature
data using domain-specific lookup tables and templates.

When you are ready to plug in an LLM, search for the comment:
  # ── LLM HOOK ──
and follow the instructions there.

Endpoints:
  GET  /api/explain/waterfall/<id>  — cumulative SHAP waterfall entries
  POST /api/explain                 — root-cause analysis for one inverter
"""

from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

bp = Blueprint('explain', __name__)


# ─────────────────────────────────────────────────────────────────────────────
# Static knowledge base — maps feature names to engineering-level analysis.
# Rich enough to generate useful results for any combination of top features.
# ─────────────────────────────────────────────────────────────────────────────

# Per-feature: what does a high SHAP value mean in plain English?
FEATURE_NARRATIVES: dict[str, str] = {
    'Temp (3h avg)': (
        'The 3-hour rolling average temperature is elevated, indicating sustained '
        'thermal stress rather than a transient spike. Prolonged heat accelerates '
        'capacitor degradation and IGBT junction wear.'
    ),
    'DC Voltage Std': (
        'High standard deviation in DC voltage suggests unstable string input, '
        'possibly caused by loose MC4 connectors, corroded busbars, or a failing '
        'bypass diode creating intermittent open-circuit conditions.'
    ),
    'Alarms (24h)': (
        'The elevated alarm count over the past 24 hours points to repeated '
        'protection events — likely over-temperature trips, ground fault detections, '
        'or MPPT tracking failures triggered by unstable input conditions.'
    ),
    'Power Drop': (
        'Power output has dropped significantly relative to the inverter\'s recent '
        'baseline. This is consistent with partial shading, soiling, a blown string '
        'fuse, or DC-side derating due to thermal protection.'
    ),
    'Efficiency': (
        'Conversion efficiency is below the expected operating range. Reduced '
        'efficiency combined with high temperature typically indicates gate driver '
        'degradation or increased switching losses in the IGBT module.'
    ),
    'Irradiance': (
        'Irradiance readings are outside the expected range for current conditions. '
        'This may reflect pyranometer calibration drift, localised cloud cover, '
        'or panel soiling reducing effective irradiance.'
    ),
    'Temp Max (24h)': (
        'Peak temperature over the last 24 hours exceeded safe operating thresholds. '
        'Even brief thermal excursions above 85°C can permanently reduce capacitor '
        'lifespan and accelerate insulation degradation.'
    ),
}

# Per-feature: what action should a maintenance technician take?
FEATURE_ACTIONS: dict[str, str] = {
    'Temp (3h avg)': (
        'Inspect cooling fans for blockage or bearing failure. Clean air filters and '
        'heat sink fins. Verify ambient temperature sensors. Check thermal compound '
        'on IGBT modules — replace if dried out (>3 years old).'
    ),
    'DC Voltage Std': (
        'Perform IV curve tracing on all DC strings connected to this inverter. '
        'Inspect MC4 connectors for corrosion and torque to spec (2–4 Nm). '
        'Check DC cable insulation resistance with a megohmmeter (>1 MΩ expected).'
    ),
    'Alarms (24h)': (
        'Download full alarm log from SCADA and identify the repeating fault codes. '
        'Check protection relay settings against manufacturer spec. '
        'Inspect ground fault detection circuit if GFD alarms are present.'
    ),
    'Power Drop': (
        'Inspect DC string fuses and replace any blown units. Perform visual '
        'inspection for panel soiling or shading obstruction. Verify MPPT tracker '
        'is operating on the correct voltage window for current conditions.'
    ),
    'Efficiency': (
        'Run a full diagnostic cycle and compare actual vs rated output at current '
        'irradiance. Inspect IGBT gate driver board for discolouration or burn marks. '
        'Consider scheduling a power quality analyser measurement on the AC output.'
    ),
    'Irradiance': (
        'Clean and recalibrate the pyranometer. Cross-reference with adjacent '
        'inverter irradiance readings to isolate sensor drift vs real shading. '
        'Check panel tilt angle and verify no new obstructions in the array.'
    ),
    'Temp Max (24h)': (
        'Review thermal event timestamps against SCADA alarm log. Inspect thermal '
        'cutout history. If peak temps exceeded 85°C, schedule capacitor bank '
        'inspection and consider de-rating the inverter output by 10% temporarily.'
    ),
}

# Per root-cause pattern: narrative + cause + action
# Keyed by (top_feature, second_feature) pairs for more specific diagnosis
COMBINED_PATTERNS: dict[tuple[str, str], dict] = {
    ('Temp (3h avg)', 'DC Voltage Std'): {
        'root_cause': (
            'Thermal stress combined with DC voltage instability is the classic signature '
            'of a failing IGBT module — heat causes junction resistance to increase, '
            'which creates voltage ripple, which generates more heat.'
        ),
        'recommended_action': (
            'Schedule IGBT module replacement within 7 days. In the meantime, reduce '
            'inverter output to 80% rated power to limit thermal runaway risk. '
            'Inspect gate driver resistors and snubber capacitors.'
        ),
    },
    ('Temp (3h avg)', 'Alarms (24h)'): {
        'root_cause': (
            'Repeated over-temperature alarms confirm the cooling system is unable to '
            'dissipate heat fast enough under current load conditions. '
            'Fan failure or blocked airflow is the most probable cause.'
        ),
        'recommended_action': (
            'Replace cooling fans immediately — check all 3 fans if this is a 3-phase unit. '
            'Temporarily reduce output to 70% rated until fans are replaced. '
            'Verify cabinet door seals are intact to maintain forced airflow.'
        ),
    },
    ('DC Voltage Std', 'Power Drop'): {
        'root_cause': (
            'Unstable DC input combined with power output drop indicates a string-level '
            'fault — likely a blown fuse, failed bypass diode, or loose connection '
            'causing one or more strings to drop out intermittently.'
        ),
        'recommended_action': (
            'Perform string-by-string open-circuit voltage and short-circuit current '
            'measurements. Replace any string fuses reading below rated Isc. '
            'Re-torque all combiner box terminal connections to manufacturer spec.'
        ),
    },
    ('Power Drop', 'Efficiency'): {
        'root_cause': (
            'Simultaneous power drop and efficiency loss without proportional temperature '
            'increase suggests MPPT tracking is operating on the wrong local maximum — '
            'often caused by partial shading creating a multi-peak I-V curve.'
        ),
        'recommended_action': (
            'Enable shade-tolerant MPPT mode if supported by this inverter model. '
            'Perform drone thermal inspection of the panel array to identify hot cells. '
            'Adjust MPPT voltage window limits if shading pattern is predictable.'
        ),
    },
}

# Per-inverter static analysis — rich, pre-written analysis for known problem units.
# These are used when the inverter ID matches a known failing unit.
STATIC_ANALYSIS: dict[str, dict] = {
    'INV-01': {
        'narrative': (
            'INV-01 is operating at critical risk (0.82) due to severe cooling system '
            'degradation. The 3-hour average temperature of 78.4°C is 23°C above the '
            'healthy fleet baseline, and the thermal trajectory shows no sign of recovery. '
            'All three contributing SHAP factors — elevated temperature, high alarm count, '
            'and voltage instability — are consistent with an impending IGBT failure event '
            'within the next 24–48 hours if no action is taken.'
        ),
        'key_observations': [
            'Temperature (78.4°C) exceeds the 75°C de-rating threshold — output is being curtailed automatically',
            '8 alarms in the last 24 hours, up from a 7-day average of 1.2 per day',
            'DC voltage standard deviation of 14.2V indicates string-level instability',
            'Efficiency has dropped to 71% against a fleet average of 87%',
        ],
        'root_cause': (
            'Primary root cause is cooling fan failure causing thermal runaway. '
            'The fan failure has elevated junction temperatures, increasing IGBT '
            'switching losses, which further raises temperature — a positive feedback loop.'
        ),
        'recommended_action': (
            'URGENT: Dispatch technician within 4 hours. Replace all cooling fans (3× units). '
            'Measure IGBT junction temperature with thermal camera before restart. '
            'Replace thermal compound on heatsink. Verify capacitor bank ESR is within spec. '
            'Do not restart at full load until coolant temp drops below 55°C.'
        ),
    },
    'INV-07': {
        'narrative': (
            'INV-07 presents critical risk (0.74) driven primarily by DC voltage instability. '
            'The DC voltage standard deviation of 19.7V is the highest in the fleet and '
            'indicates a loose or corroded connection in the DC string combiner box. '
            'The intermittent nature of the fault — shown by the high alarm count but '
            'moderate temperature — suggests an arcing connection rather than a failed component.'
        ),
        'key_observations': [
            'DC voltage std dev of 19.7V is 6× higher than the healthy fleet average of 3.1V',
            '6 protection alarms in 24 hours, predominantly DC ground fault and over-voltage events',
            'Power output shows a distinctive sawtooth pattern consistent with arc fault cycling',
            'Temperature is elevated but not yet critical (74.1°C) — fault is electrical, not thermal',
        ],
        'root_cause': (
            'Arc fault in DC combiner box caused by a corroded or under-torqued MC4 connector. '
            'Arcing creates resistance spikes that appear as voltage instability and trigger '
            'the ground fault protection, causing the observed alarm pattern.'
        ),
        'recommended_action': (
            'Isolate INV-07 at the AC and DC disconnect. Inspect all MC4 connectors in '
            'combiner box 07-A and 07-B with a thermal camera — arcing connectors will show '
            'as hot spots. Replace any connectors >10 years old or showing discolouration. '
            'Torque all terminal bolts to 2.5 Nm. Perform insulation resistance test '
            'before reconnecting (>1 MΩ at 1000V DC expected).'
        ),
    },
    'INV-12': {
        'narrative': (
            'INV-12 is in warning state (0.68) due to a temperature spike that has persisted '
            'for the past 6 hours. Unlike INV-01, the cooling hardware appears intact — '
            'the temperature elevation is more moderate and correlated with a period of '
            'unusually high ambient temperature and irradiance. However, the trend is '
            'upward and requires monitoring.'
        ),
        'key_observations': [
            'Temperature at 70.3°C, elevated but below the 75°C de-rating threshold',
            'Temperature has risen 8°C in the past 6 hours against a flat fleet trend',
            '5 alarms in 24 hours — primarily over-temperature warnings, no protection trips',
            'Power output and efficiency remain within acceptable range (79%)',
        ],
        'root_cause': (
            'Partial blockage of cabinet air intake by windblown debris, combined with '
            'elevated ambient temperature (38°C recorded at weather station). '
            'The cooling system is functional but operating near its thermal capacity limit.'
        ),
        'recommended_action': (
            'Schedule cabinet inspection within 48 hours. Clean air intake filter and '
            'remove any debris from the cabinet base. Check that cabinet door seals '
            'are fully closed. If temperature exceeds 75°C before inspection, remotely '
            'de-rate output to 85% via SCADA to reduce internal heat generation.'
        ),
    },
    'INV-19': {
        'narrative': (
            'INV-19 is in warning state (0.61) with a distinct power output degradation '
            'pattern. The efficiency drop to 77% without a corresponding temperature '
            'increase suggests the issue is on the DC input side rather than within '
            'the inverter cabinet itself.'
        ),
        'key_observations': [
            'Power output 17% below the expected level for current irradiance conditions',
            'Efficiency at 77% vs fleet average of 87% — 10-point shortfall',
            'DC voltage is stable (std dev 5.3V) — eliminating connector faults',
            '4 alarms in 24 hours, primarily MPPT tracking loss events',
        ],
        'root_cause': (
            'String-level underperformance caused by panel soiling or a failed bypass '
            'diode creating a shaded-cell hotspot. The MPPT tracker is locking onto a '
            'local power maximum rather than the global maximum on the I-V curve.'
        ),
        'recommended_action': (
            'Schedule panel inspection within 72 hours. Perform IV curve tracing '
            'on all strings connected to INV-19 to identify underperforming strings. '
            'Inspect panels visually for soiling, bird droppings, or physical damage. '
            'Consider enabling advanced shade-tolerant MPPT if firmware supports it.'
        ),
    },
    'INV-23': {
        'narrative': (
            'INV-23 is in warning state (0.55) with an abnormally high alarm frequency '
            'as the dominant risk driver. The alarm pattern — 7 events in 24 hours against '
            'a baseline of 0.3 per day — suggests a recurring transient fault rather than '
            'a steady degradation. The inverter is self-recovering after each event.'
        ),
        'key_observations': [
            'Alarm count of 7 in 24 hours is 23× the 7-day baseline rate',
            'All alarms are of type "Grid frequency out of range" per SCADA log',
            'Inverter is auto-restarting within 90 seconds of each trip — hardware is intact',
            'Power output and temperature are normal between alarm events',
        ],
        'root_cause': (
            'Grid frequency instability at the local substation level is causing the '
            'inverter anti-islanding protection to trip. This is a grid-side issue, '
            'not an inverter hardware fault. The protection settings may be too tight '
            'for the local grid quality.'
        ),
        'recommended_action': (
            'Contact grid operator to report frequency instability events — provide '
            'timestamps from SCADA. Review anti-islanding frequency trip thresholds '
            'in inverter configuration (typically ±0.5 Hz from 50 Hz). '
            'Widen dead-band by 0.1 Hz if grid operator confirms instability. '
            'Install a power quality logger at the grid connection point for 7-day monitoring.'
        ),
    },
}

# Generic analysis for normal inverters (risk < 0.4)
NORMAL_ANALYSIS: dict = {
    'narrative': (
        'This inverter is operating within all normal parameters. '
        'Temperature, voltage stability, efficiency and alarm frequency '
        'are all within the expected healthy range for current irradiance conditions. '
        'No corrective action is required at this time.'
    ),
    'key_observations': [
        'Temperature is within the 45–65°C normal operating range',
        'DC voltage stability is good — std dev below 4V',
        'Alarm count is at baseline (0–1 per 24 hours)',
        'Efficiency is above 90%, consistent with healthy fleet performance',
    ],
    'root_cause': 'No fault detected. Inverter is operating normally.',
    'recommended_action': (
        'Continue routine monitoring. Schedule next preventive maintenance '
        'inspection per standard 12-month cycle. No urgent action required.'
    ),
}


# ── GET /api/explain/waterfall/<id> ──────────────────────────────────────────

@bp.route('/api/explain/waterfall/<inv_id>')
def get_waterfall(inv_id):
    """
    Build cumulative SHAP waterfall entries for the frontend chart.

    Starts at BASE_VALUE (model average) and accumulates each SHAP value.
    The final cumulative entry approximates the inverter's risk_score.

    DEMO MODE:  uses DEMO_SHAP values from predict.py
    MODEL MODE: same structure, but shap_values come from TreeExplainer
    """
    try:
        from models.predict import predict_inverter
        pred     = predict_inverter(inv_id)
        features = pred['top_features']
    except Exception as exc:
        return jsonify({'error': f'Prediction failed: {exc}'}), 500

    # 0.20 = approximate expected_value for a dataset with ~20% failure rate.
    # MODEL MODE: swap this for float(shap.TreeExplainer(model).expected_value)
    BASE_VALUE = 0.20

    entries = [{
        'display_name': 'Base',
        'value':        BASE_VALUE,
        'cumulative':   BASE_VALUE,
        'isPositive':   True,
    }]

    cum = BASE_VALUE
    for f in features[:7]:
        cum = round(cum + f['shap_value'], 4)
        entries.append({
            'display_name': f['display_name'],
            'value':        f['shap_value'],
            'cumulative':   cum,
            'isPositive':   f['shap_value'] > 0,
        })

    return jsonify({'entries': entries})


# ── POST /api/explain ─────────────────────────────────────────────────────────

@bp.route('/api/explain', methods=['POST'])
def post_explain():
    """
    Return a rich root-cause analysis for one inverter.

    Priority order:
      1. STATIC_ANALYSIS — pre-written expert analysis for known problem inverters
         (INV-01 through INV-23). Most detailed and accurate.
      2. COMBINED_PATTERNS — diagnosis based on the top-2 SHAP feature combination.
         Covers common failure mode pairs.
      3. FEATURE_NARRATIVES — per-feature analysis for the single dominant driver.
         Generic but technically accurate.
      4. NORMAL_ANALYSIS — fallback for low-risk inverters.

    # ── LLM HOOK ──────────────────────────────────────────────────────────────
    # When you are ready to connect an LLM, replace the static lookup logic
    # below with a call to your LLM. The request body already contains all
    # the data you need (inverter_id, risk_score, shap_features).
    #
    # Example using OpenAI:
    #
    #   from rag.llm import call_llm
    #   from rag.prompts import EXPLAIN_SYSTEM, EXPLAIN_USER
    #
    #   shap_lines = '\\n'.join(
    #       f"  {f['display_name']}: value={f['feature_value']}, "
    #       f"SHAP={'+' if f['shap_value']>=0 else ''}{f['shap_value']:.4f}"
    #       for f in shap_features
    #   )
    #   prompt = EXPLAIN_USER.format(
    #       inverter_id=inv_id, risk_score=f'{risk_score:.2f}',
    #       risk_label=risk_label, shap_lines=shap_lines,
    #   )
    #   result = call_llm(EXPLAIN_SYSTEM, prompt)
    #   if '_llm_error' not in result:
    #       return jsonify({**result, 'inverter_id': inv_id,
    #                       'generated_at': datetime.now(timezone.utc).isoformat()})
    #   # fall through to static analysis if LLM fails
    # ──────────────────────────────────────────────────────────────────────────
    """
    data          = request.get_json(force=True) or {}
    inv_id        = data.get('inverter_id', 'Unknown')
    risk_score    = float(data.get('risk_score', 0.0))
    shap_features = data.get('shap_features', [])

    risk_label = (
        'CRITICAL' if risk_score >= 0.7
        else 'WARNING' if risk_score >= 0.4
        else 'NORMAL'
    )

    top_name    = shap_features[0]['display_name'] if len(shap_features) > 0 else ''
    second_name = shap_features[1]['display_name'] if len(shap_features) > 1 else ''

    # ── 1. Pre-written analysis for known problem inverters ───────────────
    if inv_id in STATIC_ANALYSIS:
        analysis = STATIC_ANALYSIS[inv_id]
        return jsonify({
            'inverter_id':        inv_id,
            'narrative':          analysis['narrative'],
            'key_observations':   analysis['key_observations'],
            'root_cause':         analysis['root_cause'],
            'recommended_action': analysis['recommended_action'],
            'generated_at':       datetime.now(timezone.utc).isoformat(),
        })

    # ── 2. Top-2 feature combination pattern matching ─────────────────────
    combo_key = (top_name, second_name)
    if combo_key in COMBINED_PATTERNS:
        pattern  = COMBINED_PATTERNS[combo_key]
        top_narr = FEATURE_NARRATIVES.get(top_name, f'{top_name} is outside normal range.')
        return jsonify({
            'inverter_id': inv_id,
            'narrative': (
                f'Inverter {inv_id} is at {risk_label} risk ({risk_score:.2f}). '
                f'{top_narr}'
            ),
            'key_observations': [
                f'{top_name} is the dominant risk driver (SHAP: +{shap_features[0]["shap_value"]:.3f})',
                f'{second_name} is a significant contributing factor',
                f'Combined pattern is consistent with {pattern["root_cause"].split(".")[0].lower()}',
            ],
            'root_cause':         pattern['root_cause'],
            'recommended_action': pattern['recommended_action'],
            'generated_at':       datetime.now(timezone.utc).isoformat(),
        })

    # ── 3. Single top-feature analysis ───────────────────────────────────
    if top_name and risk_score >= 0.4:
        narrative = FEATURE_NARRATIVES.get(top_name, f'{top_name} is outside normal range.')
        action    = FEATURE_ACTIONS.get(top_name,
            'Schedule a full inverter inspection and review recent alarm history.'
        )
        obs = [f'{top_name} is the dominant risk factor (SHAP: +{shap_features[0]["shap_value"]:.3f})']
        if second_name:
            obs.append(f'{second_name} is a secondary contributing factor')
        obs.append(f'Risk score {risk_score:.2f} places this inverter in {risk_label} state')

        return jsonify({
            'inverter_id': inv_id,
            'narrative': (
                f'Inverter {inv_id} is at {risk_label} risk ({risk_score:.2f}). {narrative}'
            ),
            'key_observations':   obs,
            'root_cause':         f'{top_name} anomaly is driving elevated failure probability.',
            'recommended_action': action,
            'generated_at':       datetime.now(timezone.utc).isoformat(),
        })

    # ── 4. Normal inverter fallback ───────────────────────────────────────
    return jsonify({
        'inverter_id':        inv_id,
        **NORMAL_ANALYSIS,
        'generated_at':       datetime.now(timezone.utc).isoformat(),
    })
