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
  isNavigating = false,
  navStepIndex = 0,
  navigationSteps = [],
  recenterTrigger = 0,
  isTrackingPaused = false,
  onStepChange,
  onProgressUpdate,
}: {
  route: RouteId
  routesData: Record<RouteId, RouteItem>
  origin: RouteEndpoint | null
  destination: RouteEndpoint | null
  floodPoints?: MapFloodPoint[]
  isNavigating?: boolean
  navStepIndex?: number
  navigationSteps?: any[]
  recenterTrigger?: number
  isTrackingPaused?: boolean
  onStepChange?: (stepIndex: number) => void
  onProgressUpdate?: (info: {
    distanceToTurnM: number
    remainingKmM: number
    remainingMinutes: number
    speedKmh: number
  }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const startMarkerRef = useRef<maplibregl.Marker | null>(null)
  const destMarkerRef = useRef<maplibregl.Marker | null>(null)
  const etaRef = useRef<HTMLDivElement | null>(null)
  const etaMarkerRef = useRef<maplibregl.Marker | null>(null)
  const floodMarkersRef = useRef<maplibregl.Marker[]>([])
  const activeRouteCoordsRef = useRef<number[][]>([])
  const puckMarkerRef = useRef<maplibregl.Marker | null>(null)
  const isNavigatingRef = useRef(isNavigating)
  isNavigatingRef.current = isNavigating
  const progressDistanceRef = useRef<number>(0)
  const trackingTickerRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const userRealGpsRef = useRef<[number, number] | null>(null)
  const navStepIndexRef = useRef<number>(navStepIndex)
  navStepIndexRef.current = navStepIndex
  const onStepChangeRef = useRef(onStepChange)
  onStepChangeRef.current = onStepChange
  const onProgressUpdateRef = useRef(onProgressUpdate)
  onProgressUpdateRef.current = onProgressUpdate
  const isTrackingPausedRef = useRef(isTrackingPaused)
  isTrackingPausedRef.current = isTrackingPaused
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "loading" | "live" | "fallback"
  >("idle")
  const [ready, setReady] = useState(false)
  const [routeVersion, setRouteVersion] = useState(0)

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
          const safeC =
            backendData?.safeRoute?.coordinates ??
            backendData?.safeRoute?.waypoints
          const altC =
            backendData?.balancedRoute?.coordinates ??
            backendData?.balancedRoute?.waypoints
          if (
            backendData?.provider !== "database-fallback" &&
            Array.isArray(safeC) &&
            safeC.length > 2
          ) {
            safeCoords = safeC
            if (Array.isArray(altC) && altC.length > 2) {
              altCoords = altC
            }
            if (active) setRouteStatus("live")
          } else {
            throw new Error("Need live road route")
          }
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

      // Tự động kết nối nét vẽ đường từ vị trí xuất phát trong hẻm ra đường chính
      if (origCoords && safeCoords.length > 0) {
        const dx = origCoords[0] - safeCoords[0][0];
        const dy = origCoords[1] - safeCoords[0][1];
        if (dx * dx + dy * dy > 0.00000004) {
          safeCoords = [origCoords, ...safeCoords];
        }
      }
      if (destCoords && safeCoords.length > 0) {
        const lastIdx = safeCoords.length - 1;
        const dx = destCoords[0] - safeCoords[lastIdx][0];
        const dy = destCoords[1] - safeCoords[lastIdx][1];
        if (dx * dx + dy * dy > 0.00000004) {
          safeCoords = [...safeCoords, destCoords];
        }
      }

      if (origCoords && altCoords.length > 0) {
        const dx = origCoords[0] - altCoords[0][0];
        const dy = origCoords[1] - altCoords[0][1];
        if (dx * dx + dy * dy > 0.00000004) {
          altCoords = [origCoords, ...altCoords];
        }
      }

      const currentMap = mapRef.current
      if (!active || !currentMap) return

      activeRouteCoordsRef.current = safeCoords
      setRouteVersion((v) => v + 1)

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
      if (!isNavigatingRef.current) {
        currentMap.fitBounds(bounds, {
          padding:
            window.innerWidth < 760
              ? { top: 190, right: 40, bottom: 300, left: 40 }
              : { top: 90, right: 80, bottom: 110, left: 80 },
          duration: 850,
          maxZoom: 15.4,
        })
      }
    }

    loadRouteGeometry()

    return () => {
      active = false
    }
  }, [ready, origin, destination])

  // =========================================================================
  // CONTINUOUS TRACKING ENGINE (Theo dõi thời gian thực liên tục chuẩn Google Maps)
  // =========================================================================
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    let coords = activeRouteCoordsRef.current
    if (!coords || coords.length === 0) {
      const fallback = (routesData[route] as any)?.coordinates || (routesData[route] as any)?.geometry?.coordinates
      if (Array.isArray(fallback) && fallback.length > 0) {
        coords = fallback
        activeRouteCoordsRef.current = fallback
      } else if (origin && destination) {
        coords = [origin.coords, destination.coords]
        activeRouteCoordsRef.current = coords
      }
    }
    if (!coords || coords.length === 0) return

    // Khoảng cách Haversine (mét)
    function getDistanceMeters(p1: [number, number], p2: [number, number]): number {
      const R = 6371000
      const dLat = ((p2[1] - p1[1]) * Math.PI) / 180
      const dLng = ((p2[0] - p1[0]) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((p1[1] * Math.PI) / 180) *
          Math.cos((p2[1] * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    // Góc phương vị bearing (độ)
    function getBearing(start: [number, number], end: [number, number]): number {
      const y = Math.sin(((end[0] - start[0]) * Math.PI) / 180) * Math.cos((end[1] * Math.PI) / 180)
      const x =
        Math.cos((start[1] * Math.PI) / 180) * Math.sin((end[1] * Math.PI) / 180) -
        Math.sin((start[1] * Math.PI) / 180) *
          Math.cos((end[1] * Math.PI) / 180) *
          Math.cos(((end[0] - start[0]) * Math.PI) / 180)
      return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
    }

    if (!isNavigating) {
      // Khi dừng dẫn đường -> Dọn dẹp tracking ticker & watchPosition
      if (trackingTickerRef.current) {
        clearInterval(trackingTickerRef.current)
        trackingTickerRef.current = null
      }
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      progressDistanceRef.current = 0

      puckMarkerRef.current?.remove()
      puckMarkerRef.current = null

      map.flyTo({
        pitch: 0,
        bearing: 0,
        duration: 900,
      })

      if (coords.length > 1) {
        const bounds = coords.reduce(
          (result, coordinate) => result.extend(coordinate as [number, number]),
          new maplibregl.LngLatBounds(
            coords[0] as [number, number],
            coords[0] as [number, number],
          ),
        )
        map.fitBounds(bounds, {
          padding:
            window.innerWidth < 760
              ? { top: 190, right: 40, bottom: 300, left: 40 }
              : { top: 90, right: 80, bottom: 110, left: 80 },
          duration: 900,
          maxZoom: 15.4,
        })
      }
      return
    }

    // ĐOẠN ĐƯỜNG & MỐC RẼ
    const segmentDistances: number[] = []
    let totalRouteMeters = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const d = getDistanceMeters(coords[i] as [number, number], coords[i + 1] as [number, number])
      segmentDistances.push(d)
      totalRouteMeters += d
    }

    function getPointAtDistance(targetDist: number): [number, number] {
      if (targetDist <= 0) return coords[0] as [number, number]
      if (targetDist >= totalRouteMeters) return coords[coords.length - 1] as [number, number]
      let accumulated = 0
      for (let i = 0; i < segmentDistances.length; i++) {
        const segDist = segmentDistances[i]
        if (accumulated + segDist >= targetDist) {
          const ratio = segDist > 0 ? (targetDist - accumulated) / segDist : 0
          const p1 = coords[i]
          const p2 = coords[i + 1]
          return [
            p1[0] + (p2[0] - p1[0]) * ratio,
            p1[1] + (p2[1] - p1[1]) * ratio,
          ]
        }
        accumulated += segDist
      }
      return coords[coords.length - 1] as [number, number]
    }

    // Phân bổ mốc rẽ theo navigationSteps
    const stepCount = Math.max(1, navigationSteps.length)
    const stepMilestones: number[] = []
    let stepDistAccum = 0
    for (let s = 0; s < navigationSteps.length; s++) {
      const step = navigationSteps[s]
      let meters = 0
      if (typeof step.distanceMeters === "number" && step.distanceMeters > 0) {
        meters = step.distanceMeters
      } else if (typeof step.distance === "string") {
        const cleaned = step.distance.replace(",", ".")
        const match = cleaned.match(/([\d.]+)/)
        if (match) {
          const val = parseFloat(match[1])
          meters = cleaned.includes("km") ? val * 1000 : val
        }
      }
      if (meters <= 10) {
        meters = totalRouteMeters / stepCount
      }
      stepDistAccum += meters
      stepMilestones.push(Math.min(totalRouteMeters, stepDistAccum))
    }

    // Khởi tạo hoặc cập nhật 3D Puck
    if (!puckMarkerRef.current) {
      const puckEl = document.createElement("div")
      puckEl.className = "google-nav-puck"
      puckEl.innerHTML = `
        <div class="puck-radar-wave"></div>
        <div class="puck-arrow-body">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#FFFFFF">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      `
      puckMarkerRef.current = new maplibregl.Marker({
        element: puckEl,
        anchor: "center",
      })
        .setLngLat(coords[0] as [number, number])
        .addTo(map)
    }

    // KHỞI ĐỘNG LIVE GPS TRACKING THẬT (watchPosition)
    if (watchIdRef.current === null && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const realLat = pos.coords.latitude
            const realLng = pos.coords.longitude
            userRealGpsRef.current = [realLng, realLat]

            let closestSegIdx = 0
            let minDistanceToRoute = Infinity
            let distAlongRouteToClosest = 0
            let runningSum = 0

            for (let i = 0; i < coords.length - 1; i++) {
              const p = coords[i] as [number, number]
              const d = getDistanceMeters(p, [realLng, realLat])
              if (d < minDistanceToRoute) {
                minDistanceToRoute = d
                closestSegIdx = i
                distAlongRouteToClosest = runningSum
              }
              runningSum += segmentDistances[i]
            }

            if (minDistanceToRoute < 80) {
              progressDistanceRef.current = Math.max(progressDistanceRef.current, distAlongRouteToClosest)
            }
          },
          (err) => {
            console.warn("Live GPS watchPosition warning:", err)
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        )
      } catch (err) {
        console.warn("Could not start watchPosition:", err)
      }
    }

    // Cập nhật vị trí hiển thị, camera 3D và bước rẽ
    const updateTrackingFrame = () => {
      const curDist = progressDistanceRef.current
      const currentPoint = getPointAtDistance(curDist)
      const lookPoint = getPointAtDistance(curDist + 16)
      const roadBearing = getBearing(currentPoint, lookPoint)

      if (puckMarkerRef.current) {
        puckMarkerRef.current.setLngLat(currentPoint)
        const arrowBody = puckMarkerRef.current.getElement().querySelector(".puck-arrow-body") as HTMLElement | null
        if (arrowBody) {
          arrowBody.style.transform = `rotate(${roadBearing}deg)`
        }
      }

      // Camera 3D bám sát theo xe mượt mà
      map.easeTo({
        center: currentPoint,
        zoom: 17.8,
        pitch: 62,
        bearing: roadBearing,
        duration: 550,
        essential: true,
      })

      // Khoảng cách tới ngã rẽ tiếp theo
      const curStepIdx = navStepIndexRef.current
      const targetTurnDist = stepMilestones[curStepIdx] ?? totalRouteMeters
      const distToTurnM = Math.max(0, Math.round(targetTurnDist - curDist))

      // Tự động chuyển bước rẽ khi đến gần ngã rẽ (<= 25m)
      if (distToTurnM <= 25 && curStepIdx < navigationSteps.length - 1) {
        const nextStepIdx = curStepIdx + 1
        navStepIndexRef.current = nextStepIdx
        onStepChangeRef.current?.(nextStepIdx)
      }

      const remainingKmM = Math.max(0, Math.round(totalRouteMeters - curDist))
      const remainingMin = Math.max(1, Math.round(remainingKmM / ((32 * 1000) / 60)))
      const speedKmh = isTrackingPausedRef.current ? 0 : 32

      onProgressUpdateRef.current?.({
        distanceToTurnM: distToTurnM,
        remainingKmM,
        remainingMinutes: remainingMin,
        speedKmh,
      })
    }

    updateTrackingFrame()

    // Khởi động vòng lặp Tracking liên tục (mỗi 500ms)
    if (trackingTickerRef.current) {
      clearInterval(trackingTickerRef.current)
    }

    trackingTickerRef.current = setInterval(() => {
      if (!isNavigatingRef.current) return

      if (isTrackingPausedRef.current) {
        updateTrackingFrame()
        return
      }

      // Mỗi 500ms tiến tới ~4.5 mét (tương đương 32 km/h)
      const stepMeters = (32 * 1000 / 3600) * 0.5
      progressDistanceRef.current = Math.min(
        totalRouteMeters,
        progressDistanceRef.current + stepMeters,
      )

      updateTrackingFrame()

      if (progressDistanceRef.current >= totalRouteMeters) {
        clearInterval(trackingTickerRef.current)
        trackingTickerRef.current = null
      }
    }, 500)

    return () => {
      if (trackingTickerRef.current) {
        clearInterval(trackingTickerRef.current)
        trackingTickerRef.current = null
      }
    }
  }, [isNavigating, ready, routeVersion, recenterTrigger, isTrackingPaused, navigationSteps.length])

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
