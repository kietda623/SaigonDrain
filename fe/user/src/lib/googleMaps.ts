import { Capacitor } from "@capacitor/core"
import type { NavigationStep, RouteEndpoint, RouteItem } from "@/types"

export const ANDROID_GOOGLE_MAPS_KEY = "AIzaSyDMXZSl3w46OdV8wMoMgC8qmIt1g1olFJY"
export const IOS_GOOGLE_MAPS_KEY = "AIzaSyA7l9OR143VLMebl_p1OpYg4BuXAS1bwqk"
export const WEB_GOOGLE_MAPS_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  "AIzaSyAl8nIrzzzP93NMvXshmHo0UiaYG_-yTtU"

export const GOOGLE_MAPS_KEY =
  typeof window !== "undefined" && Capacitor.getPlatform() === "android"
    ? ANDROID_GOOGLE_MAPS_KEY
    : typeof window !== "undefined" && Capacitor.getPlatform() === "ios"
      ? IOS_GOOGLE_MAPS_KEY
      : WEB_GOOGLE_MAPS_KEY

export type GoogleMapLayerType =
  | "google-streets"
  | "google-satellite"
  | "google-traffic"
  | "google-terrain"
  | "esri"

export const GOOGLE_MAP_TILE_URLS: Record<GoogleMapLayerType, string[]> = {
  "google-streets": [
    "https://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}",
  ],
  "google-satellite": [
    "https://mt0.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}",
  ],
  "google-traffic": [
    "https://mt0.google.com/vt/lyrs=m,traffic&hl=vi&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=m,traffic&hl=vi&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=m,traffic&hl=vi&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=m,traffic&hl=vi&x={x}&y={y}&z={z}",
  ],
  "google-terrain": [
    "https://mt0.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}",
    "https://mt1.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}",
    "https://mt2.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}",
    "https://mt3.google.com/vt/lyrs=p&hl=vi&x={x}&y={y}&z={z}",
  ],
  esri: [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  ],
}

let googleMapsScriptPromise: Promise<boolean> | null = null

/**
 * Tải script Google Maps JavaScript API có thư viện places và geometry
 */
export function loadGoogleMapsScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)
  if ((window as any).google?.maps?.places) {
    return Promise.resolve(true)
  }
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise
  }

  googleMapsScriptPromise = new Promise((resolve) => {
    const existing = document.getElementById("google-maps-js-sdk")
    if (existing) {
      existing.addEventListener("load", () => resolve(true))
      existing.addEventListener("error", () => resolve(false))
      return
    }

    const script = document.createElement("script")
    script.id = "google-maps-js-sdk"
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry&language=vi`
    script.async = true
    script.defer = true
    script.onload = () => {
      resolve(true)
    }
    script.onerror = (e) => {
      console.warn("Failed to load Google Maps JS SDK:", e)
      resolve(false)
    }
    document.head.appendChild(script)
  })

  return googleMapsScriptPromise
}

/**
 * Tìm kiếm địa điểm bằng Google Places Autocomplete API
 */
export async function searchPlacesWithGoogle(
  query: string,
): Promise<RouteEndpoint[]> {
  const isLoaded = await loadGoogleMapsScript()
  if (!isLoaded || !(window as any).google?.maps?.places) {
    return []
  }

  return new Promise((resolve) => {
    try {
      const g = (window as any).google.maps
      const service = new g.places.AutocompleteService()

      // Giới hạn tìm kiếm tại TP.HCM và Việt Nam
      const request = {
        input: query,
        componentRestrictions: { country: "vn" },
        locationBias: new g.LatLngBounds(
          new g.LatLng(10.37, 106.35),
          new g.LatLng(11.18, 107.05),
        ),
      }

      service.getPlacePredictions(
        request,
        async (predictions: any[], status: any) => {
          if (
            status !== g.places.PlacesServiceStatus.OK ||
            !Array.isArray(predictions)
          ) {
            resolve([])
            return
          }

          const geocoder = new g.Geocoder()
          const results: RouteEndpoint[] = []

          // Lấy tọa độ cho các kết quả hàng đầu (tối đa 5 kết quả)
          const topPredictions = predictions.slice(0, 5)
          const geoPromises = topPredictions.map((pred) => {
            return new Promise<RouteEndpoint | null>((resGeo) => {
              geocoder.geocode(
                { placeId: pred.place_id },
                (geoRes: any[], geoStatus: any) => {
                  if (geoStatus === "OK" && geoRes?.[0]?.geometry?.location) {
                    const loc = geoRes[0].geometry.location
                    const mainText =
                      pred.structured_formatting?.main_text ||
                      pred.description.split(",")[0]
                    const secondaryText =
                      pred.structured_formatting?.secondary_text ||
                      geoRes[0].formatted_address

                    resGeo({
                      label: `${mainText} · ${pred.description.includes("TP.HCM") || pred.description.includes("Hồ Chí Minh") ? "TP.HCM" : pred.description.split(",").slice(1, 3).join(",")}`,
                      address: mainText,
                      district: secondaryText,
                      coords: [loc.lng(), loc.lat()],
                    })
                  } else {
                    resGeo(null)
                  }
                },
              )
            })
          })

          const resolved = await Promise.all(geoPromises)
          for (const item of resolved) {
            if (item) results.push(item)
          }

          resolve(results)
        },
      )
    } catch (err) {
      console.warn("Google Places Autocomplete error:", err)
      resolve([])
    }
  })
}

/**
 * Giải mã tọa độ sang địa chỉ Google Maps chính thức
 */
export async function reverseGeocodeWithGoogle(
  lat: number,
  lng: number,
): Promise<{ location: string; district: string; coords: [number, number] } | null> {
  const isLoaded = await loadGoogleMapsScript()
  if (!isLoaded || !(window as any).google?.maps?.Geocoder) {
    return null
  }

  return new Promise((resolve) => {
    try {
      const geocoder = new (window as any).google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat, lng }, language: "vi" },
        (results: any[], status: any) => {
          if (status === "OK" && results?.[0]) {
            const first = results[0]
            const comps = first.address_components || []

            let street = ""
            let ward = ""
            let district = ""

            for (const c of comps) {
              const types: string[] = c.types || []
              if (types.includes("route")) street = c.long_name
              if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
                ward = c.long_name
              }
              if (types.includes("administrative_area_level_2")) {
                district = c.long_name
              }
            }

            let location = ""
            if (street && ward && district) {
              location = `${street}, ${ward}, ${district}`
            } else if (ward && district) {
              location = `${ward}, ${district}`
            } else if (district) {
              location = `${district}, TP.HCM`
            } else {
              location = first.formatted_address?.split(",").slice(0, 2).join(",") || "TP. Hồ Chí Minh"
            }

            resolve({
              location,
              district: district || "TP.HCM",
              coords: [lng, lat],
            })
          } else {
            resolve(null)
          }
        },
      )
    } catch (err) {
      console.warn("Google Geocoder error:", err)
      resolve(null)
    }
  })
}


function haversineMeters(p1: [number, number], p2: [number, number]): number {
  const R = 6371000
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseStepsFromLeg(leg: any): NavigationStep[] {
  const rawSteps: any[] = leg?.steps || []
  return rawSteps.map((st: any) => {
    const rawHtml = st.instructions || ""
    const clean = rawHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    const lower = clean.toLowerCase()

    let icon: NavigationStep["icon"] = "straight"
    let instruction = "Đi theo"

    if (lower.includes("rẽ trái") || lower.includes("quẹo trái") || lower.includes("turn left")) {
      icon = "turn-left"
      instruction = "Rẽ trái vào"
    } else if (lower.includes("rẽ phải") || lower.includes("quẹo phải") || lower.includes("turn right")) {
      icon = "turn-right"
      instruction = "Rẽ phải vào"
    }

    let street = clean
      .replace(/^(Đi theo|Rẽ trái vào|Rẽ phải vào|Quẹo trái|Quẹo phải|Đi về hướng|Tiếp tục|Rẽ trái|Rẽ phải)\s*/i, "")
      .trim()

    if (!street) street = "Trục đường tiếp theo"

    return {
      icon,
      instruction,
      street,
      distance: st.distance?.text || "100 m",
      distanceMeters: st.distance?.value || 100,
    }
  })
}

/**
 * Tính toán tuyến đường chi tiết qua Google Maps Directions Service
 * - Hỗ trợ chế độ xe máy (TWO_WHEELER) luồn lách qua các hẻm tại TP.HCM
 * - Tự động đánh giá các tuyến thay thế (Route Alternatives) và ưu tiên tuyến NÉ ĐIỂM NGẬP NƯỚC
 */
export async function computeRouteWithGoogle(
  originCoords: [number, number],
  destCoords: [number, number],
  floodPoints: any[] = [],
): Promise<{
  safeRoute: RouteItem
  balancedRoute?: RouteItem
  navigationSteps: NavigationStep[]
} | null> {
  const isLoaded = await loadGoogleMapsScript()
  if (!isLoaded || !(window as any).google?.maps?.DirectionsService) {
    return null
  }

  return new Promise((resolve) => {
    try {
      const directionsService = new (window as any).google.maps.DirectionsService()

      const tryRoute = (travelMode: any) => {
        directionsService.route(
          {
            origin: { lat: originCoords[1], lng: originCoords[0] },
            destination: { lat: destCoords[1], lng: destCoords[0] },
            travelMode,
            provideRouteAlternatives: true,
          },
          (result: any, status: any) => {
            const rawRoutes: any[] = result?.routes || []
            if (status === "OK" && rawRoutes.length > 0) {
              // Lọc các điểm ngập đang có nước hoặc rủi ro
              const activeFloods = floodPoints.filter(
                (fp) => (fp.depth || 0) > 0 || fp.type === "flood" || fp.type === "pending"
              )

              // Chấm điểm né ngập cho từng phương án đường đi mà Google gợi ý
              const scoredCandidates = rawRoutes.map((route, rIdx) => {
                const leg = route.legs?.[0]
                const coordinates: number[][] = (route.overview_path || []).map((pt: any) => [
                  pt.lng(),
                  pt.lat(),
                ])

                // Đảm bảo điểm bắt đầu và kết thúc khớp chính xác GPS
                if (coordinates.length > 0) {
                  const first = coordinates[0]
                  const d0 = haversineMeters(originCoords, [first[0], first[1]])
                  if (d0 > 3) coordinates.unshift(originCoords)

                  const last = coordinates[coordinates.length - 1]
                  const dL = haversineMeters(destCoords, [last[0], last[1]])
                  if (dL > 3) coordinates.push(destCoords)
                }

                let floodPenalty = 0
                const hitStreets: string[] = []

                // Quét kiểm tra khoảng cách từ tuyến đường đến các điểm ngập
                for (const fp of activeFloods) {
                  const fPoint: [number, number] = [fp.lng, fp.lat]
                  let minDistanceMeters = Infinity
                  for (let i = 0; i < coordinates.length; i += 2) {
                    const d = haversineMeters(fPoint, coordinates[i] as [number, number])
                    if (d < minDistanceMeters) minDistanceMeters = d
                    if (minDistanceMeters < 120) break
                  }

                  if (minDistanceMeters <= 120) {
                    const depth = fp.depth || 25
                    const penalty = depth >= 35 ? 20000 : depth >= 20 ? 8000 : 3000
                    floodPenalty += penalty
                    if (fp.label && !hitStreets.includes(fp.label)) {
                      hitStreets.push(fp.label)
                    }
                  }
                }

                const baseDurationSec = leg?.duration?.value || 600
                const totalScore = baseDurationSec + floodPenalty
                const durationText = leg?.duration?.text || "12 phút"
                const distanceText = leg?.distance?.text || "3,2 km"
                const steps = parseStepsFromLeg(leg)

                return {
                  route,
                  leg,
                  coordinates,
                  steps,
                  floodPenalty,
                  hitStreets,
                  totalScore,
                  durationText,
                  distanceText,
                  rIdx,
                }
              })

              // Sắp xếp: Ưu tiên tuyệt đối tuyến có mức độ ngập thấp nhất (totalScore nhỏ nhất)
              scoredCandidates.sort((a, b) => a.totalScore - b.totalScore)

              const best = scoredCandidates[0]
              const second = scoredCandidates[1]

              const isZeroFlood = best.hitStreets.length === 0
              const safeRoute: RouteItem = {
                id: "safe",
                name: "Tuyến tối ưu tránh ngập",
                time: best.durationText,
                distance: best.distanceText,
                badge: isZeroFlood ? "Tránh ngập tuyệt đối" : "Hạn chế ngập tối đa",
                detail: isZeroFlood
                  ? `Lộ trình Google Maps (${best.distanceText}, ${best.durationText}) đã né hoàn toàn các điểm ngập.`
                  : `Lộ trình tối ưu nhất (${best.distanceText}, ${best.durationText}), đã né các đoạn ngập sâu lớn.`,
                coordinates: best.coordinates,
              }

              let balancedRoute: RouteItem | undefined
              if (second) {
                const secondZeroFlood = second.hitStreets.length === 0
                balancedRoute = {
                  id: "balanced",
                  name: "Tuyến dự phòng",
                  time: second.durationText,
                  distance: second.distanceText,
                  badge: secondZeroFlood ? "Dự phòng khô ráo" : "Dự phòng",
                  detail: `Lộ trình thay thế (${second.distanceText}, ${second.durationText}).`,
                  coordinates: second.coordinates,
                }
              }

              resolve({
                safeRoute,
                balancedRoute,
                navigationSteps: best.steps,
              })
            } else if (
              travelMode === (window as any).google.maps.TravelMode.TWO_WHEELER
            ) {
              tryRoute((window as any).google.maps.TravelMode.DRIVING)
            } else {
              resolve(null)
            }
          },
        )
      }

      const travelMode =
        (window as any).google.maps.TravelMode.TWO_WHEELER ||
        (window as any).google.maps.TravelMode.DRIVING
      tryRoute(travelMode)
    } catch (err) {
      console.warn("Google Directions error:", err)
      resolve(null)
    }
  })
}
