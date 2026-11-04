import type {
  AreaAlertItem,
  CommunityUserProfile,
  ForecastSlot,
  MapFloodPoint,
  NavigationStep,
  ReportType,
  RouteEndpoint,
  RouteId,
  RouteItem,
  SavedRoutePair,
  Severity,
  WeatherSnapshot,
} from "@/types"

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api"

export const EMPTY_ROUTES: Record<RouteId, RouteItem> = {
  safe: {
    id: "safe",
    name: "Tuyến đề xuất",
    time: "—",
    distance: "—",
    badge: "Chờ nhập điểm",
    detail: "Vui lòng nhập Điểm đi và Điểm đến ở trên để tìm lộ trình an toàn.",
  },
  balanced: {
    id: "balanced",
    name: "Tuyến dự phòng",
    time: "—",
    distance: "—",
    badge: "Dự phòng",
    detail: "Lộ trình thay thế sẽ hiển thị sau khi bạn chọn Điểm đi và Điểm đến.",
  },
}

const FAST_HCMC_GAZETTEER: RouteEndpoint[] = [
  { label: "Chợ Bến Thành · Quận 1", address: "Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.698, 10.7725] },
  { label: "Landmark 81 · Bình Thạnh", address: "720A Điện Biên Phủ, Vinhomes Tân Cảng, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7218, 10.795] },
  { label: "Đường Lê Lợi · Quận 1", address: "Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.7001, 10.7738] },
  { label: "Đường Lê Văn Lương · Quận 7", address: "Đường Lê Văn Lương, Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh", district: "Quận 7", coords: [106.7021, 10.7315] },
  { label: "Đường Lê Văn Sỹ · Quận 3", address: "Đường Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh", district: "Quận 3", coords: [106.6785, 10.7892] },
  { label: "Đường Lê Thánh Tôn · Quận 1", address: "Đường Lê Thánh Tôn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.7015, 10.7772] },
  { label: "Đường Lê Đại Hành · Quận 11", address: "Đường Lê Đại Hành, Phường 15, Quận 11, TP. Hồ Chí Minh", district: "Quận 11", coords: [106.6582, 10.7641] },
  { label: "Đường Lê Quang Định · Bình Thạnh", address: "Đường Lê Quang Định, Phường 14, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.6945, 10.8085] },
  { label: "Đường Lạc Long Quân · Tân Bình", address: "Đường Lạc Long Quân, Phường 10, Tân Bình, TP. Hồ Chí Minh", district: "Tân Bình", coords: [106.6478, 10.7795] },
  { label: "Đường Lý Tự Trọng · Quận 1", address: "Đường Lý Tự Trọng, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.6992, 10.7758] },
  { label: "Đường Lý Thường Kiệt · Quận 10", address: "Đường Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh", district: "Quận 10", coords: [106.6579, 10.7721] },
  { label: "Đường Nguyễn Hữu Cảnh · Bình Thạnh", address: "Đường Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7185, 10.7934] },
  { label: "Phố đi bộ Nguyễn Huệ · Quận 1", address: "Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.7035, 10.7745] },
  { label: "Đường Nguyễn Thị Minh Khai · Quận 3", address: "Đường Nguyễn Thị Minh Khai, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh", district: "Quận 3", coords: [106.6912, 10.7768] },
  { label: "Đường Nguyễn Văn Linh · Quận 7", address: "Đại lộ Nguyễn Văn Linh, Phường Tân Phong, Quận 7, TP. Hồ Chí Minh", district: "Quận 7", coords: [106.7085, 10.7292] },
  { label: "Đường Nguyễn Văn Cừ · Quận 5", address: "Đường Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh", district: "Quận 5", coords: [106.6825, 10.7612] },
  { label: "Đường Nguyễn Văn Quá · Quận 12", address: "Đường Nguyễn Văn Quá, Phường Đông Hưng Thuận, Quận 12, TP. Hồ Chí Minh", district: "Quận 12", coords: [106.6304, 10.8381] },
  { label: "Đường Quốc Hương · Thảo Điền", address: "Đường Quốc Hương, Phường Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh", district: "TP. Thủ Đức", coords: [106.7329, 10.8038] },
  { label: "Đường Huỳnh Tấn Phát · Quận 7", address: "Đường Huỳnh Tấn Phát, Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh", district: "Quận 7", coords: [106.7315, 10.734] },
  { label: "Đường Phan Huy Ích · Gò Vấp", address: "Đường Phan Huy Ích, Phường 14, Gò Vấp, TP. Hồ Chí Minh", district: "Gò Vấp", coords: [106.6341, 10.8336] },
  { label: "Đường Kinh Dương Vương · Bình Tân", address: "Đường Kinh Dương Vương, Phường An Lạc, Bình Tân, TP. Hồ Chí Minh", district: "Bình Tân", coords: [106.6188, 10.7422] },
  { label: "Đường Võ Văn Kiệt · Quận 1", address: "Đại lộ Võ Văn Kiệt, Phường Cầu Kho, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.6915, 10.7618] },
  { label: "Đường Võ Chí Công · TP. Thủ Đức", address: "Đường Võ Chí Công, Phường Phú Hữu, TP. Thủ Đức, TP. Hồ Chí Minh", district: "TP. Thủ Đức", coords: [106.7912, 10.8012] },
  { label: "Đường Điện Biên Phủ · Bình Thạnh", address: "Đường Điện Biên Phủ, Phường 25, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7115, 10.8012] },
  { label: "Đường Cách Mạng Tháng Tám · Quận 3", address: "Đường Cách Mạng Tháng Tám, Phường 11, Quận 3, TP. Hồ Chí Minh", district: "Quận 3", coords: [106.6745, 10.7815] },
  { label: "Đường Cộng Hòa · Tân Bình", address: "Đường Cộng Hòa, Phường 13, Tân Bình, TP. Hồ Chí Minh", district: "Tân Bình", coords: [106.6485, 10.8015] },
  { label: "Đường Phạm Văn Đồng · Gò Vấp", address: "Đại lộ Phạm Văn Đồng, Phường 3, Gò Vấp, TP. Hồ Chí Minh", district: "Gò Vấp", coords: [106.6918, 10.8215] },
  { label: "Đường Xa lộ Hà Nội · TP. Thủ Đức", address: "Đường Võ Nguyên Giáp (Xa lộ Hà Nội), TP. Thủ Đức, TP. Hồ Chí Minh", district: "TP. Thủ Đức", coords: [106.7585, 10.8255] },
  { label: "Đường Trường Chinh · Tân Bình", address: "Đường Trường Chinh, Phường 15, Tân Bình, TP. Hồ Chí Minh", district: "Tân Bình", coords: [106.6345, 10.8125] },
  { label: "Đường Hoàng Sa · Quận 3", address: "Đường Hoàng Sa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh", district: "Quận 3", coords: [106.6845, 10.7885] },
  { label: "Đường Trường Sa · Phú Nhuận", address: "Đường Trường Sa, Phường 2, Phú Nhuận, TP. Hồ Chí Minh", district: "Phú Nhuận", coords: [106.6865, 10.7935] },
  { label: "Đường Trần Hưng Đạo · Quận 5", address: "Đường Trần Hưng Đạo, Phường 7, Quận 5, TP. Hồ Chí Minh", district: "Quận 5", coords: [106.6765, 10.7555] },
  { label: "Đường Hai Bà Trưng · Quận 1", address: "Đường Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.6955, 10.7865] },
  { label: "Đường Nam Kỳ Khởi Nghĩa · Quận 3", address: "Đường Nam Kỳ Khởi Nghĩa, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh", district: "Quận 3", coords: [106.6875, 10.7855] },
  { label: "Đường Pasteur · Quận 1", address: "Đường Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.6985, 10.7785] },
  { label: "Đường Xô Viết Nghệ Tĩnh · Bình Thạnh", address: "Đường Xô Viết Nghệ Tĩnh, Phường 21, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7105, 10.8025] },
  { label: "Đường Đinh Bộ Lĩnh · Bình Thạnh", address: "Đường Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7095, 10.8115] },
  { label: "Đường Ung Văn Khiêm · Bình Thạnh", address: "Đường Ung Văn Khiêm, Phường 25, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7215, 10.8045] },
  { label: "Sân bay Tân Sơn Nhất · Tân Bình", address: "Đường Trường Sơn, Phường 2, Tân Bình, TP. Hồ Chí Minh", district: "Tân Bình", coords: [106.6588, 10.8185] },
  { label: "Bến xe Miền Đông · Bình Thạnh", address: "292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh, TP. Hồ Chí Minh", district: "Bình Thạnh", coords: [106.7112, 10.8142] },
  { label: "Bến xe Miền Tây · Bình Tân", address: "395 Kinh Dương Vương, Phường An Lạc, Bình Tân, TP. Hồ Chí Minh", district: "Bình Tân", coords: [106.6192, 10.7412] },
  { label: "Dinh Độc Lập · Quận 1", address: "135 Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.6953, 10.7769] },
  { label: "Nhà thờ Đức Bà · Quận 1", address: "01 Công xã Paris, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.699, 10.7798] },
  { label: "Đại học Bách Khoa TP.HCM · Quận 10", address: "268 Lý Thường Kiệt, Phường 14, Quận 10, TP. Hồ Chí Minh", district: "Quận 10", coords: [106.6579, 10.7721] },
  { label: "Đại học Quốc gia TP.HCM · TP. Thủ Đức", address: "Khu đô thị ĐHQG, Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh", district: "TP. Thủ Đức", coords: [106.8032, 10.8702] },
  { label: "Bệnh viện Chợ Rẫy · Quận 5", address: "201B Nguyễn Chí Thanh, Phường 12, Quận 5, TP. Hồ Chí Minh", district: "Quận 5", coords: [106.6595, 10.7575] },
  { label: "Bitexco Financial Tower · Quận 1", address: "02 Hải Triều, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh", district: "Quận 1", coords: [106.7044, 10.7717] },
  { label: "Crescent Mall Phú Mỹ Hưng · Quận 7", address: "101 Tôn Dật Tiên, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh", district: "Quận 7", coords: [106.7188, 10.7289] },
]

function normalizeVn(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim()
}

function getWordInitials(text: string): string {
  return normalizeVn(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "duong" && w !== "quan" && w !== "tp")
    .map((w) => w[0])
    .join("")
}

/**
 * Trả kết quả khớp tức thì (< 1ms) ngay khi người dùng gõ phím
 */
export function instantMatchHcmcPlaces(query: string): RouteEndpoint[] {
  const clean = query.trim()
  if (!clean) return []
  const normQ = normalizeVn(clean)

  const scored: Array<{ place: RouteEndpoint; score: number }> = []
  for (const place of FAST_HCMC_GAZETTEER) {
    const normLabel = normalizeVn(place.label)
    const normAddr = normalizeVn(place.address ?? "")
    const initials = getWordInitials(place.label)

    let score = 0
    if (normLabel.startsWith(normQ)) score = 100
    else if (normLabel.includes(` ${normQ}`)) score = 85
    else if (initials.startsWith(normQ)) score = 75
    else if (normLabel.includes(normQ)) score = 65
    else if (normAddr.includes(normQ)) score = 45

    if (score > 0) {
      scored.push({ place, score })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.place)
}

const placeSearchCache = new Map<string, RouteEndpoint[]>()

/**
 * Tìm kiếm địa điểm / đường phố thời gian thực tại TP.HCM giống Google Maps
 * Kết hợp bộ khớp tức thì (< 1ms) + Cache bộ nhớ + ArcGIS World Geocoder tốc độ cao
 */
export async function searchPlacesApi(
  query: string,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  const clean = query.trim()
  if (!clean) {
    return []
  }

  const cacheKey = normalizeVn(clean)
  const cached = placeSearchCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const results: RouteEndpoint[] = [...instantMatchHcmcPlaces(clean)]
  if (clean.length < 2) {
    return results
  }

  // Gọi trực tiếp song song ArcGIS CDN (phản hồi ~150ms) và Backend API, lấy nguồn nào trả về trước
  const arcgisDirectPromise = (async (): Promise<RouteEndpoint[]> => {
    try {
      const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(clean + ", Hồ Chí Minh")}&f=json&countryCode=VNM&location=106.7009,10.7769&searchExtent=106.35,10.35,107.05,11.16&outFields=PlaceName,Place_addr,StAddr,Nbrhd,District,City,Subregion&maxLocations=6`
      const arcgisRes = await fetch(arcgisUrl, { signal })
      if (!arcgisRes.ok) return []
      const arcgisData = await arcgisRes.json()
      const candidates = Array.isArray(arcgisData?.candidates)
        ? arcgisData.candidates
        : []
      const out: RouteEndpoint[] = []
      for (const c of candidates) {
        const lat = c?.location?.y
        const lng = c?.location?.x
        if (typeof lat !== "number" || typeof lng !== "number") continue
        const attrs = c?.attributes ?? {}
        const mainName =
          attrs.PlaceName ||
          attrs.StAddr ||
          c.address?.split(",")[0] ||
          clean
        const district =
          attrs.District ||
          attrs.Subregion ||
          attrs.Nbrhd ||
          attrs.City ||
          "TP.HCM"
        const fullAddress =
          attrs.Place_addr || c.address || `${mainName}, ${district}`
        const label =
          district && !mainName.toLowerCase().includes(district.toLowerCase())
            ? `${mainName} · ${district}`
            : mainName
        out.push({
          label,
          address: fullAddress,
          district,
          coords: [lng, lat],
        })
      }
      return out
    } catch {
      return []
    }
  })()

  const backendPromise = (async (): Promise<RouteEndpoint[]> => {
    try {
      const res = await fetch(
        `${API_BASE}/map/geocode/search?q=${encodeURIComponent(clean)}`,
        { signal },
      )
      if (!res.ok) return []
      const data = await res.json()
      if (!Array.isArray(data)) return []
      const out: RouteEndpoint[] = []
      for (const item of data) {
        if (typeof item?.lat !== "number" || typeof item?.lng !== "number")
          continue
        const name = (item.name || clean).trim()
        const district = (item.district || "TP. Hồ Chí Minh").trim()
        const address = (
          item.address ||
          (district ? `${name}, ${district}` : name)
        ).trim()
        const label =
          district && !name.toLowerCase().includes(district.toLowerCase())
            ? `${name} · ${district}`
            : name
        out.push({
          label,
          address,
          district,
          coords: [item.lng, item.lat],
        })
      }
      return out
    } catch {
      return []
    }
  })()

  // Ưu tiên nguồn trả về nhanh nhất (ArcGIS CDN thường chỉ mất ~140-180ms)
  const firstFastBatch = await Promise.race([
    arcgisDirectPromise,
    backendPromise,
  ])
  const remoteBatch =
    firstFastBatch.length > 0
      ? firstFastBatch
      : (await Promise.all([arcgisDirectPromise, backendPromise])).flat()

  for (const item of remoteBatch) {
    if (
      !results.some(
        (r) => normalizeVn(r.label) === normalizeVn(item.label),
      )
    ) {
      results.push(item)
    }
  }

  const finalResults = results.slice(0, 7)
  if (finalResults.length > 0) {
    placeSearchCache.set(cacheKey, finalResults)
  }
  return finalResults
}

export async function fetchMapPointsApi(): Promise<MapFloodPoint[]> {
  try {
    const res = await fetch(`${API_BASE}/map/points`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? (data as MapFloodPoint[]) : []
  } catch {
    return []
  }
}

export async function fetchCurrentWeather(): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/current`)
    if (!res.ok) return null
    return (await res.json()) as WeatherSnapshot
  } catch {
    return null
  }
}

export async function syncWeatherForecasts(): Promise<ForecastSlot[] | null> {
  try {
    const res = await fetch(`${API_BASE}/weather/sync-forecasts`, {
      method: "POST",
    })
    if (!res.ok) return null
    const data = await res.json()
    return Array.isArray(data?.slots) ? (data.slots as ForecastSlot[]) : null
  } catch {
    return null
  }
}

export async function fetchForecastSlots(): Promise<{
  slots: ForecastSlot[]
  live: boolean
}> {
  try {
    const res = await fetch(`${API_BASE}/journey/forecasts`)
    if (!res.ok) throw new Error("Failed to fetch forecasts")
    const data = (await res.json()) as ForecastSlot[]
    if (Array.isArray(data)) {
      return { slots: data, live: true }
    }
  } catch {
    // ignore
  }
  return { slots: [], live: false }
}

export async function fetchJourneyRoutes(
  originCoords: [number, number],
  destCoords: [number, number],
): Promise<{
  routes: Record<RouteId, RouteItem>
  navigationSteps: NavigationStep[]
  live: boolean
}> {
  try {
    const query = `fromLat=${originCoords[1]}&fromLng=${originCoords[0]}&toLat=${destCoords[1]}&toLng=${destCoords[0]}`
    const computeRes = await fetch(`${API_BASE}/journey/compute-route?${query}`)
    if (computeRes.ok) {
      const computed = await computeRes.json()
      if (
        computed?.provider !== "database-fallback" &&
        Array.isArray(computed?.safeRoute?.coordinates) &&
        computed.safeRoute.coordinates.length > 2
      ) {
        return {
          routes: {
            safe: computed.safeRoute,
            balanced: computed.balancedRoute ?? computed.safeRoute,
          },
          navigationSteps: computed.safeRoute.navigationSteps ?? [],
          live: true,
        }
      }
    }
  } catch {
    // fallback to browser OSRM
  }

  // Dự phòng trực tiếp OSRM từ trình duyệt khi Backend timeout / fallback
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?steps=true&geometries=geojson&overview=full`
    const res = await fetch(osrmUrl)
    if (res.ok) {
      const data = await res.json()
      const primaryRoute = data?.routes?.[0]
      if (primaryRoute) {
        const durationMinutes = Math.max(
          1,
          Math.round((primaryRoute.duration ?? 600) / 60),
        )
        const distanceKm = ((primaryRoute.distance ?? 3000) / 1000)
          .toFixed(1)
          .replace(".", ",")
        const rawSteps: any[] = primaryRoute.legs?.[0]?.steps ?? []
        const steps: NavigationStep[] = rawSteps
          .filter((s) => s.name || s.distance > 30)
          .slice(0, 7)
          .map((s) => {
            const modifier: string = s.maneuver?.modifier || ""
            const icon = modifier.includes("left")
              ? "turn-left"
              : modifier.includes("right")
                ? "turn-right"
                : "straight"
            const instruction =
              icon === "turn-left"
                ? "Rẽ trái vào"
                : icon === "turn-right"
                  ? "Rẽ phải vào"
                  : "Đi theo"
            return {
              icon,
              instruction,
              street: s.name || "Trục đường chính",
              distance: `${Math.max(50, Math.round(s.distance ?? 100))} m`,
            }
          })

        const safeRoute: RouteItem = {
          id: "safe",
          name: "Tuyến đề xuất",
          time: `${durationMinutes} phút`,
          distance: `${distanceKm} km`,
          badge: "Nhanh nhất",
          detail: `Lộ trình theo các trục đường thực tế (${distanceKm} km, khoảng ${durationMinutes} phút di chuyển).`,
          coordinates: primaryRoute.geometry?.coordinates,
        }

        return {
          routes: {
            safe: safeRoute,
            balanced: {
              ...safeRoute,
              id: "balanced",
              name: "Tuyến dự phòng",
              badge: "Dự phòng",
            },
          },
          navigationSteps: steps,
          live: true,
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    routes: {
      safe: { ...EMPTY_ROUTES.safe },
      balanced: { ...EMPTY_ROUTES.balanced },
    },
    navigationSteps: [],
    live: false,
  }
}

export async function createCitizenReport(payload: {
  reportType: ReportType
  severity: Severity
  photoUrl?: string
  location?: string
  district?: string
  description?: string
  reportedDepth?: number
  lat?: number
  lng?: number
  reporterId?: string
}): Promise<{ id: string; aiDepth?: number; aiConfidence?: number } | null> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function reverseGeocodeApi(
  lat: number,
  lng: number,
): Promise<{ location: string; district: string; coords: [number, number] }> {
  try {
    const res = await fetch(
      `${API_BASE}/map/geocode/reverse?lat=${lat}&lng=${lng}`,
    )
    if (res.ok) {
      const data = await res.json()
      return {
        location: data?.location || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        district: data?.district || "TP.HCM",
        coords: [lng, lat],
      }
    }
  } catch {
    // ignore
  }
  return {
    location: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    district: "TP.HCM",
    coords: [lng, lat],
  }
}

export async function fetchActiveAlertsApi(): Promise<AreaAlertItem[]> {
  try {
    const res = await fetch(`${API_BASE}/alerts`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data)
      ? (data as AreaAlertItem[]).filter((a) => a.status === "active")
      : []
  } catch {
    return []
  }
}

const SAVED_ROUTES_KEY = "saigondrain_saved_routes"

export function getSavedRoutes(): SavedRoutePair[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(SAVED_ROUTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as SavedRoutePair[]) : []
  } catch {
    return []
  }
}

export function saveRoutePair(
  origin: RouteEndpoint,
  destination: RouteEndpoint,
): SavedRoutePair[] {
  const current = getSavedRoutes()
  const name = `${origin.label.split("·")[0].trim()} → ${destination.label.split("·")[0].trim()}`
  const exists = current.some(
    (item) =>
      item.origin.label === origin.label &&
      item.destination.label === destination.label,
  )
  if (exists) return current
  const next: SavedRoutePair[] = [
    {
      id: `sr-${Date.now()}`,
      name,
      origin,
      destination,
    },
    ...current,
  ].slice(0, 6)
  try {
    window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

export function removeSavedRoutePair(id: string): SavedRoutePair[] {
  const next = getSavedRoutes().filter((item) => item.id !== id)
  try {
    window.localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
  return next
}

const AUTH_STORAGE_KEY = "saigondrain_auth_user"
const TOKEN_STORAGE_KEY = "saigondrain_auth_token"

export function getSavedAuthUser(): CommunityUserProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CommunityUserProfile
  } catch {
    return null
  }
}

export function saveAuthSession(
  user: CommunityUserProfile,
  token?: string,
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // ignore storage errors
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

export async function registerUserApi(payload: {
  name: string
  phone: string
  email: string
  district: string
  password: string
}): Promise<{
  ok: boolean
  message: string
  user?: CommunityUserProfile
  token?: string
}> {
  try {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message || "Đăng ký không thành công."
      return { ok: false, message: msg }
    }
    return {
      ok: true,
      message:
        data?.message ||
        "Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.",
      user: data.user as CommunityUserProfile,
      token: data.token,
    }
  } catch {
    return {
      ok: false,
      message: "Không thể kết nối máy chủ Backend để đăng ký.",
    }
  }
}

export async function loginUserApi(payload: {
  identifier: string
  password: string
}): Promise<{
  ok: boolean
  message: string
  user?: CommunityUserProfile
  token?: string
}> {
  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message || "Thông tin đăng nhập không chính xác."
      return { ok: false, message: msg }
    }
    if (data?.user) {
      saveAuthSession(data.user as CommunityUserProfile, data.token)
    }
    return {
      ok: true,
      message: data?.message || "Đăng nhập thành công!",
      user: data.user as CommunityUserProfile,
      token: data.token,
    }
  } catch {
    return {
      ok: false,
      message: "Không thể kết nối máy chủ Backend để đăng nhập.",
    }
  }
}

export function subscribeUserRealtime(handlers: {
  onWeatherUpdated?: (data: {
    snapshot?: WeatherSnapshot
    slots?: ForecastSlot[]
  }) => void
  onRouteRecomputeNeeded?: () => void
  onAlertsChanged?: () => void
}): () => void {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => undefined
  }

  const es = new EventSource(`${API_BASE}/realtime/stream`)

  es.addEventListener("weather.updated", (ev: MessageEvent) => {
    try {
      const parsed = JSON.parse(ev.data)
      if (parsed?.data) handlers.onWeatherUpdated?.(parsed.data)
    } catch {
      // ignore parse errors
    }
  })

  for (const evt of ["report.approved", "alert.created", "alert.ended"]) {
    es.addEventListener(evt, () => {
      handlers.onRouteRecomputeNeeded?.()
    })
  }

  for (const evt of ["alert.created", "alert.updated", "alert.ended"]) {
    es.addEventListener(evt, () => {
      handlers.onAlertsChanged?.()
    })
  }

  return () => {
    es.close()
  }
}
