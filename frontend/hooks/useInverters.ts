'use client'
import { useState, useEffect, useCallback } from 'react'
import type { InverterSummary, KpiData } from '../lib/types'
import { fetchInverters, fetchKpi } from '../lib/api'

export function useInverters() {
  const [inverters, setInverters] = useState<InverterSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchInverters()
      setInverters(data)
      setIsError(false)
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return { inverters, isLoading, isError, refresh: load }
}

export function useKpi() {
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchKpi()
      setKpi(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  return { kpi, isLoading }
}
