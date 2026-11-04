import Brand from "@/components/layout/Brand"
import Icon from "@/components/ui/Icon"

function TopBar() {
  return (
    <header className="top-bar">
      <Brand />
      <div className="top-bar-status">
        <span className="tracking-status">
          <i />
          Đang theo dõi TP.HCM
        </span>
        <span className="weather-chip">
          <Icon name="rain" size={16} />
          Mưa lớn · 27°C
        </span>
      </div>
      <div className="top-bar-actions">
        <button
          aria-label="Trợ giúp sử dụng bản đồ"
          className="icon-button header-action"
          type="button"
        >
          <Icon name="help" size={20} />
        </button>
        <button
          aria-label="Thông báo, có 2 cảnh báo mới"
          className="icon-button header-action has-dot"
          type="button"
        >
          <Icon name="bell" size={20} />
          <span aria-hidden="true" className="notification-dot" />
        </button>
        <button aria-label="Mở tài khoản" className="user-button" type="button">
          <Icon name="user" size={19} />
        </button>
      </div>
    </header>
  )
}

export default TopBar
