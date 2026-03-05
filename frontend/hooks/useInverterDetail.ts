'use client'
import { useState, useEffect, useCallback } from 'react'
import type { InverterSummary, PredictionResponse, TrendMetric, TrendPoint, WaterfallEntry } from '../lib/types'
import { fetchInverterDetail, fetchTrend, fetchWaterfall } from '../lib/api'

export function useInverterDetail(id: string) {
  const [summary, setSummary] = useState<InverterSummary | null>(null)
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    fetchInverterDetail(id)
      .then(({ summary, prediction }) => {
        setSummary(summary)
        setPrediction(prediction)
        setIsError(false)
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false))
  }, [id])

  return { summary, prediction, isLoading, isError }
}

export function useInverterTrend(id: string, metric: TrendMetric) {
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetchTrend(id, metric)
      .then(({ points }) => setPoints(points))
      .finally(() => setIsLoading(false))
  }, [id, metric])

  return { points, isLoading }
}

export function useWaterfall(id: string) {
  const [entries, setEntries] = useState<WaterfallEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetchWaterfall(id)
      .then(({ entries }) => setEntries(entries))
      .finally(() => setIsLoading(false))
  }, [id])

  return { entries, isLoading }
}
