export interface InverterSummary {
  inverter_id: string
  block: string
  risk_score: number
  prediction: 'failure_risk' | 'normal'
  primary_cause: string
  last_updated: string
  status: 'critical' | 'warning' | 'normal'
}

export interface ShapFeature {
  feature: string
  display_name: string
  shap_value: number
  feature_value: number | string
}

export interface PredictionResponse {
  inverter_id: string
  risk_score: number
  prediction: 'failure_risk' | 'normal'
  top_features: ShapFeature[]
  timestamp: string
}

export interface ExplainResponse {
  inverter_id: string
  narrative: string
  key_observations: string[]
  root_cause: string
  recommended_action: string
  generated_at: string
}

export interface QueryResponse {
  answer: string
  supporting_inverters: { inverter_id: string; risk_score: number; block: string }[]
  query_type: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  supporting_inverters?: { inverter_id: string; risk_score: number; block: string }[]
  timestamp: Date
}

export interface KpiData {
  total_inverters: number
  high_risk_count: number
  avg_efficiency: number
  active_alarms: number
}

export interface TrendPoint {
  timestamp: string
  value: number
}

export type TrendMetric = 'temperature' | 'power_output' | 'ac_voltage'

export interface WaterfallEntry {
  display_name: string
  value: number
  cumulative: number
  isPositive: boolean
}
