"""
routes/inverters.py — REST endpoints for inverter data.

All endpoints work in DEMO MODE (no MongoDB, no model.pkl).
When MongoDB is available, KPI and trend endpoints read real telemetry.
When model.pkl is also available, risk scores come from live XGBoost inference.

Endpoints:
  GET  /api/inverters               — all inverters sorted by risk desc
  GET  /api/inverters/kpi           — fleet KPI summary
  GET  /api/inverters/<id>          — single inverter + prediction + SHAP
  GET  /api/inverters/<id>/trend    — 24-point time-series for one metric
"""

import math
import random
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request

bp = Blueprint('inverters', __name__)

# Static metadata — block assignment and known failure cause per inverter.
# In a real system this might live in a separate MongoDB 'inverters' collection.
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

META_MAP: dict[str, tuple[str, str]] = {
    iid: (block, cause) for iid, block, cause in INVERTERS_META
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _status(score: float) -> str:
    return 'critical' if score >= 0.7 else ('warning' if score >= 0.4 else 'normal')


def _get_prediction(inv_id: str) -> dict:
    """
    Call predict_inverter() and handle any errors gracefully.
    Always returns a valid prediction dict — never raises to the route handler.

    DEMO MODE:  predict_inverter() returns deterministic DEMO_RISK scores.
    MODEL MODE: returns live XGBoost inference scores.
    """
    try:
        from models.predict import predict_inverter
        return predict_inverter(inv_id)
    except Exception as exc:
        # Hard fallback — should never reach here in normal operation
        print(f'[inverters] predict_inverter failed for {inv_id}: {exc}')
        from models.predict import DEMO_RISK
        score = DEMO_RISK.get(inv_id, 0.15)
        return {
            'inverter_id':  inv_id,
            'risk_score':   score,
            'prediction':   'failure_risk' if score >= 0.5 else 'normal',
            'top_features': [],
            'timestamp':    datetime.now(timezone.utc).isoformat(),
            '_mode':        'error_fallback',
        }


def _build_summary(inv_id: str, pred: dict) -> dict:
    """Merge metadata with the prediction result into a flat summary dict."""
    block, cause = META_MAP.get(inv_id, ('?', 'Unknown'))
    return {
        'inverter_id':   inv_id,
        'block':         block,
        'risk_score':    pred['risk_score'],
        'prediction':    pred['prediction'],
        'primary_cause': cause,
        'last_updated':  datetime.now(timezone.utc).isoformat(),
        'status':        _status(pred['risk_score']),
    }


# ── GET /api/inverters ────────────────────────────────────────────────────────

@bp.route('/api/inverters')
def get_inverters():
    """
    Return all inverters sorted by risk_score descending.

    DEMO MODE:  deterministic DEMO_RISK scores, always consistent.
    MODEL MODE: live inference scores, may vary slightly per request.
    """
    result = [
        _build_summary(iid, _get_prediction(iid))
        for iid, _, _ in INVERTERS_META
    ]
    result.sort(key=lambda x: x['risk_score'], reverse=True)
    return jsonify(result)


# ── GET /api/inverters/kpi ────────────────────────────────────────────────────

@bp.route('/api/inverters/kpi')
def get_kpi():
    """
    Return fleet-wide KPI summary.

    DEMO MODE:  hardcoded fallback values (avg_efficiency=0.87, alarms=5).
    MODEL MODE (MongoDB available):
      - avg_efficiency  computed from latest document per inverter
      - active_alarms   sum of alarm_count from latest document per inverter
      - high_risk_count based on live risk scores from DEMO_RISK (until model ready)

    TODO (MODEL MODE upgrade): replace DEMO_RISK lookup with live predict_inverter()
    scores once inference is fast enough (~<50 ms per inverter).
    """
    try:
        from db import get_db
        col = get_db()['telemetry']

        # Aggregation: grab the most recent document per inverter
        pipeline = [
            {'$sort': {'timestamp': -1}},
            {
                '$group': {
                    '_id':         '$inverter_id',
                    'efficiency':  {'$first': '$efficiency'},
                    'alarm_count': {'$first': '$alarm_count'},
                }
            },
        ]
        rows = list(col.aggregate(pipeline))

        if rows:
            from models.predict import DEMO_RISK
            total       = len(rows)
            high_risk   = sum(1 for r in rows if DEMO_RISK.get(r['_id'], 0.15) >= 0.7)
            alarm_total = sum(int(r.get('alarm_count', 0)) for r in rows)
            avg_eff     = round(
                sum(float(r.get('efficiency', 0)) for r in rows) / total, 4
            )
            return jsonify({
                'total_inverters': total,
                'high_risk_count': high_risk,
                'avg_efficiency':  avg_eff,
                'active_alarms':   alarm_total,
            })

    except Exception as exc:
        print(f'[inverters/kpi] MongoDB query failed: {exc} — using demo fallback')

    # ── DEMO MODE fallback ────────────────────────────────────────────────
    from models.predict import DEMO_RISK
    scores = list(DEMO_RISK.values())
    return jsonify({
        'total_inverters': len(scores),
        'high_risk_count': sum(1 for s in scores if s >= 0.7),
        'avg_efficiency':  0.87,
        'active_alarms':   5,
    })


# ── GET /api/inverters/<id> ───────────────────────────────────────────────────

@bp.route('/api/inverters/<inv_id>')
def get_inverter(inv_id):
    """
    Return summary + full prediction (including SHAP top_features) for one inverter.

    The '_mode' field in the prediction sub-object tells you whether
    demo or real model data was used — useful during integration testing.
    """
    if inv_id not in META_MAP:
        return jsonify({'error': f'Inverter {inv_id} not found'}), 404

    pred    = _get_prediction(inv_id)
    summary = _build_summary(inv_id, pred)
    return jsonify({'summary': summary, 'prediction': pred})


# ── GET /api/inverters/<id>/trend?metric=<metric> ─────────────────────────────

@bp.route('/api/inverters/<inv_id>/trend')
def get_trend(inv_id):
    """
    Return 24 time-series data points for a single telemetry metric.

    Query param:
      metric — 'temperature' | 'power_output' | 'ac_voltage'  (default: temperature)

    DEMO MODE:  returns a synthetic sine-wave with realistic noise.
    MODEL MODE (MongoDB available):
      - returns the 24 most recent real readings for this inverter + metric,
        oldest first (ascending timestamp).

    The response schema is identical in both modes, so the frontend chart
    component works without changes once MongoDB is populated.
    """
    metric  = request.args.get('metric', 'temperature')
    allowed = {'temperature', 'power_output', 'ac_voltage'}
    if metric not in allowed:
        return jsonify({'error': f'metric must be one of {sorted(allowed)}'}), 400

    points: list[dict] = []

    # ── MODEL MODE: query MongoDB ─────────────────────────────────────────
    # When MongoDB has data, this block runs and returns early.
    # When MongoDB is down, it silently falls through to the demo generator.
    try:
        from db import get_db
        col  = get_db()['telemetry']
        docs = list(
            col.find(
                {'inverter_id': inv_id},
                {'_id': 0, 'timestamp': 1, metric: 1}
            ).sort('timestamp', -1).limit(24)
        )
        if docs:
            points = [
                {
                    'timestamp': (
                        d['timestamp'].isoformat()
                        if hasattr(d['timestamp'], 'isoformat')
                        else str(d['timestamp'])
                    ),
                    'value': round(float(d.get(metric, 0)), 2),
                }
                for d in reversed(docs)   # reverse to get ascending time order
            ]
    except Exception as exc:
        print(f'[inverters/trend] MongoDB query failed: {exc} — using synthetic fallback')

    # ── DEMO MODE: synthetic sine-wave ────────────────────────────────────
    # Produces plausible-looking data so the chart renders during testing.
    # Replace nothing — this block only runs when MongoDB has no data.
    if not points:
        now = datetime.now(timezone.utc)
        for i in range(24):
            ts = (now - timedelta(hours=23 - i)).isoformat()
            if metric == 'temperature':
                # Simulate daytime heating cycle
                v = 55 + math.sin(i / 4) * 12 + random.uniform(0, 4)
            elif metric == 'power_output':
                # Simulate solar irradiance-driven power curve
                v = 18000 + math.sin(i / 3) * 2000 + random.uniform(0, 500)
            else:   # ac_voltage
                # Relatively stable with small fluctuations
                v = 228 + math.sin(i / 5) * 4 + random.uniform(0, 2)
            points.append({'timestamp': ts, 'value': round(v, 2)})

    return jsonify({'points': points})
