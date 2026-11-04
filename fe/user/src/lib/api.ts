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

const placeSearchCache = new Map<string, RouteEndpoint[]>()
const dynamicPlacePool: RouteEndpoint[] = []
const dynamicPlaceKeys = new Set<string>()
let engineWarmed = false

function registerDynamicPlaces(items: RouteEndpoint[]) {
  for (const item of items) {
    if (!item?.label || !Array.isArray(item.coords)) continue
    const norm = normalizeVn(item.label)
    if (
      norm === "ho chi minh" ||
      norm === "tp ho chi minh" ||
      norm === "thanh pho ho chi minh" ||
      norm === "tp.hcm"
    ) {
      continue
    }
    const key = `${norm}_${item.coords[0].toFixed(3)}_${item.coords[1].toFixed(3)}`
    if (!dynamicPlaceKeys.has(key)) {
      dynamicPlaceKeys.add(key)
      dynamicPlacePool.push(item)
    }
  }
}

/**
 * Chấm điểm độ khớp thực tế giữa từ khóa người dùng gõ và địa điểm trả về
 * Loại bỏ các kết quả nhiễu không liên quan (ví dụ gõ "trường đại học" nhưng API trả "Đường Trần Não")
 */
function scorePlaceMatch(query: string, place: RouteEndpoint): number {
  const normQ = normalizeVn(query)
  if (!normQ) return 0
  const normLabel = normalizeVn(place.label)
  const normAddr = normalizeVn(place.address ?? "")
  const combined = `${normLabel} ${normAddr}`
  const initials = getWordInitials(place.label)

  if (normLabel.startsWith(normQ)) return 100
  if (normLabel.includes(` ${normQ}`)) return 92
  if (normLabel.includes(normQ)) return 85
  if (initials.startsWith(normQ)) return 78
  if (normAddr.includes(normQ)) return 65

  // Kiểm tra độ khớp theo từng từ (token matching)
  const stopWords = new Set(["duong", "pho", "quan", "phuong", "tp", "hcm"])
  const qWords = normQ
    .split(/\s+/)
    .filter((w) => w.length > 0 && !stopWords.has(w))
  if (qWords.length === 0) return 0

  let matchedWords = 0
  for (const w of qWords) {
    if (combined.includes(w)) {
      matchedWords += 1
    }
  }

  // Nếu gõ từ 2 từ trở lên (VD: "trường đại học"), ít nhất 60% số từ phải xuất hiện trong tên/địa chỉ
  const ratio = matchedWords / qWords.length
  if (qWords.length >= 2 && ratio >= 0.6) {
    return Math.round(50 + ratio * 30)
  }
  if (qWords.length === 1 && matchedWords === 1) {
    return 55
  }
  return 0
}

/**
 * Lọc tức thì (< 1ms) từ tập dữ liệu thật đã tải động từ PostgreSQL & Bản đồ trực tuyến
 */
export function matchDynamicPlacePool(query: string): RouteEndpoint[] {
  const clean = query.trim()
  if (!clean) return []
  const normQ = normalizeVn(clean)
  if (!normQ) return []

  const exactCached = placeSearchCache.get(normQ)
  if (exactCached && exactCached.length > 0) {
    return exactCached
  }

  const scored: Array<{ place: RouteEndpoint; score: number }> = []
  for (const place of dynamicPlacePool) {
    const score = scorePlaceMatch(clean, place)
    if (score > 0) {
      scored.push({ place, score })
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.place)
}

/**
 * Tự động ánh xạ các nhóm danh mục tiếng Việt tự nhiên (quán ăn, quán nước, trung tâm thương mại, rạp phim, siêu thị...)
 * sang từ khóa chuẩn của OpenStreetMap & ArcGIS POI để tìm được mọi địa điểm thực tế tại TP.HCM
 */
function buildSmartSearchQueries(keyword: string): {
  arcgisQuery: string
  arcgisCategory: string
  nominatimQuery: string
  isCategorySearch: boolean
} {
  const norm = normalizeVn(keyword)
  if (
    norm.includes("quan nuoc") ||
    norm.includes("ca phe") ||
    norm.includes("cafe") ||
    norm.includes("coffee") ||
    norm.includes("tra sua")
  ) {
    return {
      arcgisQuery:
        norm === "quan nuoc" || norm === "quan ca phe" ? "Coffee" : keyword,
      arcgisCategory: "Coffee Shop,Food",
      nominatimQuery:
        norm === "quan nuoc" || norm === "quan ca phe"
          ? "cafe, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (
    norm.includes("quan an") ||
    norm.includes("nha hang") ||
    norm.includes("an uong") ||
    norm.includes("com tam") ||
    norm.includes("pho ") ||
    norm.includes("bun ") ||
    norm.includes("lau ")
  ) {
    return {
      arcgisQuery:
        norm === "quan an" || norm === "nha hang" ? "Nhà hàng" : keyword,
      arcgisCategory: "Food",
      nominatimQuery:
        norm === "quan an" || norm === "nha hang"
          ? "restaurant, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (
    norm.includes("trung tam thuong mai") ||
    norm.includes("tttm") ||
    norm.includes("mall") ||
    norm.includes("vincom") ||
    norm.includes("aeon") ||
    norm.includes("takashimaya")
  ) {
    return {
      arcgisQuery:
        norm.includes("trung tam thuong mai") || norm === "tttm"
          ? "Mall"
          : keyword,
      arcgisCategory: "Shopping Center,Shops and Service",
      nominatimQuery:
        norm.includes("trung tam thuong mai") || norm === "tttm"
          ? "mall, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (norm.includes("sieu thi") || norm.includes("bach hoa")) {
    return {
      arcgisQuery: norm === "sieu thi" ? "Co.opmart" : keyword,
      arcgisCategory: "Food and Drink,Shops and Service",
      nominatimQuery:
        norm === "sieu thi"
          ? "supermarket, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (norm.includes("rap chieu phim") || norm.includes("rap phim") || norm.includes("cgv")) {
    return {
      arcgisQuery:
        norm.includes("rap chieu phim") || norm === "rap phim"
          ? "Cinema"
          : keyword,
      arcgisCategory: "Cinema,Arts and Entertainment",
      nominatimQuery:
        norm.includes("rap chieu phim") || norm === "rap phim"
          ? "cinema, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (norm.includes("truong dai hoc") || norm.includes("dai hoc")) {
    const sub = keyword.replace(/^[Tt]rường\s+/u, "").trim()
    return {
      arcgisQuery: sub || "Đại học",
      arcgisCategory: "College and University,Education",
      nominatimQuery:
        norm === "truong dai hoc" || norm === "dai hoc"
          ? "university, Hồ Chí Minh"
          : `${sub}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (norm.includes("benh vien") || norm.includes("phong kham")) {
    return {
      arcgisQuery: keyword,
      arcgisCategory: "Hospital,Medical",
      nominatimQuery:
        norm === "benh vien"
          ? "hospital, Hồ Chí Minh"
          : `${keyword}, Hồ Chí Minh`,
      isCategorySearch: true,
    }
  }
  if (norm.includes("cay xang") || norm.includes("tram xang")) {
    return {
      arcgisQuery: "Petrolimex",
      arcgisCategory: "Gas Station",
      nominatimQuery: "fuel, Hồ Chí Minh",
      isCategorySearch: true,
    }
  }
  return {
    arcgisQuery: keyword,
    arcgisCategory: "",
    nominatimQuery: `${keyword}, Hồ Chí Minh`,
    isCategorySearch: false,
  }
}

async function fetchArcgisCandidates(
  keyword: string,
  maxLocations = 8,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  try {
    const { arcgisQuery, arcgisCategory, isCategorySearch } =
      buildSmartSearchQueries(keyword)
    const categoryParam = arcgisCategory
      ? `&category=${encodeURIComponent(arcgisCategory)}`
      : ""
    // Không nối ", Hồ Chí Minh" vào SingleLine vì searchExtent đã khóa cứng tọa độ TP.HCM (tránh lỗi hiểu nhầm POI thành tên đường)
    const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${encodeURIComponent(arcgisQuery)}${categoryParam}&f=json&countryCode=VNM&location=106.7009,10.7769&searchExtent=106.35,10.35,107.05,11.16&outFields=PlaceName,Place_addr,StAddr,Nbrhd,District,City,Subregion,Addr_type,Type&maxLocations=${maxLocations}`
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
      const addrType = String(attrs.Addr_type || "")
      if (addrType === "Locality" || addrType === "Admin") continue

      const mainName = (
        attrs.PlaceName ||
        attrs.StAddr ||
        c.address?.split(",")[0] ||
        ""
      ).trim()
      if (!mainName) continue
      const normMain = normalizeVn(mainName)
      if (
        normMain === "ho chi minh" ||
        normMain === "thanh pho ho chi minh" ||
        normMain === "viet nam"
      ) {
        continue
      }
      const district = (
        attrs.District ||
        attrs.Subregion ||
        attrs.Nbrhd ||
        attrs.City ||
        "TP.HCM"
      ).trim()
      const fullAddress =
        attrs.Place_addr || c.address || `${mainName}, ${district}`
      const label =
        district && !normMain.includes(normalizeVn(district))
          ? `${mainName} · ${district}`
          : mainName
      const item: RouteEndpoint = {
        label,
        address: fullAddress,
        district,
        coords: [lng, lat],
      }
      // Giữ toàn bộ kết quả POI/Danh mục (như Vincom cho "trung tâm thương mại", Highlands cho "quán nước"); chỉ lọc nhiễu đối với StreetName
      if (
        isCategorySearch ||
        addrType === "POI" ||
        addrType === "PointAddress" ||
        scorePlaceMatch(keyword, item) > 0
      ) {
        out.push(item)
      }
    }
    registerDynamicPlaces(out)
    return out
  } catch {
    return []
  }
}

async function fetchNominatimCandidates(
  keyword: string,
  limit = 8,
  signal?: AbortSignal,
): Promise<RouteEndpoint[]> {
  try {
    const { nominatimQuery, isCategorySearch } =
      buildSmartSearchQueries(keyword)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nominatimQuery)}&format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=vn&viewbox=106.35,11.16,107.05,10.35&bounded=1&accept-language=vi`
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    const out: RouteEndpoint[] = []
    for (const item of data) {
      const lat = Number(item?.lat)
      const lng = Number(item?.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      const addr = item?.address ?? {}
      const mainName = (
        item?.name ||
        [addr.house_number, addr.road].filter(Boolean).join(" ") ||
        item?.display_name?.split(",")[0] ||
        ""
      ).trim()
      if (!mainName) continue
      const normMain = normalizeVn(mainName)
      if (normMain === "ho chi minh" || normMain === "thanh pho ho chi minh")
        continue
      const district = (
        addr.city_district ||
        addr.suburb ||
        addr.county ||
        addr.quarter ||
        "TP.HCM"
      ).trim()
      const fullAddress = (
        item?.display_name || `${mainName}, ${district}, TP. Hồ Chí Minh`
      ).trim()
      const label =
        district && !normMain.includes(normalizeVn(district))
          ? `${mainName} · ${district}`
          : mainName
      const place: RouteEndpoint = {
        label,
        address: fullAddress,
        district,
        coords: [lng, lat],
      }
      if (
        isCategorySearch ||
        item?.category === "amenity" ||
        item?.category === "shop" ||
        item?.category === "tourism" ||
        item?.category === "leisure" ||
        scorePlaceMatch(keyword, place) > 0
      ) {
        out.push(place)
      }
    }
    registerDynamicPlaces(out)
    return out
  } catch {
    return []
  }
}

/**
 * Mở sẵn kết nối mạng HTTP/2 TLS tới máy chủ Bản đồ quốc tế (không dùng từ khóa cứng)
 */
export function warmPlaceSearchEngine(): void {
  if (engineWarmed) return
  engineWarmed = true
  window.setTimeout(() => {
    void fetch(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer?f=json",
    ).catch(() => null)
  }, 40)
}

if (typeof window !== "undefined") {
  warmPlaceSearchEngine()
}

/**
 * Tìm kiếm địa điểm / đường phố thời gian thực 100% từ API Bản đồ trực tuyến (ArcGIS World Geocoder + OpenStreetMap Photon qua Backend)
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
  if (cached && cached.length > 0) {
    return cached
  }

  const results: RouteEndpoint[] = [...matchDynamicPlacePool(clean)]

  const arcgisDirectPromise = fetchArcgisCandidates(clean, 7, signal)
  const nominatimPromise = fetchNominatimCandidates(clean, 7, signal)

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
        const normName = normalizeVn(name)
        if (normName === "ho chi minh" || normName === "thanh pho ho chi minh")
          continue
        const district = (item.district || "TP. Hồ Chí Minh").trim()
        const address = (
          item.address ||
          (district ? `${name}, ${district}` : name)
        ).trim()
        const label =
          district && !normName.includes(normalizeVn(district))
            ? `${name} · ${district}`
            : name
        const place: RouteEndpoint = {
          label,
          address,
          district,
          coords: [item.lng, item.lat],
        }
        if (scorePlaceMatch(clean, place) > 0) {
          out.push(place)
        }
      }
      registerDynamicPlaces(out)
      return out
    } catch {
      return []
    }
  })()

  // Ưu tiên nguồn trả về có đủ kết quả khớp trước mà không bị chặn bởi nguồn trả về rỗng
  const remoteBatch = await new Promise<RouteEndpoint[]>((resolve) => {
    let settledCount = 0
    let resolved = false
    const collected: RouteEndpoint[] = []
    const handleBatch = (batch: RouteEndpoint[]) => {
      settledCount += 1
      collected.push(...batch)
      if (!resolved && collected.length >= 3) {
        resolved = true
        resolve([...collected])
      } else if (!resolved && settledCount >= 3) {
        resolved = true
        resolve([...collected])
      }
    }
    void arcgisDirectPromise.then(handleBatch)
    void nominatimPromise.then(handleBatch)
    void backendPromise.then(handleBatch)
  })

  const merged: RouteEndpoint[] = [...remoteBatch, ...results]
  const unique: RouteEndpoint[] = []
  for (const item of merged) {
    if (
      !unique.some((r) => normalizeVn(r.label) === normalizeVn(item.label))
    ) {
      unique.push(item)
    }
  }

  const finalResults = unique
    .sort((a, b) => scorePlaceMatch(clean, b) - scorePlaceMatch(clean, a))
    .slice(0, 7)
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
    const points = Array.isArray(data) ? (data as MapFloodPoint[]) : []
    // Đồng bộ động các tuyến đường từ PostgreSQL vào bộ nhớ tìm kiếm
    registerDynamicPlaces(
      points.map((pt) => ({
        label: pt.district ? `${pt.label} · ${pt.district}` : pt.label,
        address: `${pt.label}, ${pt.district || "TP. Hồ Chí Minh"}`,
        district: pt.district || "TP. Hồ Chí Minh",
        coords: [pt.lng, pt.lat],
      })),
    )
    return points
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
      if (data?.location) {
        return {
          location: data.location,
          district: data.district || "TP.HCM",
          coords: [lng, lat],
        }
      }
    }
  } catch {
    // ignore
  }

  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { "Accept-Language": "vi" } },
    )
    if (nomRes.ok) {
      const data = await nomRes.json()
      const addr = data.address || {}
      const road = addr.road || addr.suburb || addr.neighbourhood || ""
      const district = addr.city_district || addr.county || addr.district || "TP.HCM"
      const location = road ? `${road}, ${district}` : (data.display_name?.split(",")[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      return {
        location,
        district,
        coords: [lng, lat],
      }
    }
  } catch {
    // ignore
  }

  return {
    location: `Vị trí (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
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
