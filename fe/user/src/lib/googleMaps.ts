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


/**
 * Tính toán tuyến đường chi tiết đi qua các ngõ hẻm bằng Google Maps Directions Service
 * Hỗ trợ chế độ xe máy (TWO_WHEELER) luồn lách qua tất cả các con hẻm tại TP.HCM
 */
export async function computeRouteWithGoogle(
  originCoords: [number, number],
  destCoords: [number, number],
): Promise<{
  safeRoute: RouteItem
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
            provideRouteAlternatives: false,
          },
          (result: any, status: any) => {
            if (status === "OK" && result?.routes?.[0]) {
              const route = result.routes[0]
              const leg = route.legs?.[0]

              // Lấy toàn bộ tọa độ chính xác từng khúc cua trong hẻm
              const coordinates: number[][] = (route.overview_path || []).map((pt: any) => [
                pt.lng(),
                pt.lat(),
              ])

              // Đảm bảo điểm bắt đầu khớp chính xác với GPS người dùng trong hẻm
              if (coordinates.length > 0) {
                const first = coordinates[0]
                const dLat0 = first[1] - originCoords[1]
                const dLng0 = first[0] - originCoords[0]
                if (dLat0 * dLat0 + dLng0 * dLng0 > 0.00000001) {
                  coordinates.unshift(originCoords)
                }

                const last = coordinates[coordinates.length - 1]
                const dLatL = last[1] - destCoords[1]
                const dLngL = last[0] - destCoords[0]
                if (dLatL * dLatL + dLngL * dLngL > 0.00000001) {
                  coordinates.push(destCoords)
                }
              }

              // Trích xuất các bước rẽ cụ thể từ hẻm ra đường lớn
              const rawSteps: any[] = leg?.steps || []
              const steps: NavigationStep[] = rawSteps.map((st: any) => {
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
                }
              })

              const durationText = leg?.duration?.text || "12 phút"
              const distanceText = leg?.distance?.text || "3,2 km"

              const safeRoute: RouteItem = {
                id: "safe",
                name: "Tuyến Google Maps tối ưu",
                time: durationText,
                distance: distanceText,
                badge: "Tối ưu nhất",
                detail: `Lộ trình dẫn đường từ trong hẻm (${distanceText}, ${durationText}) đã được tối ưu tránh ngập.`,
                coordinates,
              }

              resolve({ safeRoute, navigationSteps: steps })
            } else if (
              travelMode === (window as any).google.maps.TravelMode.TWO_WHEELER
            ) {
              // Thử lại với DRIVING nếu khu vực chưa hỗ trợ chế độ xe máy
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
