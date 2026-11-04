import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import Topbar from "@/components/layout/Topbar"
import IconButton from "@/components/ui/IconButton"
import Sidebar from "@/components/layout/Sidebar"
import OverviewPage from "@/components/pages/OverviewPage"
import MapPage from "@/components/pages/MapPage"
import ReportsPage from "@/components/pages/ReportsPage"
import AlertsPage from "@/components/pages/AlertsPage"
import UsersPage from "@/components/pages/UsersPage"
import AnalyticsPage from "@/components/pages/AnalyticsPage"
import ReportReviewModal from "@/components/reports/ReportReviewModal"
import AlertModal from "@/components/alerts/AlertModal"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import UserDetailModal from "@/components/users/UserDetailModal"
import { reportsSeed } from "@/data/reports"
import { alertsSeed } from "@/data/alerts"
import { usersSeed } from "@/data/users"
import { trends } from "@/data/trends"
import type {
  AlertDraft,
  AreaAlert,
  FloodReport,
  MapLayer,
  MapPoint,
  Page,
  Severity,
  UserStatus,
} from "@/types"

export default function App() {
  const [reports, setReports] = useState(reportsSeed)
  const [alerts, setAlerts] = useState(alertsSeed)
  const [selectedMapPoint, setSelectedMapPoint] = useState<string | null>("p1")
  const [layers, setLayers] = useState<MapLayer[]>([
    "flood",
    "risk",
    "rain",
    "history",
  ])
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all")
  const [trendRange, setTrendRange] = useState<keyof typeof trends>("24h")
  const [reviewing, setReviewing] = useState<FloodReport | null>(null)
  const [rejecting, setRejecting] = useState<FloodReport | null>(null)
  const [alertModal, setAlertModal] = useState<{
    mode: "create" | "edit"
    alert?: AreaAlert
  } | null>(null)
  const [endingAlert, setEndingAlert] = useState<AreaAlert | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [page, setPage] = useState<Page>("overview")
  const [users, setUsers] = useState(usersSeed)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const pendingCount = reports.filter(
    (report) => report.status === "pending",
  ).length
  const activeAlertCount = alerts.filter(
    (alert) => alert.status === "active",
  ).length

  const navigate = (next: Page) => {
    setPage(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const selectMapPoint = (point: MapPoint) => {
    if (selectedMapPoint === point.id) {
      setSelectedMapPoint(null)
      return
    }
    setSelectedMapPoint(point.id)
    if (point.linkedReportId) {
      const report = reports.find(
        (item) => item.id === point.linkedReportId && item.status === "pending",
      )
      if (report) setReviewing(report)
    }
  }

  const approveReport = () => {
    if (!reviewing) return
    setReports((current) =>
      current.map((report) =>
        report.id === reviewing.id ? { ...report, status: "verified" } : report,
      ),
    )
    setReviewing(null)
    setToast(`Đã xác nhận báo cáo ${reviewing.id} và cập nhật bản đồ.`)
  }

  const rejectReport = (reason?: string) => {
    if (!rejecting) return
    setReports((current) =>
      current.map((report) =>
        report.id === rejecting.id ? { ...report, status: "rejected" } : report,
      ),
    )
    setRejecting(null)
    setReviewing(null)
    setToast(
      `Đã từ chối báo cáo ${rejecting.id}${reason ? `: ${reason}` : ""}.`,
    )
  }

  const saveAlert = (draft: AlertDraft) => {
    if (alertModal?.mode === "edit" && alertModal.alert) {
      setAlerts((current) =>
        current.map((alert) =>
          alert.id === alertModal.alert?.id ? { ...alert, ...draft } : alert,
        ),
      )
      setToast(`Đã cập nhật cảnh báo ${alertModal.alert.id}.`)
    } else {
      const nextNumber = 190 + alerts.length
      setAlerts((current) => [
        {
          id: `AL-0${nextNumber}`,
          ...draft,
          startedAt: "18:49",
          status: "active",
          createdBy: "Nguyễn Minh",
        },
        ...current,
      ])
      setToast("Cảnh báo mới đã được phát tới các kênh đã chọn.")
    }
    setAlertModal(null)
  }

  const endAlert = () => {
    if (!endingAlert) return
    setAlerts((current) =>
      current.map((alert) =>
        alert.id === endingAlert.id ? { ...alert, status: "ended" } : alert,
      ),
    )
    setToast(`Đã kết thúc cảnh báo ${endingAlert.id}.`)
    setEndingAlert(null)
  }

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null

  const exportUsers = () => {
    const statusLabel: Record<UserStatus, string> = {
      active: "Hoạt động",
      review: "Cần xem xét",
      blocked: "Đã khóa",
    }
    const header = [
      "Mã người dùng",
      "Họ tên",
      "Khu vực",
      "Báo cáo",
      "Đã xác minh",
      "Từ chối",
      "Điểm tin cậy",
      "Xác thực",
      "Trạng thái",
      "Hoạt động cuối",
    ]
    const rows = users.map((user) => [
      user.id,
      user.name,
      user.district,
      String(user.reports),
      String(user.verifiedReports),
      String(user.rejectedReports),
      String(user.trustScore),
      user.identityVerified ? "Đã xác thực" : "Chưa xác thực",
      statusLabel[user.status],
      user.lastActive,
    ])
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n")
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "saigondrain-nguoi-dung.csv"
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setToast("Đã xuất danh sách người dùng ra tệp CSV.")
  }

  const updateUserStatus = (status: UserStatus) => {
    if (!selectedUser) return
    setUsers((current) =>
      current.map((user) =>
        user.id === selectedUser.id ? { ...user, status } : user,
      ),
    )
    setToast(
      status === "blocked"
        ? `Đã khóa tài khoản ${selectedUser.id}.`
        : status === "review"
          ? `Đã chuyển ${selectedUser.id} vào danh sách xem xét.`
          : `Đã mở khóa tài khoản ${selectedUser.id}.`,
    )
    setSelectedUserId(null)
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeAlertCount={activeAlertCount}
        onNavigate={navigate}
        open={sidebarOpen}
        page={page}
        pendingCount={pendingCount}
        setOpen={setSidebarOpen}
      />
      <main className="main">
        <Topbar
          onCreateAlert={() => setAlertModal({ mode: "create" })}
          onExportUsers={exportUsers}
          onOpenMenu={() => setSidebarOpen(true)}
          page={page}
        />

        <div className="content">
          {page === "overview" && (
            <OverviewPage
              alerts={alerts}
              layers={layers}
              onEditAlert={(alert) => setAlertModal({ mode: "edit", alert })}
              onEndAlert={setEndingAlert}
              onNavigate={navigate}
              onReview={setReviewing}
              onSelectPoint={selectMapPoint}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              setTrendRange={setTrendRange}
              severityFilter={severityFilter}
              trendRange={trendRange}
            />
          )}
          {page === "map" && (
            <MapPage
              layers={layers}
              onSelectPoint={selectMapPoint}
              reports={reports}
              selectedMapPoint={selectedMapPoint}
              setLayers={setLayers}
              setSeverityFilter={setSeverityFilter}
              severityFilter={severityFilter}
            />
          )}
          {page === "reports" && (
            <ReportsPage onReview={setReviewing} reports={reports} />
          )}
          {page === "alerts" && (
            <AlertsPage
              alerts={alerts}
              onEdit={(alert) => setAlertModal({ mode: "edit", alert })}
              onEnd={setEndingAlert}
            />
          )}
          {page === "users" && (
            <UsersPage
              onSelect={(user) => setSelectedUserId(user.id)}
              users={users}
            />
          )}
          {page === "analytics" && (
            <AnalyticsPage
              alerts={alerts}
              reports={reports}
              setTrendRange={setTrendRange}
              trendRange={trendRange}
              users={users}
            />
          )}

          <footer className="page-footer">
            <span>SaigonDrain AI · Trung tâm điều hành đô thị thông minh</span>
            <span>Dữ liệu mô phỏng cho Hackathon 2025</span>
          </footer>
        </div>
      </main>

      {reviewing && (
        <ReportReviewModal
          report={reviewing}
          onClose={() => setReviewing(null)}
          onApprove={approveReport}
          onReject={() => {
            setRejecting(reviewing)
            setReviewing(null)
          }}
        />
      )}
      {rejecting && (
        <ConfirmDialog
          title="Từ chối báo cáo?"
          description="Báo cáo sẽ được loại khỏi hàng chờ và không dùng để cập nhật cảnh báo."
          confirmLabel="Xác nhận từ chối"
          onClose={() => setRejecting(null)}
          onConfirm={rejectReport}
          withReason
        />
      )}
      {alertModal && (
        <AlertModal
          initial={alertModal.alert}
          onClose={() => setAlertModal(null)}
          onSave={saveAlert}
        />
      )}
      {endingAlert && (
        <ConfirmDialog
          title="Kết thúc cảnh báo?"
          description={`${endingAlert.area} sẽ không còn hiển thị là khu vực đang cảnh báo.`}
          confirmLabel="Kết thúc cảnh báo"
          onClose={() => setEndingAlert(null)}
          onConfirm={endAlert}
        />
      )}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUserId(null)}
          onStatusChange={updateUserStatus}
        />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <IconButton label="Đóng thông báo" onClick={() => setToast(null)}>
            <X size={14} />
          </IconButton>
        </div>
      )}
    </div>
  )
}
