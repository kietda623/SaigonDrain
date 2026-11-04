import { BellRing, CloudRain, Map, TriangleAlert } from "lucide-react"
import Button from "@/components/ui/Button"
import StatusPill from "@/components/ui/StatusPill"
import WaterGauge from "@/components/ui/WaterGauge"
import type { WeatherSnapshot } from "@/types"

function FloodStatusHero({
  pendingCount,
  activeAlertCount,
  onViewMap,
  onViewAlerts,
  weather,
}: {
  pendingCount: number
  activeAlertCount: number
  onViewMap: () => void
  onViewAlerts: () => void
  weather?: WeatherSnapshot | null
}) {
  const rainValue =
    weather && weather.currentRainMm > 0
      ? Math.round(weather.currentRainMm)
      : 34
  const riskLabel = weather?.floodRiskLevel
    ? `Nguy cơ ${weather.floodRiskLevel.toLowerCase()}`
    : "Nguy cơ cao"

  return (
    <section className="flood-hero">
      <div className="hero-copy">
        <span className="hero-eyebrow">
          <CloudRain size={16} />
          {weather
            ? `Đồng bộ trực tiếp (${weather.provider}) · Ẩm ${weather.humidityPercent}%`
            : "Cập nhật lúc 18:48 · Thứ Bảy 24/05"}
        </span>
        <h2 className="hero-title">Mưa lớn đang mở rộng về phía Đông thành phố</h2>
        <p className="hero-sub">
          Sáu phường có nguy cơ ngập trong 30–60 phút tới. Hệ thống đang theo dõi
          mực nước tại các tuyến trũng và hành lang ven kênh.
        </p>
        <div className="hero-actions">
          <Button onClick={onViewMap}>
            <Map size={16} /> Xem trên bản đồ
          </Button>
          <Button variant="secondary" onClick={onViewAlerts}>
            <BellRing size={16} /> Xem cảnh báo
          </Button>
        </div>
        <div className="hero-chips">
          <StatusPill tone="watch" icon={<TriangleAlert size={13} />}>
            {pendingCount} báo cáo chờ xác minh
          </StatusPill>
          <StatusPill tone="danger">
            {activeAlertCount} cảnh báo đang phát
          </StatusPill>
          <StatusPill tone="info">Độ tin cậy dự báo 89%</StatusPill>
        </div>
      </div>

      <div className="hero-gauge">
        <div className="hero-rain">
          <span className="hero-rain-icon">
            <CloudRain size={22} />
          </span>
          <div>
            <small>Lượng mưa 30 phút</small>
            <strong>
              {rainValue} <span>mm</span>
            </strong>
          </div>
          <StatusPill tone="watch">{riskLabel}</StatusPill>
        </div>
        <WaterGauge tone={1} value={rainValue} />
        <p className="hero-gauge-note">
          Dự kiến đạt đỉnh 51 mm lúc 19:30 trước khi giảm dần sau 20:00.
        </p>
      </div>
    </section>
  )
}

export default FloodStatusHero
