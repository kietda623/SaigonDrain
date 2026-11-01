import { Droplets, MapPin, Radar } from "lucide-react"
import OperationsMap from "@/components/map/OperationsMap"
import SectionHeader from "@/components/ui/SectionHeader"
import StatusPill from "@/components/ui/StatusPill"
import { mapPoints } from "@/data/mapPoints"
import type { FloodReport, MapLayer, MapPoint, Severity } from "@/types"

function MapPage({
  reports,
  selectedMapPoint,
  onSelectPoint,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
}: {
  reports: FloodReport[]
  selectedMapPoint: string | null
  onSelectPoint: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
}) {
  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const floodPoints = mapPoints.filter((point) => point.type === "flood").length
  const riskPoints = mapPoints.filter((point) => point.type === "risk").length

  return (
    <div className="page-stack">
      <SectionHeader
        action={<StatusPill tone="safe">Đồng bộ 18:48</StatusPill>}
        description="Bật tắt lớp dữ liệu, lọc mức độ và chọn điểm để xem chi tiết hiện trường."
        title="Lớp dữ liệu và bộ lọc"
      />

      <div className="map-stat-row">
        <div className="map-stat">
          <span className="map-stat-icon teal">
            <MapPin size={18} />
          </span>
          <div>
            <strong>{mapPoints.length}</strong>
            <span>Điểm đang giám sát</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon coral">
            <Droplets size={18} />
          </span>
          <div>
            <strong>{floodPoints}</strong>
            <span>Điểm ngập hiện tại</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon sun">
            <Radar size={18} />
          </span>
          <div>
            <strong>{riskPoints}</strong>
            <span>Điểm nguy cơ</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon rain">
            <Droplets size={18} />
          </span>
          <div>
            <strong>{pendingCount}</strong>
            <span>Báo cáo chờ xác minh</span>
          </div>
        </div>
      </div>

      <OperationsMap
        layers={layers}
        onSelect={onSelectPoint}
        reports={reports}
        selectedId={selectedMapPoint}
        setLayers={setLayers}
        setSeverityFilter={setSeverityFilter}
        severityFilter={severityFilter}
        variant="full"
      />

      <section className="panel map-guide">
        <SectionHeader
          description="Màu sắc luôn đi kèm nhãn chữ để không phụ thuộc vào thị giác màu."
          title="Cách đọc bản đồ"
        />
        <div className="guide-grid">
          <div>
            <i className="legend-dot critical" />
            <strong>Nghiêm trọng</strong>
            <span>Mực nước trên 30 cm, cần điều tiết giao thông.</span>
          </div>
          <div>
            <i className="legend-dot high" />
            <strong>Cao</strong>
            <span>Nước dâng nhanh, theo dõi sát trong 30 phút.</span>
          </div>
          <div>
            <i className="legend-dot medium" />
            <strong>Trung bình</strong>
            <span>Điểm trũng nhẹ, chưa ảnh hưởng di chuyển.</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MapPage
