import { useEffect, useState } from "react"
import BottomNav from "@/components/layout/BottomNav"
import TopBar from "@/components/layout/TopBar"
import Icon from "@/components/ui/Icon"
import WaterGauge from "@/components/ui/WaterGauge"
import MapCanvas from "@/components/map/MapCanvas"
import MapLegend from "@/components/map/MapLegend"
import RouteSearch from "@/components/journey/RouteSearch"
import JourneyPanel from "@/components/journey/JourneyPanel"
import ReportModal from "@/components/report/ReportModal"
import { forecastSlots } from "@/data/mockData"
import type { AppTab, RouteId } from "@/types"

function App() {
  const [forecastIndex, setForecastIndex] = useState(1)
  const [selectedRoute, setSelectedRoute] = useState<RouteId>("safe")
  const [reportOpen, setReportOpen] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeTab, setActiveTab] = useState<AppTab>("map")

  const forecast = forecastSlots[forecastIndex]
  const rainValue = Number.parseInt(forecast.rain, 10)

  useEffect(() => {
    if (!reportOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [reportOpen])

  function toggleNavigation() {
    setIsNavigating((current) => !current)
    setPanelExpanded(false)
    setActiveTab("map")
  }

  function selectTab(tab: AppTab) {
    setActiveTab(tab)
    setPanelExpanded(tab !== "map")
  }

  return (
    <main
      className={`app-shell ${
        panelExpanded ? "panel-expanded" : "panel-collapsed"
      } ${isNavigating ? "is-navigating" : ""}`}
    >
      <h1 className="sr-only">SaigonDrain AI — Bản đồ an toàn TP.HCM</h1>
      <TopBar />

      <div className="desktop-sidebar">
        <RouteSearch />
        <JourneyPanel
          expanded
          forecastIndex={forecastIndex}
          selectedRoute={selectedRoute}
          setExpanded={() => undefined}
          setForecastIndex={setForecastIndex}
          setSelectedRoute={setSelectedRoute}
          isNavigating={isNavigating}
          onStart={toggleNavigation}
          onReport={() => setReportOpen(true)}
        />
      </div>

      <section className="map-stage">
        <MapCanvas route={selectedRoute} />

        <div className="map-top-stack">
          <div className="mobile-search">
            <RouteSearch />
          </div>

          {!isNavigating && (
            <button
              className={`map-risk-card zone-${forecast.zone}`}
              onClick={() => {
                setActiveTab("tracking")
                setPanelExpanded(true)
              }}
              type="button"
            >
              <span className="map-risk-icon">
                <Icon name={forecast.zone === 2 ? "alert" : "rain"} size={22} />
              </span>
              <span className="map-risk-copy">
                <small>{forecast.label}</small>
                <strong>
                  {forecast.rain} mưa · nguy cơ {forecast.risk.toLowerCase()}
                </strong>
                <WaterGauge
                  compact
                  label="mm mưa"
                  max={60}
                  tone={forecast.zone}
                  value={rainValue}
                />
              </span>
              <Icon name="chevron" size={18} />
            </button>
          )}
        </div>

        {isNavigating && (
          <div className="next-turn-banner">
            <span className="next-turn-icon">
              <Icon name="turn-left" size={26} />
            </span>
            <span className="next-turn-copy">
              <small>Trong 220 m</small>
              <strong>Rẽ trái vào Võ Thị Sáu</strong>
            </span>
            <span className="next-turn-then">Sau đó rẽ phải</span>
          </div>
        )}

        <MapLegend selectedRoute={selectedRoute} />

        <button
          className="report-fab"
          onClick={() => setReportOpen(true)}
          type="button"
        >
          <span>
            <Icon name="plus" size={20} />
          </span>
          Báo cáo
        </button>

        <span className="demo-label">Dữ liệu minh họa</span>
      </section>

      <div className="mobile-panel">
        <JourneyPanel
          expanded={panelExpanded}
          focusSection={
            activeTab === "tracking"
              ? "forecast"
              : activeTab === "saved"
                ? "routes"
                : null
          }
          forecastIndex={forecastIndex}
          selectedRoute={selectedRoute}
          setExpanded={setPanelExpanded}
          setForecastIndex={setForecastIndex}
          setSelectedRoute={setSelectedRoute}
          isNavigating={isNavigating}
          onStart={toggleNavigation}
          onReport={() => setReportOpen(true)}
        />
      </div>

      <BottomNav activeTab={activeTab} onSelect={selectTab} />

      <ReportModal onClose={() => setReportOpen(false)} open={reportOpen} />
    </main>
  )
}

export default App
