import { forecastSlots } from "@/data/mockData"

function ForecastTimeline({
  value,
  onChange,
}: {
  value: number
  onChange: (index: number) => void
}) {
  const current = forecastSlots[value]

  return (
    <div className="forecast-section">
      <div className="section-heading">
        <div>
          <h2>Dự báo lượng mưa</h2>
          <p>Chọn mốc thời gian để so sánh mức độ rủi ro.</p>
        </div>
        <span className={`risk-pill zone-${current.zone}`}>
          {current.risk}
        </span>
      </div>
      <div
        aria-label="Mốc thời gian dự báo"
        className="forecast-tabs"
        role="group"
      >
        {forecastSlots.map((slot, index) => {
          const rain = Number.parseInt(slot.rain, 10)
          const height = Math.max(16, Math.min(100, (rain / 60) * 100))

          return (
            <button
              aria-label={`${slot.label}: ${slot.rain} mưa, nguy cơ ${slot.risk.toLowerCase()}`}
              aria-pressed={value === index}
              className={`zone-${slot.zone} ${
                value === index ? "is-active" : ""
              }`}
              key={slot.id}
              onClick={() => onChange(index)}
              type="button"
            >
              <span className="forecast-time">{slot.label}</span>
              <strong>{slot.rain}</strong>
              <span aria-hidden="true" className="forecast-meter">
                <i style={{ transform: `scaleY(${height / 100})` }} />
              </span>
              <small>{slot.risk}</small>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ForecastTimeline
