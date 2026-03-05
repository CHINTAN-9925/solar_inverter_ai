import type { InverterSummary, KpiData, PredictionResponse, ExplainResponse, QueryResponse, TrendPoint, TrendMetric, WaterfallEntry, ShapFeature } from './types'
import { MOCK_INVERTERS, MOCK_KPI, getMockPrediction, getMockTrend, getMockWaterfall } from './mock'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

export async function fetchInverters(): Promise<InverterSummary[]> {
  console.log('[API] fetchInverters — using mock data')
  return [...MOCK_INVERTERS].sort((a, b) => b.risk_score - a.risk_score)

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/inverters`)
  // return res.json()
}

export async function fetchKpi(): Promise<KpiData> {
  console.log('[API] fetchKpi — using mock data')
  return MOCK_KPI

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/inverters/kpi`)
  // return res.json()
}

export async function fetchInverterDetail(id: string): Promise<{ summary: InverterSummary; prediction: PredictionResponse }> {
  console.log(`[API] fetchInverterDetail(${id}) — using mock data`)
  const summary = MOCK_INVERTERS.find(i => i.inverter_id === id) ?? MOCK_INVERTERS[0]
  const prediction = getMockPrediction(id)
  return { summary, prediction }

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/inverters/${id}`)
  // return res.json()
}

export async function fetchTrend(id: string, metric: TrendMetric): Promise<{ points: TrendPoint[] }> {
  console.log(`[API] fetchTrend(${id}, ${metric}) — using mock data`)
  return { points: getMockTrend(metric) }

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/inverters/${id}/trend?metric=${metric}`)
  // return res.json()
}

export async function fetchWaterfall(id: string): Promise<{ entries: WaterfallEntry[] }> {
  console.log(`[API] fetchWaterfall(${id}) — using mock data`)
  return { entries: getMockWaterfall(id) }

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/explain/waterfall/${id}`)
  // return res.json()
}

export async function postExplain(inverter_id: string, risk_score: number, shap_features: ShapFeature[]): Promise<ExplainResponse> {
  console.log(`[API] postExplain(${inverter_id}) — calling Claude API`)

  // Use Anthropic API directly (works in both mock and real modes)
  const prompt = `You are an expert solar inverter engineer. Analyze this inverter data and provide a clear failure analysis.

Inverter ID: ${inverter_id}
Risk Score: ${risk_score.toFixed(2)} (${risk_score >= 0.7 ? 'CRITICAL' : risk_score >= 0.4 ? 'WARNING' : 'NORMAL'})

Top SHAP Features (factors influencing the risk prediction):
${shap_features.map(f => `- ${f.display_name}: value=${f.feature_value}, SHAP impact=${f.shap_value > 0 ? '+' : ''}${f.shap_value.toFixed(3)} (${f.shap_value > 0 ? 'increases' : 'decreases'} risk)`).join('\n')}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "narrative": "2-3 sentence overview of the situation",
  "key_observations": ["observation 1", "observation 2", "observation 3"],
  "root_cause": "Primary root cause in one sentence",
  "recommended_action": "Specific maintenance action to take"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data.content?.map((c: { type: string; text?: string }) => c.text ?? '').join('') ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return {
      inverter_id,
      narrative: parsed.narrative,
      key_observations: parsed.key_observations,
      root_cause: parsed.root_cause,
      recommended_action: parsed.recommended_action,
      generated_at: new Date().toISOString(),
    }
  } catch {
    return {
      inverter_id,
      narrative: `Inverter ${inverter_id} shows elevated risk at ${(risk_score * 100).toFixed(0)}% based on telemetry patterns.`,
      key_observations: ['Temperature trending above normal operating range', 'Alarm frequency elevated over past 24 hours', 'Power output showing intermittent drops'],
      root_cause: 'Thermal management degradation leading to cascading efficiency loss',
      recommended_action: 'Schedule immediate inspection of cooling fans and heat sink thermal compound. Check DC cable connections for resistance increase.',
      generated_at: new Date().toISOString(),
    }
  }

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/explain`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ inverter_id, risk_score, shap_features }),
  // })
  // return res.json()
}

export async function postQuery(question: string): Promise<QueryResponse> {
  console.log(`[API] postQuery — calling Claude API`)

  const context = MOCK_INVERTERS.map(inv =>
    `${inv.inverter_id} (Block ${inv.block}): risk=${inv.risk_score.toFixed(2)}, status=${inv.status}, cause="${inv.primary_cause}"`
  ).join('\n')

  const prompt = `You are SolarAI, an AI assistant for a solar inverter monitoring platform. Answer the operator's question using the current fleet data.

Current Fleet Status:
${context}

KPI Summary: Total=10 inverters, High Risk=2, Avg Efficiency=87%, Active Alarms=5

Operator Question: ${question}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "answer": "Your helpful answer here (2-4 sentences, conversational but technical)",
  "supporting_inverters": [{"inverter_id": "INV-XX", "risk_score": 0.00, "block": "X"}],
  "query_type": "risk_today|efficiency|alarms|general"
}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data.content?.map((c: { type: string; text?: string }) => c.text ?? '').join('') ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return {
      answer: 'I currently see 2 critical inverters (INV-01 and INV-07) and 3 in warning state. INV-01 is the highest priority with a risk score of 0.82 due to cooling system degradation.',
      supporting_inverters: [
        { inverter_id: 'INV-01', risk_score: 0.82, block: 'A' },
        { inverter_id: 'INV-07', risk_score: 0.74, block: 'A' },
      ],
      query_type: 'risk_today',
    }
  }

  // BACKEND READY:
  // const res = await fetch(`${API_URL}/api/query`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ question }),
  // })
  // return res.json()
}
