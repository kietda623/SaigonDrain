import Icon from "@/components/ui/Icon"

function RouteSearch() {
  return (
    <div aria-label="Tuyến đường đang xem" className="route-search" role="group">
      <div aria-hidden="true" className="search-points">
        <span className="point-current" />
        <span className="point-line" />
        <span className="point-destination" />
      </div>
      <div className="search-values">
        <div className="search-value">
          <small>Điểm đi</small>
          <strong>Cơ sở 1 · ĐH Sài Gòn</strong>
        </div>
        <span aria-hidden="true" className="search-divider" />
        <div className="search-value">
          <small>Điểm đến</small>
          <strong>Cơ sở chính · ĐH Sài Gòn</strong>
        </div>
      </div>
      <span aria-hidden="true" className="swap-button">
        <Icon name="swap" size={20} />
      </span>
    </div>
  )
}

export default RouteSearch
