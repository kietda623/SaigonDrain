import { useState } from "react"
import { Droplets, Filter, MapPin, Radar, Sparkles } from "lucide-react"
import OperationsMap from "@/components/map/OperationsMap"
import SectionHeader from "@/components/ui/SectionHeader"
import StatusPill from "@/components/ui/StatusPill"
import type { FloodReport, MapLayer, MapPoint, Severity } from "@/types"

function MapPage({
  reports,
  points,
  selectedMapPoint,
  onSelectPoint,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
}: {
  reports: FloodReport[]
  points: MapPoint[]
  selectedMapPoint: string | null
  onSelectPoint: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
}) {
  const [mapMode, setMapMode] = useState<"realtime" | "history">("realtime")
  const [causeFilter, setCauseFilter] = useState<"all" | "Rain" | "High tide" | "Combined">("all")
  const [districtFilter, setDistrictFilter] = useState<string>("all")

  // Danh sách các quận có điểm ngập
  const districts = Array.from(new Set(points.map((p) => p.district).filter(Boolean))).sort()

  // Lọc điểm theo chế độ xem
  const filteredPoints = points.filter((p) => {
    if (mapMode === "realtime") {
      // Ở chế độ Realtime, chỉ hiển thị những điểm đang ngập thật sự hoặc trạm cảm biến
      return p.type === "sensor" || (p.depth || 0) > 0
    }

    // Chế độ xem 250 Điểm đen lịch sử IRD
    if (districtFilter !== "all" && p.district !== districtFilter) return false
    if (causeFilter !== "all") {
      const pCauses = (p as any).causes || [(p as any).primaryCause]
      const matchRain = causeFilter === "Rain" && (pCauses.includes("Mưa lớn") || pCauses.includes("Rain"))
      const matchTide = causeFilter === "High tide" && (pCauses.includes("Triều cường") || pCauses.includes("High tide"))
      const matchComb = causeFilter === "Combined" && (pCauses.includes("Mưa & Triều") || pCauses.includes("Combined"))
      if (!matchRain && !matchTide && !matchComb) return false
    }
    return true
  })

  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const floodPointsCount = filteredPoints.filter((point) => point.type === "flood" && (point.depth || 0) > 0).length
  const riskPointsCount = filteredPoints.filter((point) => point.type === "risk").length

  return (
    <div className="page-stack">
      <SectionHeader
        action={
          <StatusPill tone={mapMode === "realtime" ? "safe" : "info"}>
            {mapMode === "realtime" ? "Chẩn đoán Realtime AI" : "250 Điểm IRD (2002–2026)"}
          </StatusPill>
        }
        description="Giám sát ngập lụt đô thị TP.HCM kết hợp thời tiết thực và 425 quan trắc lịch sử 24 năm."
        title="Bản đồ Tác nghiệp & Điều hành"
      />

      {/* Thanh chuyển chế độ Realtime AI vs 250 Điểm IRD */}
      <div className="panel map-mode-bar">
        <div className="map-mode-tabs">
          <button
            type="button"
            className={`map-mode-tab-btn ${mapMode === "realtime" ? "active" : ""}`}
            onClick={() => setMapMode("realtime")}
          >
            <span className="live-dot" />
            <span>⚡ Giám sát Thời gian thực (Realtime)</span>
          </button>
          <button
            type="button"
            className={`map-mode-tab-btn ${mapMode === "history" ? "active is-history" : ""}`}
            onClick={() => setMapMode("history")}
          >
            <span>📚 Toàn bộ 250 Điểm đen IRD (2002–2026)</span>
          </button>
        </div>

        {mapMode === "history" && (
          <div className="history-sub-filters">
            <div className="cause-pills">
              <span className="filter-label"><Filter size={14} /> Nguyên nhân:</span>
              <button
                type="button"
                className={`cause-pill ${causeFilter === "all" ? "active" : ""}`}
                onClick={() => setCauseFilter("all")}
              >
                Tất cả (250)
              </button>
              <button
                type="button"
                className={`cause-pill ${causeFilter === "Rain" ? "active" : ""}`}
                onClick={() => setCauseFilter("Rain")}
              >
                Mưa lớn (198)
              </button>
              <button
                type="button"
                className={`cause-pill ${causeFilter === "High tide" ? "active" : ""}`}
                onClick={() => setCauseFilter("High tide")}
              >
                Triều cường (176)
              </button>
              <button
                type="button"
                className={`cause-pill ${causeFilter === "Combined" ? "active" : ""}`}
                onClick={() => setCauseFilter("Combined")}
              >
                Mưa & Triều (51)
              </button>
            </div>

            <div className="district-filter-wrap">
              <select
                className="district-select"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                aria-label="Lọc theo quận"
              >
                <option value="all">Tất cả quận/huyện ({points.length})</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="map-stat-row">
        <div className="map-stat">
          <span className="map-stat-icon teal">
            <MapPin size={18} />
          </span>
          <div>
            <strong>{filteredPoints.length}</strong>
            <span>{mapMode === "realtime" ? "Điểm đang hoạt động" : "Điểm đen hiển thị"}</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon coral">
            <Droplets size={18} />
          </span>
          <div>
            <strong>{floodPointsCount}</strong>
            <span>Điểm ngập {mapMode === "realtime" ? "hiện tại" : "kinh niên"}</span>
          </div>
        </div>
        <div className="map-stat">
          <span className="map-stat-icon sun">
            <Radar size={18} />
          </span>
          <div>
            <strong>{riskPointsCount}</strong>
            <span>Điểm theo dõi nguy cơ</span>
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
        points={filteredPoints}
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
          title="Cách đọc bản đồ tác nghiệp"
        />
        <div className="guide-grid">
          <div>
            <i className="legend-dot critical" />
            <strong>Nghiêm trọng (Đỏ)</strong>
            <span>Mực nước trên 35 cm, xe máy chết máy, cần điều tiết giao thông.</span>
          </div>
          <div>
            <i className="legend-dot high" />
            <strong>Cảnh báo cao (Cam)</strong>
            <span>Mực nước 20 – 35 cm, phương tiện gầm thấp khó lưu thông.</span>
          </div>
          <div>
            <i className="legend-dot medium" />
            <strong>Ngập nhẹ (Vàng)</strong>
            <span>Mực nước 10 – 20 cm, di chuyển chậm được.</span>
          </div>
          <div>
            <i className="legend-dot safe" />
            <strong>Khô ráo / Theo dõi (Xanh)</strong>
            <span>Điểm đen lịch sử đang ở trạng thái an toàn, không có mưa ngập.</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default MapPage
