import defaultHotspots from "@/data/hcmc_flood_hotspots.json"
import type {
  AlertDraft,
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapPoint,
  TrendsMap,
  UserStatus,
  WeatherSnapshot,
} from "@/types"

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api"

export async function fetchCurrentWeatherApi(): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/current`)
    if (!res.ok) return null
    return (await res.json()) as WeatherSnapshot
  } catch {
    return null
  }
}

export async function syncWeatherForecastsApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/weather/sync-forecasts`, {
      method: "POST",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchAdminInitialData(): Promise<{
  reports?: FloodReport[]
  alerts?: AreaAlert[]
  mapPoints?: MapPoint[]
  users?: CommunityUser[]
  trends?: TrendsMap
  weather?: WeatherSnapshot | null
  live: boolean
}> {
  try {
    const [
      reportsRes,
      alertsRes,
      pointsRes,
      usersRes,
      trendsRes,
      weatherSnap,
    ] = await Promise.all([
      fetch(`${API_BASE}/reports`),
      fetch(`${API_BASE}/alerts`),
      fetch(`${API_BASE}/map/points`),
      fetch(`${API_BASE}/users`),
      fetch(`${API_BASE}/analytics/trends`),
      fetchCurrentWeatherApi(),
    ])

    const reports = reportsRes.ok
      ? ((await reportsRes.json()) as FloodReport[])
      : undefined
    const alerts = alertsRes.ok
      ? ((await alertsRes.json()) as AreaAlert[])
      : undefined
    let mapPoints = pointsRes.ok
      ? ((await pointsRes.json()) as MapPoint[])
      : undefined
    if (!mapPoints || mapPoints.length === 0) {
      mapPoints = defaultHotspots as any[]
    }
    const users = usersRes.ok
      ? ((await usersRes.json()) as CommunityUser[])
      : undefined
    const trends = trendsRes.ok
      ? ((await trendsRes.json()) as TrendsMap)
      : undefined

    const live = Boolean(reports || alerts || mapPoints || users || weatherSnap)
    return {
      reports,
      alerts,
      mapPoints,
      users,
      trends,
      weather: weatherSnap,
      live,
    }
  } catch {
    return { live: false }
  }
}

export async function approveReportApi(id: string): Promise<{
  report: FloodReport
  updatedMapPoint?: MapPoint | null
} | null> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}/approve`, {
      method: "PATCH",
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function rejectReportApi(
  id: string,
  reason?: string,
): Promise<{ report: FloodReport } | null> {
  try {
    const res = await fetch(`${API_BASE}/reports/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function createAlertApi(
  draft: AlertDraft,
): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function updateAlertApi(
  id: string,
  draft: AlertDraft,
): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function endAlertApi(id: string): Promise<AreaAlert | null> {
  try {
    const res = await fetch(`${API_BASE}/alerts/${id}/end`, {
      method: "PATCH",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.alert ?? null
  } catch {
    return null
  }
}

export async function updateUserStatusApi(
  id: string,
  status: UserStatus,
): Promise<CommunityUser | null> {
  try {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.user ?? null
  } catch {
    return null
  }
}

export async function fetchUsersCsvBlob(): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_BASE}/users/export-csv`)
    if (!res.ok) return null
    return await res.blob()
  } catch {
    return null
  }
}

export function subscribeAdminRealtime(handlers: {
  onReportCreated?: (data: {
    report: FloodReport
    mapPoint?: MapPoint
  }) => void
  onReportApproved?: (data: {
    report: FloodReport
    updatedMapPoint?: MapPoint | null
  }) => void
  onReportRejected?: (data: { report: FloodReport }) => void
  onAlertCreated?: (alert: AreaAlert) => void
  onAlertUpdated?: (alert: AreaAlert) => void
  onAlertEnded?: (alert: AreaAlert) => void
  onWeatherUpdated?: (data: { snapshot?: WeatherSnapshot }) => void
  onUserUpdated?: (data: { action: string; user: CommunityUser }) => void
}): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined
  }

  const es = new EventSource(`${API_BASE}/realtime/stream`)

  const bind = <T,>(event: string, cb?: (data: T) => void) => {
    if (!cb) return
    es.addEventListener(event, (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data)
        if (parsed?.data) cb(parsed.data as T)
      } catch {
        // ignore parse errors
      }
    })
  }

  bind("report.created", handlers.onReportCreated)
  bind("report.approved", handlers.onReportApproved)
  bind("report.rejected", handlers.onReportRejected)
  bind("alert.created", handlers.onAlertCreated)
  bind("alert.updated", handlers.onAlertUpdated)
  bind("alert.ended", handlers.onAlertEnded)
  bind("weather.updated", handlers.onWeatherUpdated)
  bind("user.updated", handlers.onUserUpdated)

  return () => {
    es.close()
  }
}

