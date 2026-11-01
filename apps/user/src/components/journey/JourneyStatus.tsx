import Icon from "@/components/ui/Icon"
import WaterGauge from "@/components/ui/WaterGauge"
import { forecastSlots } from "@/data/mockData"

function JourneyStatus({ forecastIndex }: { forecastIndex: number }) {
  const forecast = forecastSlots[forecastIndex]
  const isHighRisk = forecast.zone >= 2
  const isWarning = forecast.zone === 1
  const statusTitle = isHighRisk
    ? "Nên chờ mưa giảm trước khi đi"
    : isWarning
      ? "Có thể đi, cần theo dõi cảnh báo"
      : "Có thể di chuyển an toàn"

  return (
    <div
      className={`journey-summary ${
        isHighRisk ? "is-danger" : isWarning ? "is-warning" : ""
      }`}
    >
      <span className="summary-icon">
        <Icon name={isHighRisk ? "alert" : "shield"} size={23} />
      </span>
      <div className="summary-copy">
        <strong>{statusTitle}</strong>
        <p>
          {forecast.label} · {forecast.rain} mưa · nguy cơ{" "}
          {forecast.risk.toLowerCase()}
        </p>
      </div>
      <div className="summary-gauge">
        <WaterGauge
          compact
          label="mm mưa"
          max={60}
          tone={forecast.zone}
          value={Number.parseInt(forecast.rain, 10)}
        />
      </div>
    </div>
  )
}

export default JourneyStatus
