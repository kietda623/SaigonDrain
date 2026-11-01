import type { FloodReport } from "@/types"

function ReportVisual({
  type,
  large = false,
}: {
  type: FloodReport["visual"]
  large?: boolean
}) {
  return (
    <div
      className={`report-visual visual-${type} ${large ? "large" : ""}`}
      aria-label="Ảnh hiện trường mô phỏng"
      role="img"
    >
      <span className="visual-sky" />
      <span className="visual-road" />
      <span className="visual-water" />
      <span className="visual-building one" />
      <span className="visual-building two" />
      <span className="visual-car" />
      {type === "drain" && <span className="visual-drain-mouth" />}
      <span className="visual-time">
        ẢNH HIỆN TRƯỜNG · 18:
        {type === "traffic" ? "42" : type === "drain" ? "38" : "31"}
      </span>
    </div>
  )
}


export default ReportVisual
