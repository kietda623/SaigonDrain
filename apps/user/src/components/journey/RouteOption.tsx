import Icon from "@/components/ui/Icon"
import { routes } from "@/data/mockData"
import type { RouteId } from "@/types"

function RouteOption({
  id,
  selected,
  onSelect,
}: {
  id: RouteId
  selected: boolean
  onSelect: (id: RouteId) => void
}) {
  const item = routes[id]

  return (
    <button
      aria-pressed={selected}
      className={`route-option ${id} ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect(id)}
      type="button"
    >
      <span className="route-radio">{selected && <span />}</span>
      <span className="route-info">
        <span className="route-title-row">
          <strong>{item.name}</strong>
          <span className="route-badge">{item.badge}</span>
        </span>
        <span className="route-meta">
          <span>
            <Icon name="clock" size={15} />
            {item.time}
          </span>
          <span>{item.distance}</span>
        </span>
      </span>
      <span aria-hidden="true" className={`route-swatch ${id}`} />
    </button>
  )
}

export default RouteOption
