import { useEffect, useRef } from "react"
import Icon from "@/components/ui/Icon"
import { routes } from "@/data/mockData"
import type { RouteId } from "@/types"
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
              còn {routes[selectedRoute].time} ·{" "}
              {routes[selectedRoute].distance}
            </small>
          </div>
        )}

        <JourneyStatus forecastIndex={forecastIndex} />

        <div className="panel-scroll">
          <div ref={forecastRef}>
            <ForecastTimeline
              value={forecastIndex}
              onChange={setForecastIndex}
            />
          </div>

          <div className="route-section" ref={routesRef}>
            <div className="section-heading route-heading">
              <div>
                <h2>Chọn tuyến an toàn</h2>
                <p>So sánh thời gian và mức độ ngập trên đường.</p>
              </div>
              <Icon name="route" size={22} />
            </div>
            <div className="route-options">
              <RouteOption
                id="safe"
                onSelect={setSelectedRoute}
                selected={selectedRoute === "safe"}
              />
              <RouteOption
                id="balanced"
                onSelect={setSelectedRoute}
                selected={selectedRoute === "balanced"}
              />
            </div>
          </div>

          <div className={`route-explanation ${selectedRoute}`}>
            <span className="explanation-icon">
              <Icon
                name={selectedRoute === "safe" ? "shield" : "alert"}
                size={19}
              />
            </span>
            <p>{routes[selectedRoute].detail}</p>
          </div>

          <TurnByTurnDirections />
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
              {isNavigating ? "Kết thúc hành trình" : routes[selectedRoute].name}
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
