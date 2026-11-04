import { useState, type ReactNode } from "react"
import {
  ChevronDown,
  CloudRain,
  Droplets,
  History,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react"
import Button from "@/components/ui/Button"
import IconButton from "@/components/ui/IconButton"
import Heading from "@/components/ui/Heading"
import { severityLabel } from "@/lib/severity"
import type { Severity, MapLayer, FloodReport, MapPoint } from "@/types"

const CENTER_LAT = 10.772
const CENTER_LNG = 106.695

function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z)
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  )
}

function OperationsMap({
  reports,
  points,
  selectedId,
  onSelect,
  layers,
  setLayers,
  severityFilter,
  setSeverityFilter,
  onExpand,
  variant = "preview",
}: {
  reports: FloodReport[]
  points: MapPoint[]
  selectedId: string | null
  onSelect: (point: MapPoint) => void
  layers: MapLayer[]
  setLayers: (layers: MapLayer[]) => void
  severityFilter: "all" | Severity
  setSeverityFilter: (value: "all" | Severity) => void
  onExpand?: () => void
  variant?: "preview" | "full"
}) {
  const [zoom, setZoom] = useState(12)
  const [mapStyle, setMapStyle] = useState<"osm" | "schematic">("osm")

  const visiblePoints = points.filter((point) => {
    if (severityFilter !== "all" && point.severity !== severityFilter)
      return false
    if (point.type === "risk" && !layers.includes("risk")) return false
    if (point.type === "sensor" && !layers.includes("rain")) return false
    if (
      (point.type === "flood" || point.type === "pending") &&
      !layers.includes("flood")
    )
      return false
    if (
      point.linkedReportId &&
      reports.find((report) => report.id === point.linkedReportId)?.status ===
        "rejected"
    )
      return false
    return true
  })

  const selected = visiblePoints.find((point) => point.id === selectedId)
  const layerOptions: {
    id: MapLayer
    label: string
    icon: ReactNode
  }[] = [
    { id: "flood", label: "Ngập hiện tại", icon: <Droplets size={14} /> },
    { id: "risk", label: "Nguy cơ", icon: <TriangleAlert size={14} /> },
    { id: "rain", label: "Mưa dự báo", icon: <CloudRain size={14} /> },
    { id: "history", label: "Lịch sử ngập", icon: <History size={14} /> },
  ]

  // Build an 8x4 Web Mercator tile grid (2048x1024px) centered at 50%/50%
  const centerX = lngToTileX(CENTER_LNG, zoom)
  const centerY = latToTileY(CENTER_LAT, zoom)
  const baseTileX = Math.floor(centerX) - 3
  const baseTileY = Math.floor(centerY) - 1
  const gridCols = 8
  const gridRows = 4

  function getPointPosition(point: MapPoint): { left: number; top: number } {
    if (
      mapStyle === "osm" &&
      typeof point.lat === "number" &&
      typeof point.lng === "number"
    ) {
      const px = lngToTileX(point.lng, zoom)
      const py = latToTileY(point.lat, zoom)
      // Map within a virtual viewport of 2.4 tiles wide x 1.5 tiles tall around center
      const spanX = 2.35
      const spanY = 1.45
      const left = 50 + ((px - centerX) / spanX) * 100
      const top = 50 + ((py - centerY) / spanY) * 100
      return {
        left: Math.max(6, Math.min(94, left)),
        top: Math.max(8, Math.min(92, top)),
      }
    }
    return { left: point.x, top: point.y }
  }

  return (
    <section className={`panel map-panel ${variant === "full" ? "is-full" : ""}`}>
      <div className="panel-heading map-heading">
        <div>
          <Heading className="panel-title">Bản đồ vận hành TP.HCM</Heading>
          <p>
            Giám sát điểm ngập và nguy cơ theo thời gian thực ·{" "}
            {visiblePoints.length} điểm đang hiển thị
          </p>
        </div>
        <div className="map-heading-actions">
          <Button
            onClick={() =>
              setMapStyle((prev) => (prev === "osm" ? "schematic" : "osm"))
            }
            variant="ghost"
          >
            <MapIcon size={14} />{" "}
            {mapStyle === "osm" ? "Nền: Bản đồ thực tế" : "Nền: Sơ đồ vùng"}
          </Button>
          {onExpand && (
            <Button onClick={onExpand} variant="ghost">
              <Maximize2 size={14} /> Mở rộng
            </Button>
          )}
          <label className="compact-select">
            <span className="sr-only">Lọc mức độ</span>
            <select
              value={severityFilter}
              onChange={(e) =>
                setSeverityFilter(e.target.value as "all" | Severity)
              }
            >
              <option value="all">Tất cả mức độ</option>
              <option value="critical">Nghiêm trọng</option>
              <option value="high">Cao</option>
              <option value="medium">Trung bình</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
      </div>
      <div className="layer-bar">
        {layerOptions.map((layer) => {
          const active = layers.includes(layer.id)
          return (
            <button
              key={layer.id}
              className={active ? "active" : ""}
              aria-pressed={active}
              onClick={() =>
                setLayers(
                  active
                    ? layers.filter((item) => item !== layer.id)
                    : [...layers, layer.id],
                )
              }
              type="button"
            >
              {layer.icon} {layer.label}
            </button>
          )
        })}
      </div>
      <div className={`map-canvas ${mapStyle === "osm" ? "is-osm" : ""}`}>
        {mapStyle === "osm" ? (
          <div className="osm-tile-stage" aria-hidden="true">
            {Array.from({ length: gridRows }).map((_, rowIdx) =>
              Array.from({ length: gridCols }).map((__, colIdx) => {
                const tx = baseTileX + colIdx
                const ty = baseTileY + rowIdx
                const offsetX = Math.round((tx - centerX) * 256)
                const offsetY = Math.round((ty - centerY) * 256)
                return (
                  <img
                    key={`${zoom}-${tx}-${ty}`}
                    src={`https://mt${Math.abs(tx + ty) % 4}.google.com/vt/lyrs=m&hl=vi&x=${tx}&y=${ty}&z=${zoom}`}
                    onError={(e) => {
                      const target = e.currentTarget
                      if (!target.dataset.fallback) {
                        target.dataset.fallback = "1"
                        target.src = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${ty}/${tx}`
                      }
                    }}
                    style={{
                      position: "absolute",
                      left: `calc(50% + ${offsetX}px)`,
                      top: `calc(50% + ${offsetY}px)`,
                      width: "256px",
                      height: "256px",
                    }}
                    alt=""
                    className="osm-tile-img"
                    loading="eager"
                  />
                )
              }),
            )}
            <div className="osm-tint-overlay" />
          </div>
        ) : (
          <svg
            className="city-map"
            viewBox="0 0 800 470"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect width="800" height="470" className="map-ground" />

            <g className="contours">
              <path d="M-20 64 C120 40 220 92 340 68 S580 40 830 76" />
              <path d="M-20 106 C120 82 220 134 340 110 S580 82 830 118" />
              <path d="M-20 148 C120 124 220 176 340 152 S580 124 830 160" />
              <path d="M-20 252 C120 228 220 280 340 256 S580 228 830 264" />
              <path d="M-20 294 C120 270 220 322 340 298 S580 270 830 306" />
              <path d="M-20 336 C120 312 220 364 340 340 S580 312 830 348" />
              <path d="M-20 408 C120 384 220 436 340 412 S580 384 830 420" />
            </g>

            <g className="districts">
              <path d="M80 53 L226 55 L282 142 L185 205 L65 173 Z" />
              <path d="M250 48 L417 35 L481 140 L396 201 L281 145 Z" />
              <path d="M91 229 L246 195 L311 292 L218 356 L70 323 Z" />
              <path d="M246 209 L402 202 L469 296 L350 368 L294 291 Z" />
              <path d="M74 352 L223 359 L283 456 L92 451 Z" />
              <path d="M506 42 L700 39 L752 158 L574 181 Z" />
              <path d="M529 211 L735 185 L767 311 L559 316 Z" />
              <path d="M507 341 L702 335 L764 454 L489 456 Z" />
            </g>

            <path
              d="M555 -20 C500 70 565 118 517 179 C478 230 520 277 481 335 C442 393 478 438 453 500"
              className="river-main"
            />
            <path d="M520 177 C606 167 662 114 725 66" className="river-branch" />
            <path
              d="M477 334 C557 348 646 386 753 462"
              className="river-branch"
            />

            <path
              d="M35 103 C178 108 247 81 397 116 S647 88 768 118"
              className="road major"
            />
            <path
              d="M78 212 C194 181 278 220 406 198 S626 205 760 179"
              className="road major"
            />
            <path
              d="M32 343 C158 297 273 347 409 306 S641 286 783 323"
              className="road major"
            />
            <path
              d="M151 23 C177 107 151 181 198 258 S217 389 199 464"
              className="road"
            />
            <path
              d="M316 13 C288 109 341 182 310 269 S348 398 326 464"
              className="road"
            />
            <path
              d="M673 20 C639 91 684 153 641 229 S680 367 647 461"
              className="road"
            />
            <path
              d="M48 278 L733 51 M86 431 L757 213 M119 43 L727 414"
              className="road minor"
            />
          </svg>
        )}

        {layers.includes("history") && (
          <>
            <span className="heat-zone heat-one" />
            <span className="heat-zone heat-two" />
            <span className="heat-zone heat-three" />
          </>
        )}
        <span className="map-label label-govap">GÒ VẤP</span>
        <span className="map-label label-binhthanh">BÌNH THẠNH</span>
        <span className="map-label label-thuduc">TP. THỦ ĐỨC</span>
        <span className="map-label label-q7">QUẬN 7</span>
        <span className="map-label label-binhchanh">BÌNH CHÁNH</span>

        {visiblePoints.map((point) => {
          const pos = getPointPosition(point)
          return (
            <button
              key={point.id}
              className={`map-marker ${point.type} ${point.severity} ${
                selectedId === point.id ? "selected" : ""
              }`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
              aria-label={`${point.label}, ${severityLabel(point.severity)}`}
              title={`${point.label} (${point.district}) · ${severityLabel(point.severity)}`}
              onClick={() => onSelect(point)}
              type="button"
            >
              <span>
                {point.type === "risk" ? (
                  <TriangleAlert size={14} />
                ) : point.type === "sensor" ? (
                  <CloudRain size={14} />
                ) : (
                  <Droplets size={14} />
                )}
              </span>
              <small className="marker-badge">
                {point.label}
                {point.depth > 0 ? ` · ${point.depth}cm` : ` · ${point.rainfall}mm`}
              </small>
            </button>
          )
        })}

        {mapStyle === "osm" && (
          <div className="map-controls">
            <IconButton
              label="Phóng to bản đồ"
              onClick={() => setZoom((z) => Math.min(13, z + 1))}
            >
              <Plus size={14} />
            </IconButton>
            <IconButton
              label="Thu nhỏ bản đồ"
              onClick={() => setZoom((z) => Math.max(11, z - 1))}
            >
              <Minus size={14} />
            </IconButton>
            <IconButton
              label="Đặt lại góc nhìn"
              onClick={() => setZoom(12)}
            >
              <RotateCcw size={13} />
            </IconButton>
          </div>
        )}

        {selected && (
          <div className="map-popover">
            <div className="popover-top">
              <span className={`severity-dot ${selected.severity}`} />
              <div>
                <strong>{selected.label}</strong>
                <span>
                  {selected.district} · {severityLabel(selected.severity)}
                </span>
              </div>
              <IconButton
                label="Đóng chi tiết"
                onClick={() => onSelect(selected)}
              >
                <X size={14} />
              </IconButton>
            </div>
            <div className="popover-stats">
              <span>
                <b>
                  {selected.depth || "—"}
                  {selected.depth ? " cm" : ""}
                </b>
                Mực nước
              </span>
              <span>
                <b>{selected.rainfall} mm</b>Lượng mưa
              </span>
              <span>
                <b>{selected.historyCount}</b>Lần ngập
              </span>
            </div>
            <div className="confidence-row">
              <span>
                {selected.lat && selected.lng
                  ? `GPS: ${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`
                  : "Độ tin cậy dữ liệu"}
              </span>
              <strong>{selected.linkedReportId ? "94%" : "97%"}</strong>
            </div>
          </div>
        )}
        <div className="map-legend">
          <strong>Chú giải</strong>
          <span>
            <i className="legend-dot critical" /> Nghiêm trọng
          </span>
          <span>
            <i className="legend-dot high" /> Cao
          </span>
          <span>
            <i className="legend-dot medium" /> Trung bình
          </span>
        </div>
      </div>
    </section>
  )
}

export default OperationsMap
