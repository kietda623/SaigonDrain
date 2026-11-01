import { useMemo } from "react"
import { Bell, Droplets, Radar, TriangleAlert } from "lucide-react"
import Button from "@/components/ui/Button"
import FloodStatusHero from "@/components/overview/FloodStatusHero"
import MetricCard from "@/components/overview/MetricCard"
import TrendChart from "@/components/overview/TrendChart"
import OperationsMap from "@/components/map/OperationsMap"
import ReportQueue from "@/components/reports/ReportQueue"
import AlertTable from "@/components/alerts/AlertTable"
import SectionHeader from "@/components/ui/SectionHeader"
import { mapPoints } from "@/data/mapPoints"
import { trends } from "@/data/trends"
import type {
  AreaAlert,
  FloodReport,
  MapLayer,
  MapPoint,
  Page,
  Severity,
} from "@/types"

function OverviewPage({
  reports,
  alerts,
  selectedMapPoint,
  onSelectPoint,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
  trendRange,
  setTrendRange,
  onNavigate,
  onReview,
  onEditAlert,
  onEndAlert,
}: {
  reports: FloodReport[]
  alerts: AreaAlert[]
  selectedMapPoint: string | null
  onSelectPoint: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
  trendRange: keyof typeof trends
  setTrendRange: (range: keyof typeof trends) => void
  onNavigate: (page: Page) => void
  onReview: (report: FloodReport) => void
  onEditAlert: (alert: AreaAlert) => void
  onEndAlert: (alert: AreaAlert) => void
}) {
  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const activeAlerts = alerts.filter((alert) => alert.status === "active")
  const highRiskCount = mapPoints.filter(
    (point) => point.severity !== "medium",
  ).length
  const totalReports =
    reports.filter((report) => report.status !== "rejected").length + 124

  const metrics = useMemo(
    () => [
      {
        icon: <Droplets size={20} />,
        tone: "blue",
        value: totalReports,
        label: "Tổng báo cáo ngập",
        meta: (
          <>
            <span className="trend-up">↗ 18%</span> so với hôm qua
          </>
        ),
        data: [8, 11, 10, 17, 21, 19, 28],
      },
      {
        icon: <TriangleAlert size={20} />,
        tone: "red",
        value: highRiskCount,
        label: "Điểm nguy cơ cao",
        meta: (
          <>
            <span className="urgent-dot" /> 3 điểm cần ưu tiên
          </>
        ),
        data: [9, 12, 8, 15, 17, 19, 18],
      },
      {
        icon: <Radar size={20} />,
        tone: "amber",
        value: pendingCount,
        label: "Chờ xác minh",
        meta: <>Thời gian xử lý TB 6 phút</>,
        data: [16, 13, 18, 12, 10, 7, 5],
      },
      {
        icon: <Bell size={20} />,
        tone: "teal",
        value: activeAlerts.length,
        label: "Cảnh báo đang phát",
        meta: <>Phủ 7 khu vực ảnh hưởng</>,
        data: [3, 4, 4, 6, 5, 7, 7],
      },
    ],
    [activeAlerts.length, highRiskCount, pendingCount, totalReports],
  )

  return (
    <div className="page-stack">
      <FloodStatusHero
        activeAlertCount={activeAlerts.length}
        onViewAlerts={() => onNavigate("alerts")}
        onViewMap={() => onNavigate("map")}
        pendingCount={pendingCount}
      />

      <div className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="overview-grid">
        <TrendChart range={trendRange} setRange={setTrendRange} />
        <ReportQueue
          onReview={onReview}
          onViewAll={() => onNavigate("reports")}
          reports={reports}
        />
      </div>

      <div className="overview-bottom">
        <OperationsMap
          layers={layers}
          onExpand={() => onNavigate("map")}
          onSelect={onSelectPoint}
          reports={reports}
          selectedId={selectedMapPoint}
          setLayers={setLayers}
          setSeverityFilter={setSeverityFilter}
          severityFilter={severityFilter}
        />
        <section className="panel overview-alerts">
          <SectionHeader
            action={
              <Button variant="ghost" onClick={() => onNavigate("alerts")}>
                Xem tất cả <span>→</span>
              </Button>
            }
            description="Đang phát tới người dân trong khu vực"
            title="Cảnh báo đang hoạt động"
          />
          <AlertTable
            alerts={activeAlerts}
            limit={2}
            onEdit={onEditAlert}
            onEnd={onEndAlert}
          />
        </section>
      </div>
    </div>
  )
}

export default OverviewPage
