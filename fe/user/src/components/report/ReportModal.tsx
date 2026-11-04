import { useEffect, useRef, useState } from "react"
import Icon from "@/components/ui/Icon"
import type { ReportType, Severity } from "@/types"

function ReportModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [type, setType] = useState<ReportType>("flood")
  const [severity, setSeverity] = useState<Severity>("medium")
  const [submitted, setSubmitted] = useState(false)
  const [photoName, setPhotoName] = useState("")
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  function closeModal() {
    onClose()
    window.setTimeout(() => {
      setSubmitted(false)
      setPhotoName("")
      setType("flood")
      setSeverity("medium")
    }, 250)
  }

  const closeModalRef = useRef(closeModal)
  closeModalRef.current = closeModal

  useEffect(() => {
    if (!open) return

    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeModalRef.current()
        return
      }
      if (event.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
      previousFocus?.focus()
    }
  }, [open])

  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={closeModal}>
      <div
        aria-describedby="report-description"
        aria-labelledby="report-title"
        aria-modal="true"
        className="report-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <button
          aria-label="Đóng báo cáo"
          className="icon-button modal-close"
          onClick={closeModal}
          ref={closeRef}
          type="button"
        >
          <Icon name="close" size={20} />
        </button>

        {submitted ? (
          <div
            aria-live="polite"
            className="report-success"
            ref={successRef}
            role="status"
            tabIndex={-1}
          >
            <span className="success-mark">
              <Icon name="check" size={30} />
            </span>
            <span className="success-pill">Đã ghi nhận</span>
            <h2 id="report-title">Cảm ơn bạn đã bảo vệ cộng đồng</h2>
            <p id="report-description">
              Báo cáo gần Cơ sở 1 đang được xác minh và sẽ giúp người đi sau
              tránh rủi ro.
            </p>
            <button
              className="primary-modal-button"
              onClick={closeModal}
              type="button"
            >
              Quay lại bản đồ
            </button>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <span className="modal-mark">
                <Icon name="pin" size={22} />
              </span>
              <div>
                <h2 id="report-title">Bạn đang thấy gì?</h2>
                <p className="modal-intro" id="report-description">
                  Chỉ mất khoảng 10 giây. Đừng thao tác khi đang điều khiển
                  phương tiện.
                </p>
              </div>
            </div>

            <div className="report-type-grid">
              <button
                aria-pressed={type === "flood"}
                className={type === "flood" ? "is-selected" : ""}
                onClick={() => setType("flood")}
                type="button"
              >
                <span className="report-type-icon water-icon">
                  <Icon name="rain" size={24} />
                </span>
                <strong>Điểm ngập</strong>
                <small>Nước đang dâng trên đường</small>
              </button>
              <button
                aria-pressed={type === "drain"}
                className={type === "drain" ? "is-selected" : ""}
                onClick={() => setType("drain")}
                type="button"
              >
                <span className="report-type-icon drain-icon">
                  <Icon name="alert" size={24} />
                </span>
                <strong>Cống bị tắc</strong>
                <small>Rác che miệng thoát nước</small>
              </button>
            </div>

            <fieldset className="severity-field">
              <legend>Mức độ quan sát được</legend>
              <div className="severity-options">
                {(
                  [
                    ["low", "Nhẹ", "Dưới mắt cá"],
                    ["medium", "Đáng chú ý", "Qua nửa bánh xe"],
                    ["high", "Nguy hiểm", "Không thể đi qua"],
                  ] as [Severity, string, string][]
                ).map(([id, title, caption]) => (
                  <button
                    aria-pressed={severity === id}
                    className={severity === id ? "is-selected" : ""}
                    key={id}
                    onClick={() => setSeverity(id)}
                    type="button"
                  >
                    <span aria-hidden="true" className={`severity-dot ${id}`} />
                    <span>
                      <strong>{title}</strong>
                      <small>{caption}</small>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="photo-button">
              <span className="photo-icon">
                <Icon name="camera" size={21} />
              </span>
              <span>
                <strong>{photoName || "Thêm ảnh hiện trường"}</strong>
                <small>
                  {photoName
                    ? "Ảnh đã sẵn sàng để gửi"
                    : "Tùy chọn · AI sẽ hỗ trợ xác minh"}
                </small>
              </span>
              <Icon name={photoName ? "check" : "plus"} size={20} />
              <input
                accept="image/*"
                aria-label="Chọn ảnh hiện trường"
                onChange={(event) =>
                  setPhotoName(event.target.files?.[0]?.name || "")
                }
                type="file"
              />
            </label>

            <div className="report-location">
              <Icon name="pin" size={18} />
              <span>
                <small>Vị trí báo cáo</small>
                <strong>105 Bà Huyện Thanh Quan, Quận 3</strong>
              </span>
              <span className="live-dot">Chính xác</span>
            </div>

            <button
              className="primary-modal-button"
              onClick={() => setSubmitted(true)}
              type="button"
            >
              Gửi báo cáo cộng đồng
              <Icon name="arrow" size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ReportModal
