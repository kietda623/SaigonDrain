import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import type { GeoJSONSource, Map as LibreMap } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import type {
  MapFloodPoint,
  RouteEndpoint,
  RouteId,
  RouteItem,
} from "@/types"

function MapCanvas({
  route,
  routesData,
  origin,
  destination,
  floodPoints = [],
}: {
  route: RouteId
  routesData: Record<RouteId, RouteItem>
  origin: RouteEndpoint | null
  destination: RouteEndpoint | null
  floodPoints?: MapFloodPoint[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destMarkerRef = useRef<maplibregl.Marker | null>(null)
  const etaRef = useRef<HTMLDivElement | null>(null)
  const etaMarkerRef = useRef<maplibregl.Marker | null>(null)
  const floodMarkersRef = useRef<maplibregl.Marker[]>([])
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "loading" | "live" | "fallback"
  >("idle")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    maplibregl.setWorkerUrl(maplibreWorkerUrl)

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [106.698, 10.775],
      zoom: 12.8,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "© Esri · OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: {
              "raster-saturation": -0.08,
              "raster-contrast": 0.04,
            },
          },
        ],
      },
    })

    mapRef.current = map
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      "top-right",
    )
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    )

    map.on("load", () => {
      const addRoute = (
        id: string,
        routeCoordinates: number[][],
        color: string,
        width: number,
        outlineWidth: number,
        dashed = false,
      ) => {
        map.addSource(id, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: routeCoordinates },
          },
        })
        const dash = dashed ? [1.4, 2.2] : undefined
        map.addLayer({
          id: `${id}-outline`,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": outlineWidth,
            "line-opacity": 0.92,
            ...(dash ? { "line-dasharray": dash } : {}),
          },
        })
        map.addLayer({
          id: `${id}-line`,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": width,
            ...(dash ? { "line-dasharray": dash } : {}),
          },
        })
      }

      addRoute("east-route", [], "#8FB7AE", 4, 6, true)
      addRoute("sgu-route", [], "#0B4F4A", 7, 11)

      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Cập nhật marker và tuyến đường mỗi khi người dùng nhập Điểm đi / Điểm đến
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    const createCampusMarker = (
      kind: "start" | "destination",
      title: string,
    ) => {
      const marker = document.createElement("div")
      marker.className = `libre-campus-marker ${kind}`
      marker.title = title
      marker.setAttribute("aria-label", title)
      const core = document.createElement("span")
      marker.appendChild(core)
      return marker
    }

    // Cập nhật marker Điểm đi
    startMarkerRef.current?.remove()
    startMarkerRef.current = null
    if (origin) {
      startMarkerRef.current = new maplibregl.Marker({
        element: createCampusMarker("start", origin.label),
        anchor: "center",
      })
        .setLngLat(origin.coords)
        .addTo(map)
    }

    // Cập nhật marker Điểm đến
    destMarkerRef.current?.remove()
    destMarkerRef.current = null
    if (destination) {
      destMarkerRef.current = new maplibregl.Marker({
        element: createCampusMarker("destination", destination.label),
        anchor: "bottom",
      })
        .setLngLat(destination.coords)
        .addTo(map)
    }

    // Nếu chưa đủ cả Điểm đi và Điểm đến thì xóa đường vẽ cũ
    if (!origin || !destination) {
      setRouteStatus("idle")
      etaMarkerRef.current?.remove()
      etaMarkerRef.current = null
      etaRef.current = null

      const sguSrc = map.getSource("sgu-route") as GeoJSONSource | undefined
      sguSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })
      const eastSrc = map.getSource("east-route") as GeoJSONSource | undefined
      eastSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [] },
      })

      if (origin) {
        map.flyTo({ center: origin.coords, zoom: 14.2, duration: 700 })
      } else if (destination) {
        map.flyTo({ center: destination.coords, zoom: 14.2, duration: 700 })
      }
      return
    }

    let active = true
    setRouteStatus("loading")
    const origCoords = origin.coords
    const destCoords = destination.coords

    async function loadRouteGeometry() {
      let safeCoords: number[][] = [origCoords, destCoords]
      let altCoords: number[][] = [
        origCoords,
        [
          (origCoords[0] + destCoords[0]) / 2 + 0.006,
          (origCoords[1] + destCoords[1]) / 2 - 0.003,
        ],
        destCoords,
      ]

      try {
        const backendRes = await fetch(
          `/api/journey/compute-route?fromLat=${origCoords[1]}&fromLng=${origCoords[0]}&toLat=${destCoords[1]}&toLng=${destCoords[0]}`,
        )
        if (backendRes.ok) {
          const backendData = await backendRes.json()
          if (backendData?.safeRoute?.coordinates?.length > 1) {
            safeCoords = backendData.safeRoute.coordinates
          }
          if (backendData?.balancedRoute?.coordinates?.length > 1) {
            altCoords = backendData.balancedRoute.coordinates
          }
          if (active) setRouteStatus("live")
        } else {
          throw new Error("Backend route unavailable")
        }
      } catch {
        try {
          const midLng = (origCoords[0] + destCoords[0]) / 2 + 0.006
          const midLat = (origCoords[1] + destCoords[1]) / 2 - 0.003
          const [primaryResponse, eastResponse] = await Promise.all([
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${origCoords.join(",")};${destCoords.join(",")}?steps=true&geometries=geojson&overview=full`,
            ),
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${origCoords.join(",")};${midLng},${midLat};${destCoords.join(",")}?geometries=geojson&overview=full`,
            ),
          ])
          if (primaryResponse.ok) {
            const primaryData = await primaryResponse.json()
            if (primaryData.routes?.[0]?.geometry?.coordinates?.length > 1) {
              safeCoords = primaryData.routes[0].geometry.coordinates
            }
          }
          if (eastResponse.ok) {
            const eastData = await eastResponse.json()
            if (eastData.routes?.[0]?.geometry?.coordinates?.length > 1) {
              altCoords = eastData.routes[0].geometry.coordinates
            }
          }
          if (active) setRouteStatus("live")
        } catch {
          if (active) setRouteStatus("fallback")
        }
      }

      const currentMap = mapRef.current
      if (!active || !currentMap) return

      const sguSrc = currentMap.getSource("sgu-route") as GeoJSONSource | undefined
      sguSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: safeCoords },
      })

      const eastSrc = currentMap.getSource("east-route") as GeoJSONSource | undefined
      eastSrc?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: altCoords },
      })

      const midSafe =
        safeCoords[Math.floor(safeCoords.length / 2)] ?? origCoords

      if (!etaMarkerRef.current) {
        const etaElement = document.createElement("div")
        etaElement.className = "map-route-eta is-primary"
        const etaTime = document.createElement("strong")
        etaTime.textContent = routesData[route].time
        const etaDistance = document.createElement("span")
        etaDistance.textContent = routesData[route].distance
        etaElement.append(etaTime, etaDistance)
        etaRef.current = etaElement
        etaMarkerRef.current = new maplibregl.Marker({
          element: etaElement,
          anchor: "center",
        })
          .setLngLat(midSafe as [number, number])
          .addTo(currentMap)
      } else {
        etaMarkerRef.current.setLngLat(midSafe as [number, number])
      }

      const allCoords = [...safeCoords, ...altCoords]
      const bounds = allCoords.reduce(
        (result, coordinate) => result.extend(coordinate as [number, number]),
        new maplibregl.LngLatBounds(
          allCoords[0] as [number, number],
          allCoords[0] as [number, number],
        ),
      )
      currentMap.fitBounds(bounds, {
        padding:
          window.innerWidth < 760
            ? { top: 190, right: 40, bottom: 300, left: 40 }
            : { top: 90, right: 80, bottom: 110, left: 80 },
        duration: 850,
        maxZoom: 15.4,
      })
    }

    loadRouteGeometry()

    return () => {
      active = false
    }
  }, [ready, origin, destination])

  // Hiển thị các điểm ngập thực tế từ PostgreSQL lên bản đồ
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    for (const m of floodMarkersRef.current) {
      m.remove()
    }
    floodMarkersRef.current = []

    for (const pt of floodPoints) {
      if (pt.type !== "flood" && pt.type !== "pending" && pt.type !== "risk")
        continue
      const el = document.createElement("div")
      el.className = `libre-flood-marker ${pt.severity} severity-${pt.severity}`
      el.title = `${pt.label} (${pt.district}) · Ngập ${pt.depth || 20} cm · Mưa ${pt.rainfall} mm`
      el.innerHTML = `<span class="libre-flood-pulse"></span><span class="flood-label">${pt.label}${pt.depth ? ` · ${pt.depth}cm` : ""}</span>`

      const marker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map)

      floodMarkersRef.current.push(marker)
    }
  }, [ready, floodPoints])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    const safe = route === "safe"

    const paint = (
      layerId: string,
      property: "line-color" | "line-width" | "line-dasharray",
      value: string | number | number[] | undefined,
    ) => {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value)
    }

    paint("sgu-route-line", "line-color", safe ? "#0B4F4A" : "#A9BFB8")
    paint("sgu-route-line", "line-width", safe ? 7 : 4)
    paint("east-route-line", "line-color", safe ? "#8FB7AE" : "#C97A2B")
    paint("east-route-line", "line-width", safe ? 4 : 7)
    paint("east-route-outline", "line-width", safe ? 6 : 11)
    paint("east-route-line", "line-dasharray", safe ? [1.4, 2.2] : undefined)

    const eta = etaRef.current
    if (eta) {
      const time = eta.querySelector("strong")
      const distance = eta.querySelector("span")
      if (time) time.textContent = routesData[route].time
      if (distance) distance.textContent = routesData[route].distance
    }
  }, [route, ready, routesData])

  const statusText =
    routeStatus === "idle"
      ? "Nhập Điểm đi và Điểm đến để tìm lộ trình tránh ngập"
      : routeStatus === "live"
        ? `Tuyến thực tế · ${routesData[route].distance} · ${routesData[route].time}`
        : routeStatus === "fallback"
          ? "Tuyến dự phòng ngoại tuyến"
          : "Đang tính toán lộ trình…"

  return (
    <div className="libre-map-shell">
      <div
        aria-label="Bản đồ giám sát ngập và dẫn đường TP.HCM"
        className="libre-map"
        ref={containerRef}
      />
      <div className="libre-route-status">
        <span />
        {statusText}
      </div>
    </div>
  )
}

export default MapCanvas
