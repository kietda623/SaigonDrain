import { useEffect, useRef } from "react"
import Icon from "@/components/ui/Icon"
import type {
  ForecastSlot,
  NavigationStep,
  RouteId,
  RouteItem,
  SavedRoutePair,
  VehicleMode,
  WeatherSnapshot,
} from "@/types"
import JourneyStatus from "@/components/journey/JourneyStatus"
import ForecastTimeline from "@/components/journey/ForecastTimeline"
import RouteOption from "@/components/journey/RouteOption"
import TurnByTurnDirections from "@/components/journey/TurnByTurnDirections"

function JourneyPanel({
  forecastIndex,
  setForecastIndex,
  selectedRoute,
  setSelectedRoute,
  expanded,
  setExpanded,
  isNavigating,
  onStart,
  onReport,
  focusSection,
  forecasts,
  routesData,
  navigationSteps,
  canSaveRoute,
  onSaveCurrentRoute,
  savedRoutes,
  onSelectSavedRoute,
  onRemoveSavedRoute,
  weather,
  vehicleMode = "motorcycle",
  onSelectVehicleMode,
}: {
  forecastIndex: number
  setForecastIndex: (index: number) => void
  selectedRoute: RouteId
  setSelectedRoute: (route: RouteId) => void
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  isNavigating: boolean
  onStart: () => void
  onReport: () => void
  focusSection?: "forecast" | "routes" | null
  forecasts: readonly ForecastSlot[]
  routesData: Record<RouteId, RouteItem>
  navigationSteps: readonly NavigationStep[]
  canSaveRoute?: boolean
  onSaveCurrentRoute?: () => void
  savedRoutes?: readonly SavedRoutePair[]
  onSelectSavedRoute?: (pair: SavedRoutePair) => void
  onRemoveSavedRoute?: (id: string) => void
  weather?: WeatherSnapshot | null
  vehicleMode?: VehicleMode
  onSelectVehicleMode?: (mode: VehicleMode) => void
}) {
  const forecastRef = useRef<HTMLDivElement>(null)
  const routesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!expanded || !focusSection) return
    const target =
      focusSection === "routes" ? routesRef.current : forecastRef.current
    if (!target) return
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [expanded, focusSection])

  return (
    <section
      className={`journey-panel ${expanded ? "is-expanded" : "is-collapsed"}`}
    >
      <button
        aria-expanded={expanded}
        aria-label={
          expanded ? "Thu gọn bảng hành trình" : "Mở rộng bảng hành trình"
        }
        className="sheet-handle"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        <span />
      </button>

      <div className="panel-body">
        {isNavigating && (
          <div className="navigation-strip">
            <span>
              <Icon name="route" size={18} />
            </span>
            <strong>Đang dẫn đường</strong>
            <small>
              còn {routesData[selectedRoute].time} ·{" "}
              {routesData[selectedRoute].distance}
            </small>
          </div>
        )}

        <JourneyStatus
          forecastIndex={forecastIndex}
          slots={forecasts}
          weather={weather}
        />

        <div className="panel-scroll">
          <div ref={forecastRef}>
            <ForecastTimeline
              value={forecastIndex}
              onChange={setForecastIndex}
              slots={forecasts}
            />
          </div>

          <div className="route-section" ref={routesRef}>
            <div className="section-heading route-heading">
              <div>
                <h2>Chọn tuyến an toàn</h2>
                <p>So sánh thời gian và mức độ ngập trên đường.</p>
              </div>
              {canSaveRoute && onSaveCurrentRoute ? (
                <button
                  className="save-route-btn"
                  onClick={onSaveCurrentRoute}
                  title="Lưu lộ trình này vào mục đã lưu"
                  type="button"
                >
                  <Icon name="pin" size={16} />
                  <span>Lưu lộ trình</span>
                </button>
              ) : (
                <Icon name="route" size={22} />
              )}
            </div>
            <div className="route-options">
              <RouteOption
                id="safe"
                onSelect={setSelectedRoute}
                routeItem={routesData.safe}
                selected={selectedRoute === "safe"}
              />
              <RouteOption
                id="balanced"
                onSelect={setSelectedRoute}
                routeItem={routesData.balanced}
                selected={selectedRoute === "balanced"}
              />
            </div>

            {savedRoutes && savedRoutes.length > 0 && (
              <div className="saved-routes-box">
                <div className="saved-routes-header">
                  <Icon name="pin" size={15} />
                  <span>Lộ trình quen thuộc đã lưu ({savedRoutes.length})</span>
                </div>
                <div className="saved-routes-list">
                  {savedRoutes.map((pair) => (
                    <div className="saved-route-item" key={pair.id}>
                      <button
                        className="saved-route-select"
                        onClick={() => onSelectSavedRoute?.(pair)}
                        type="button"
                      >
                        <strong>{pair.origin.label}</strong>
                        <small>→ {pair.destination.label}</small>
                      </button>
                      {onRemoveSavedRoute && (
                        <button
                          aria-label="Xóa lộ trình đã lưu"
                          className="saved-route-delete"
                          onClick={() => onRemoveSavedRoute(pair.id)}
                          type="button"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`route-explanation ${selectedRoute}`}>
            <span className="explanation-icon">
              <Icon
                name={selectedRoute === "safe" ? "shield" : "alert"}
                size={19}
              />
            </span>
            <p>{routesData[selectedRoute].detail}</p>
          </div>

          <TurnByTurnDirections
            distance={routesData[selectedRoute].distance}
            durationText={routesData[selectedRoute].time}
            steps={navigationSteps}
          />
        </div>
      </div>

      <div className="panel-actions">
        <button
          className={`start-button ${selectedRoute} ${
            isNavigating ? "is-navigating" : ""
          }`}
          onClick={onStart}
          type="button"
        >
          <span>
            <small>
              {isNavigating ? "Đang dẫn đường" : "Bắt đầu với"}
            </small>
            <strong>
              {isNavigating
                ? "Kết thúc hành trình"
                : routesData[selectedRoute].name}
            </strong>
          </span>
          <Icon name={isNavigating ? "close" : "arrow"} size={21} />
        </button>
        <button className="report-secondary" onClick={onReport} type="button">
          <Icon name="camera" size={18} />
          Báo cáo hiện trường
        </button>
      </div>
    </section>
  )
}

export default JourneyPanel
