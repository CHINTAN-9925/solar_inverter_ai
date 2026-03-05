import type { InverterSummary, KpiData, PredictionResponse, WaterfallEntry, TrendPoint } from './types'

export const MOCK_INVERTERS: InverterSummary[] = [
  { inverter_id: 'INV-01', block: 'A', risk_score: 0.82, prediction: 'failure_risk', primary_cause: 'Cooling system degradation', last_updated: new Date(Date.now() - 3 * 60000).toISOString(), status: 'critical' },
  { inverter_id: 'INV-07', block: 'A', risk_score: 0.74, prediction: 'failure_risk', primary_cause: 'Voltage instability', last_updated: new Date(Date.now() - 7 * 60000).toISOString(), status: 'critical' },
  { inverter_id: 'INV-12', block: 'B', risk_score: 0.68, prediction: 'failure_risk', primary_cause: 'Temperature spike', last_updated: new Date(Date.now() - 2 * 60000).toISOString(), status: 'warning' },
  { inverter_id: 'INV-19', block: 'B', risk_score: 0.61, prediction: 'failure_risk', primary_cause: 'Power output degradation', last_updated: new Date(Date.now() - 15 * 60000).toISOString(), status: 'warning' },
  { inverter_id: 'INV-23', block: 'B', risk_score: 0.55, prediction: 'failure_risk', primary_cause: 'High alarm frequency', last_updated: new Date(Date.now() - 5 * 60000).toISOString(), status: 'warning' },
  { inverter_id: 'INV-03', block: 'A', risk_score: 0.28, prediction: 'normal', primary_cause: 'None', last_updated: new Date(Date.now() - 20 * 60000).toISOString(), status: 'normal' },
  { inverter_id: 'INV-05', block: 'A', risk_score: 0.22, prediction: 'normal', primary_cause: 'None', last_updated: new Date(Date.now() - 11 * 60000).toISOString(), status: 'normal' },
  { inverter_id: 'INV-09', block: 'C', risk_score: 0.18, prediction: 'normal', primary_cause: 'None', last_updated: new Date(Date.now() - 8 * 60000).toISOString(), status: 'normal' },
  { inverter_id: 'INV-14', block: 'C', risk_score: 0.14, prediction: 'normal', primary_cause: 'None', last_updated: new Date(Date.now() - 30 * 60000).toISOString(), status: 'normal' },
  { inverter_id: 'INV-21', block: 'C', risk_score: 0.09, prediction: 'normal', primary_cause: 'None', last_updated: new Date(Date.now() - 45 * 60000).toISOString(), status: 'normal' },
]

export const MOCK_KPI: KpiData = {
  total_inverters: 10,
  high_risk_count: 2,
  avg_efficiency: 0.87,
  active_alarms: 5,
}

export const MOCK_PREDICTION: Record<string, PredictionResponse> = {
  'INV-01': {
    inverter_id: 'INV-01',
    risk_score: 0.82,
    prediction: 'failure_risk',
    top_features: [
      { feature: 'temp_rolling_mean_3h', display_name: 'Temp (3h avg)', shap_value: 0.31, feature_value: 78.4 },
      { feature: 'alarm_count', display_name: 'Alarms (24h)', shap_value: 0.22, feature_value: 8 },
      { feature: 'efficiency', display_name: 'Efficiency', shap_value: -0.18, feature_value: 0.71 },
      { feature: 'power_drop_ratio', display_name: 'Power Drop', shap_value: 0.15, feature_value: 0.19 },
      { feature: 'dc_voltage_std_1h', display_name: 'DC Voltage Std', shap_value: 0.12, feature_value: 14.2 },
      { feature: 'temp_max_24h', display_name: 'Temp Max (24h)', shap_value: 0.09, feature_value: 84.1 },
      { feature: 'irradiance', display_name: 'Irradiance', shap_value: -0.05, feature_value: 620 },
      { feature: 'ac_voltage', display_name: 'AC Voltage', shap_value: 0.03, feature_value: 228.3 },
    ],
    timestamp: new Date().toISOString(),
  },
  'INV-07': {
    inverter_id: 'INV-07',
    risk_score: 0.74,
    prediction: 'failure_risk',
    top_features: [
      { feature: 'dc_voltage_std_1h', display_name: 'DC Voltage Std', shap_value: 0.28, feature_value: 19.7 },
      { feature: 'alarm_count', display_name: 'Alarms (24h)', shap_value: 0.19, feature_value: 6 },
      { feature: 'temp_rolling_mean_3h', display_name: 'Temp (3h avg)', shap_value: 0.17, feature_value: 74.1 },
      { feature: 'efficiency', display_name: 'Efficiency', shap_value: -0.14, feature_value: 0.76 },
      { feature: 'power_drop_ratio', display_name: 'Power Drop', shap_value: 0.11, feature_value: 0.15 },
      { feature: 'temp_max_24h', display_name: 'Temp Max (24h)', shap_value: 0.07, feature_value: 80.2 },
      { feature: 'irradiance', display_name: 'Irradiance', shap_value: -0.04, feature_value: 580 },
      { feature: 'ac_voltage', display_name: 'AC Voltage', shap_value: 0.02, feature_value: 231.1 },
    ],
    timestamp: new Date().toISOString(),
  },
}

export function getMockPrediction(id: string): PredictionResponse {
  return MOCK_PREDICTION[id] ?? {
    inverter_id: id,
    risk_score: 0.18,
    prediction: 'normal',
    top_features: [
      { feature: 'temp_rolling_mean_3h', display_name: 'Temp (3h avg)', shap_value: 0.04, feature_value: 52.1 },
      { feature: 'alarm_count', display_name: 'Alarms (24h)', shap_value: 0.02, feature_value: 1 },
      { feature: 'efficiency', display_name: 'Efficiency', shap_value: -0.08, feature_value: 0.93 },
      { feature: 'power_drop_ratio', display_name: 'Power Drop', shap_value: 0.01, feature_value: 0.04 },
      { feature: 'dc_voltage_std_1h', display_name: 'DC Voltage Std', shap_value: 0.02, feature_value: 3.1 },
      { feature: 'temp_max_24h', display_name: 'Temp Max (24h)', shap_value: 0.03, feature_value: 58.0 },
      { feature: 'irradiance', display_name: 'Irradiance', shap_value: -0.06, feature_value: 810 },
      { feature: 'ac_voltage', display_name: 'AC Voltage', shap_value: -0.01, feature_value: 235.2 },
    ],
    timestamp: new Date().toISOString(),
  }
}

export function getMockWaterfall(id: string): WaterfallEntry[] {
  const pred = getMockPrediction(id)
  const entries: WaterfallEntry[] = [{ display_name: 'Base', value: 0.20, cumulative: 0.20, isPositive: true }]
  let cum = 0.20
  for (const f of pred.top_features) {
    cum += f.shap_value
    entries.push({ display_name: f.display_name, value: f.shap_value, cumulative: cum, isPositive: f.shap_value > 0 })
  }
  return entries
}

export function getMockTrend(metric: string): TrendPoint[] {
  const now = Date.now()
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now - (23 - i) * 3600000).toISOString()
    let value = 0
    if (metric === 'temperature') value = 55 + Math.sin(i / 4) * 12 + Math.random() * 4 + (i > 18 ? 8 : 0)
    else if (metric === 'power_output') value = 18000 + Math.sin(i / 3) * 2000 + Math.random() * 500 - (i > 18 ? 2000 : 0)
    else value = 228 + Math.sin(i / 5) * 4 + Math.random() * 2
    return { timestamp: t, value }
  })
}
