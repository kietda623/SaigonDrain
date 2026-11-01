import { severityLabel } from "@/lib/severity"
import type {
  AreaAlert,
  CommunityUser,
  FloodReport,
  MapPoint,
  Severity,
} from "@/types"

const severityOrder: Severity[] = ["critical", "high", "medium"]

export function reportStatusCounts(reports: FloodReport[]) {
  return {
    pending: reports.filter((report) => report.status === "pending").length,
    verified: reports.filter((report) => report.status === "verified").length,
    rejected: reports.filter((report) => report.status === "rejected").length,
    total: reports.length,
  }
}

export function severityBreakdown(reports: FloodReport[]) {
  const total = Math.max(reports.length, 1)
  return severityOrder.map((severity) => {
    const count = reports.filter((report) => report.severity === severity).length
    return {
      key: severity,
      label: severityLabel(severity),
      count,
      percent: Math.round((count / total) * 100),
    }
  })
}

export function districtBreakdown(reports: FloodReport[], limit = 6) {
  const counts = new Map<string, number>()
  reports.forEach((report) => {
    counts.set(report.district, (counts.get(report.district) ?? 0) + 1)
  })
  const total = Math.max(reports.length, 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([district, count]) => ({
      label: district,
      count,
      percent: Math.round((count / total) * 100),
    }))
}

export function mapPointBreakdown(points: MapPoint[]) {
  const total = Math.max(points.length, 1)
  return severityOrder.map((severity) => {
    const count = points.filter((point) => point.severity === severity).length
    return {
      key: severity,
      label: severityLabel(severity),
      count,
      percent: Math.round((count / total) * 100),
    }
  })
}

export function averageDepth(reports: FloodReport[]) {
  if (!reports.length) return 0
  const total = reports.reduce((sum, report) => sum + report.aiDepth, 0)
  return Math.round(total / reports.length)
}

export function verificationRate(reports: FloodReport[]): number | null {
  const counted = reports.filter((report) => report.status !== "pending").length
  if (!counted) return null
  const verified = reports.filter((report) => report.status === "verified").length
  return Math.round((verified / counted) * 100)
}

export function trustBands(users: CommunityUser[]) {
  const total = Math.max(users.length, 1)
  const bands = [
    { label: "85 – 100", count: 0, key: "safe" },
    { label: "60 – 84", count: 0, key: "watch" },
    { label: "Dưới 60", count: 0, key: "danger" },
  ]
  users.forEach((user) => {
    if (user.trustScore >= 85) bands[0].count += 1
    else if (user.trustScore >= 60) bands[1].count += 1
    else bands[2].count += 1
  })
  return bands.map((band) => ({
    ...band,
    percent: Math.round((band.count / total) * 100),
  }))
}

export function topContributors(users: CommunityUser[], limit = 5) {
  return [...users]
    .sort((a, b) => b.verifiedReports - a.verifiedReports)
    .slice(0, limit)
}

export function channelCoverage(alerts: AreaAlert[]) {
  const counts = new Map<string, number>()
  alerts.forEach((alert) => {
    alert.channels.forEach((channel) => {
      counts.set(channel, (counts.get(channel) ?? 0) + 1)
    })
  })
  return [...counts.entries()].map(([label, count]) => ({ label, count }))
}

export function alertLevelCounts(alerts: AreaAlert[]) {
  return {
    active: alerts.filter((alert) => alert.status === "active").length,
    ended: alerts.filter((alert) => alert.status === "ended").length,
  }
}
