import { AlertTriangle, Check, CircleUserRound, MapPin, Sparkles, XCircle } from "lucide-react"
import Button from "@/components/ui/Button"
import Heading from "@/components/ui/Heading"
import ReportVisual from "@/components/reports/ReportVisual"
import ModalShell from "@/components/ui/ModalShell"
import { severityLabel } from "@/lib/severity"
import type { FloodReport } from "@/types"

function ReportReviewModal({
  report,
  onClose,
  onApprove,
  onReject,
}: {
  report: FloodReport
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <ModalShell
      title="Xác minh báo cáo hiện trường"
      subtitle={`${report.id} · Gửi ${report.minutesAgo} phút trước`}
      onClose={onClose}
      wide
    >
      <div className="review-grid">
        <div className="review-media">
          <ReportVisual type={report.visual} large />
          <div className="image-badge">
            <Sparkles size={14} /> AI đã phân tích ảnh
          </div>
        </div>
        <div className="review-content">
          <div className="location-head">
            <div className="location-icon">
              <MapPin size={20} />
            </div>
            <div>
              <Heading level={3}>{report.location}</Heading>
              <p>
                {report.district} · {report.coordinates}
              </p>
            </div>
            <span className={`severity-pill ${report.severity}`}>
              {severityLabel(report.severity)}
            </span>
          </div>
          <div className="report-description">“{report.description}”</div>
          <div className="ai-card">
            <div className="ai-card-head">
              <span>
                <Sparkles size={16} /> Kết quả phân tích AI
              </span>
              <strong>{report.aiConfidence}% tin cậy</strong>
            </div>
            <div className="ai-stats">
              <span>
                <small>Mức nước ước tính</small>
                <b>{report.aiDepth} cm</b>
              </span>
              <span>
                <small>Loại sự cố</small>
                <b>{report.priority}</b>
              </span>
              <span>
                <small>Lịch sử khu vực</small>
                <b>{report.historyCount} lần ngập</b>
              </span>
            </div>
          </div>
          {report.id === "RP-2418" && (
            <div className="duplicate-note">
              <AlertTriangle size={17} />
              <div>
                <strong>Có thể trùng lặp</strong>
                <span>
                  1 báo cáo khác cách vị trí này 80 m trong 10 phút qua.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <span className="reporter-note">
          <CircleUserRound size={16} /> Người gửi đã được ẩn danh
        </span>
        <div>
          <Button variant="danger" onClick={onReject}>
            <XCircle size={16} /> Từ chối
          </Button>
          <Button onClick={onApprove}>
            <Check size={16} /> Xác nhận báo cáo
          </Button>
        </div>
      </div>
    </ModalShell>
  )
}


export default ReportReviewModal
