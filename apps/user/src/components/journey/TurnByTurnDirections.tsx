import Icon from "@/components/ui/Icon"
import { navigationSteps } from "@/data/mockData"

function TurnByTurnDirections() {
  return (
    <div className="directions-section">
      <div className="directions-heading">
        <div>
          <h2>Chỉ đường từng bước</h2>
          <p>6 chặng · 3,4 km · đến nơi khoảng 17:42</p>
        </div>
        <Icon name="route" size={22} />
      </div>
      <div className="directions-list">
        {navigationSteps.map((step, index) => (
          <div className="direction-step" key={step.street}>
            <div className="direction-rail">
              <span className={index === 0 ? "is-current" : ""}>
                <Icon name={step.icon} size={17} />
              </span>
              {index < navigationSteps.length - 1 && <i />}
            </div>
            <div className="direction-copy">
              <small>{step.instruction}</small>
              <strong>{step.street}</strong>
            </div>
            <span className="direction-distance">{step.distance}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TurnByTurnDirections
