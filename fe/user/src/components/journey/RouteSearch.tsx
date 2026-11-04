import { useEffect, useRef, useState } from "react"
import Icon from "@/components/ui/Icon"
import { instantMatchHcmcPlaces, searchPlacesApi } from "@/lib/api"
import type { RouteEndpoint } from "@/types"

function RouteSearch({
  origin,
  destination,
  onSelectOrigin,
  onSelectDestination,
  onSwap,
}: {
  origin: RouteEndpoint | null
  destination: RouteEndpoint | null
  onSelectOrigin: (place: RouteEndpoint | null) => void
  onSelectDestination: (place: RouteEndpoint | null) => void
  onSwap: () => void
}) {
  const [originText, setOriginText] = useState(origin?.label ?? "")
  const [destText, setDestText] = useState(destination?.label ?? "")
  const [activeField, setActiveField] = useState<"origin" | "dest" | null>(null)
  const [suggestions, setSuggestions] = useState<RouteEndpoint[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const swappingRef = useRef(false)

  useEffect(() => {
    if (swappingRef.current) return
    setOriginText(origin?.label ?? "")
  }, [origin])

  useEffect(() => {
    if (swappingRef.current) return
    setDestText(destination?.label ?? "")
  }, [destination])

  const handleSwapClick = async () => {
    swappingRef.current = true
    const prevOriginText = originText
    const prevDestText = destText
    const prevOrigin = origin
    const prevDest = destination

    setOriginText(prevDestText)
    setDestText(prevOriginText)
    setSuggestions([])
    setHighlightIndex(-1)
    setActiveField(null)
    onSwap()

    window.setTimeout(() => {
      swappingRef.current = false
    }, 80)

    // Nếu người dùng mới gõ chữ mà chưa bấm chọn gợi ý, tự động phân giải địa điểm khi đảo chiều
    if (!prevDest && prevDestText.trim().length >= 2) {
      const res = await searchPlacesApi(prevDestText.trim())
      if (res.length > 0) {
        onSelectOrigin(res[0])
      }
    }
    if (!prevOrigin && prevOriginText.trim().length >= 2) {
      const res = await searchPlacesApi(prevOriginText.trim())
      if (res.length > 0) {
        onSelectDestination(res[0])
      }
    }
  }

  useEffect(() => {
    if (!activeField) {
      setSuggestions([])
      setLoading(false)
      return
    }
    const query = (activeField === "origin" ? originText : destText).trim()
    const committedLabel =
      activeField === "origin" ? origin?.label : destination?.label

    if (!query || query === committedLabel) {
      setSuggestions([])
      setLoading(false)
      setHighlightIndex(-1)
      return
    }

    // 1. Phản hồi tức thì (0ms) ngay từ ký tự đầu tiên bằng bộ chỉ mục địa danh & đường phố TP.HCM
    const instant = instantMatchHcmcPlaces(query)
    if (instant.length > 0) {
      setSuggestions(instant)
      setHighlightIndex(0)
      setLoading(false)
    } else {
      setLoading(query.length >= 2)
    }

    if (query.length < 2) {
      return
    }

    // 2. Truy vấn mở rộng địa chỉ/số nhà thực tế với debounce siêu ngắn (70ms) + AbortController
    const controller = new AbortController()
    let mounted = true
    const timer = window.setTimeout(async () => {
      const results = await searchPlacesApi(query, controller.signal)
      if (!mounted || controller.signal.aborted) return
      setSuggestions(results)
      setHighlightIndex(results.length > 0 ? 0 : -1)
      setLoading(false)
    }, 70)

    return () => {
      mounted = false
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [activeField, originText, destText, origin?.label, destination?.label])

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setActiveField(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const commitPlace = (
    place: RouteEndpoint,
    targetField?: "origin" | "dest",
  ) => {
    const field = targetField ?? activeField
    if (field === "origin") {
      setOriginText(place.label)
      onSelectOrigin(place)
    } else if (field === "dest") {
      setDestText(place.label)
      onSelectDestination(place)
    }
    setSuggestions([])
    setActiveField(null)
  }

  const handleKeyDown = async (
    ev: React.KeyboardEvent<HTMLInputElement>,
    field: "origin" | "dest",
  ) => {
    if (ev.key === "ArrowDown" && suggestions.length > 0) {
      ev.preventDefault()
      setHighlightIndex((prev) => (prev + 1) % suggestions.length)
      return
    }
    if (ev.key === "ArrowUp" && suggestions.length > 0) {
      ev.preventDefault()
      setHighlightIndex((prev) =>
        prev <= 0 ? suggestions.length - 1 : prev - 1,
      )
      return
    }
    if (ev.key === "Enter") {
      ev.preventDefault()
      const text = (field === "origin" ? originText : destText).trim()
      if (!text) {
        if (field === "origin") onSelectOrigin(null)
        else onSelectDestination(null)
        setActiveField(null)
        return
      }
      if (suggestions.length > 0) {
        const chosen =
          suggestions[highlightIndex >= 0 ? highlightIndex : 0] ??
          suggestions[0]
        commitPlace(chosen, field)
        return
      }
      const results = await searchPlacesApi(text)
      if (results.length > 0) {
        commitPlace(results[0], field)
      } else {
        setActiveField(null)
      }
    } else if (ev.key === "Escape") {
      setActiveField(null)
    }
  }

  const currentQuery = (
    activeField === "origin" ? originText : destText
  ).trim()

  return (
    <div
      aria-label="Tìm lộ trình điểm đi và điểm đến"
      className="route-search-wrap"
      ref={wrapRef}
    >
      <div className="route-search" role="group">
        <div aria-hidden="true" className="search-points">
          <span className="point-current" />
          <span className="point-line" />
          <span className="point-destination" />
        </div>
        <div className="search-values">
          <label className="search-value">
            <small>Điểm đi</small>
            <div className="search-input-row">
              <input
                aria-label="Nhập điểm đi"
                className="search-input"
                onChange={(e) => {
                  const val = e.target.value
                  setOriginText(val)
                  setActiveField("origin")
                  if (!val.trim()) onSelectOrigin(null)
                }}
                onFocus={() => setActiveField("origin")}
                onKeyDown={(e) => handleKeyDown(e, "origin")}
                placeholder="Nhập điểm đi (tên đường, địa chỉ, địa danh…)"
                type="text"
                value={originText}
              />
              {originText && (
                <button
                  aria-label="Xóa điểm đi"
                  className="search-clear-btn"
                  onClick={() => {
                    setOriginText("")
                    onSelectOrigin(null)
                    setSuggestions([])
                  }}
                  type="button"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </label>
          <span aria-hidden="true" className="search-divider" />
          <label className="search-value">
            <small>Điểm đến</small>
            <div className="search-input-row">
              <input
                aria-label="Nhập điểm đến"
                className="search-input"
                onChange={(e) => {
                  const val = e.target.value
                  setDestText(val)
                  setActiveField("dest")
                  if (!val.trim()) onSelectDestination(null)
                }}
                onFocus={() => setActiveField("dest")}
                onKeyDown={(e) => handleKeyDown(e, "dest")}
                placeholder="Nhập điểm đến (tên đường, địa chỉ, địa danh…)"
                type="text"
                value={destText}
              />
              {destText && (
                <button
                  aria-label="Xóa điểm đến"
                  className="search-clear-btn"
                  onClick={() => {
                    setDestText("")
                    onSelectDestination(null)
                    setSuggestions([])
                  }}
                  type="button"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </label>
        </div>
        <button
          aria-label="Đảo chiều điểm đi và điểm đến"
          className="swap-button"
          onClick={handleSwapClick}
          title="Đảo chiều điểm đi / điểm đến"
          type="button"
        >
          <Icon name="swap" size={20} />
        </button>
      </div>

      {activeField && currentQuery.length >= 1 && (loading || suggestions.length > 0) && (
        <ul
          aria-label="Gợi ý địa điểm thời gian thực tại TP.HCM"
          className="search-suggestions"
          role="listbox"
        >
          {loading && suggestions.length === 0 ? (
            <li className="suggestion-loading">
              <span>Đang tìm địa điểm "{currentQuery}" tại TP.HCM…</span>
            </li>
          ) : (
            suggestions.map((place, idx) => (
              <li key={`${place.label}-${place.coords.join(",")}`}>
                <button
                  className={`suggestion-item ${
                    idx === highlightIndex ? "is-highlighted" : ""
                  }`}
                  onClick={() => commitPlace(place)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  type="button"
                >
                  <Icon name="pin" size={16} />
                  <span className="suggestion-copy">
                    <strong>{place.label}</strong>
                    {place.address && <small>{place.address}</small>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default RouteSearch
