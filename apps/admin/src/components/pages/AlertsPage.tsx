import { useState } from "react"
import { BellRing, CheckCircle2, Megaphone, Radio } from "lucide-react"
import AlertTable from "@/components/alerts/AlertTable"
import EmptyState from "@/components/ui/EmptyState"
import SectionHeader from "@/components/ui/SectionHeader"
import SegmentedControl from "@/components/ui/SegmentedControl"
import { alertLevelCounts, channelCoverage } from "@/lib/analytics"
import type { AreaAlert } from "@/types"

function AlertsPage({
  alerts,
  onEdit,
  onEnd,
}: {
  alerts: AreaAlert[]
  onEdit: (alert: AreaAlert) => void
  onEnd: (alert: AreaAlert) => void
}) {
  const [tab, setTab] = useState<"active" | "ended">("active")
  const counts = alertLevelCounts(alerts)
  const channels = channelCoverage(alerts)
  const visible = alerts.filter((alert) => alert.status === tab)

  return (
    <div className="page-stack">
      <SectionHeader
        description="Phát thông tin đến người dân qua web, push và trung tâm điều hành."
        title="Danh sách cảnh báo"
      />

      <div className="alert-stat-row">
        <div className="alert-stat">
          <span className="alert-stat-icon danger">
            <Radio size={18} />
          </span>
          <div>
            <strong>{counts.active}</strong>
            <span>Đang phát</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon teal">
            <CheckCircle2 size={18} />
          </span>
          <div>
            <strong>{counts.ended}</strong>
            <span>Đã kết thúc</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon sun">
            <Megaphone size={18} />
          </span>
          <div>
            <strong>{channels.length}</strong>
            <span>Kênh phát hành</span>
          </div>
        </div>
        <div className="alert-stat">
          <span className="alert-stat-icon rain">
            <BellRing size={18} />
          </span>
          <div>
            <strong>7</strong>
            <span>Khu vực ảnh hưởng</span>
          </div>
        </div>
      </div>

      <div className="alerts-toolbar">
        <SegmentedControl
          label="Lọc cảnh báo theo trạng thái"
          onChange={setTab}
          options={[
            { value: "active", label: `Đang phát (${counts.active})` },
            { value: "ended", label: `Đã kết thúc (${counts.ended})` },
          ]}
          value={tab}
        />
      </div>

      {visible.length ? (
        <AlertTable alerts={visible} onEdit={onEdit} onEnd={onEnd} />
      ) : (
        <div className="panel">
          <EmptyState
            description={
              tab === "active"
                ? "Hiện không có cảnh báo nào đang phát tới người dân."
                : "Các cảnh báo đã kết thúc sẽ được lưu tại đây để tra cứu."
            }
            icon={<BellRing size={24} />}
            title={
              tab === "active"
                ? "Không có cảnh báo đang phát"
                : "Chưa có cảnh báo đã kết thúc"
            }
          />
        </div>
      )}

      <section className="panel channel-panel">
        <SectionHeader
          description="Số cảnh báo đã gửi trên từng kênh, tính trên toàn bộ dữ liệu hiện có."
          title="Độ phủ kênh phát hành"
        />
        <div className="coverage-grid">
          {channels.map((channel) => (
            <div className="coverage-row" key={channel.label}>
              <span>{channel.label}</span>
              <div className="bar-track">
                <span
                  style={{
                    width: `${
                      (channel.count / Math.max(alerts.length, 1)) * 100
                    }%`,
                  }}
                />
              </div>
              <strong>{channel.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AlertsPage
