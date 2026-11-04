import { useEffect, useRef, useState } from "react"
import * as maplibregl from "maplibre-gl"
import type { Map as LibreMap } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url"
import { CAMPUS_1, MAIN_CAMPUS, routes } from "@/data/mockData"
import type { RouteId } from "@/types"

function MapCanvas({ route }: { route: RouteId }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const etaRef = useRef<HTMLDivElement | null>(null)
  const etaMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [routeStatus, setRouteStatus] = useState<
    "loading" | "live" | "fallback"
  >("loading")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    maplibregl.setWorkerUrl(maplibreWorkerUrl)

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [106.6827, 10.7694],
      zoom: 14,
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    })

    mapRef.current = map
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    )

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

    new maplibregl.Marker({
      element: createCampusMarker("start", "Cơ sở 1 Đại học Sài Gòn"),
      anchor: "center",
    })
      .setLngLat(CAMPUS_1)
      .addTo(map)

    new maplibregl.Marker({
      element: createCampusMarker("destination", "Cơ sở chính Đại học Sài Gòn"),
      anchor: "bottom",
    })
      .setLngLat(MAIN_CAMPUS)
      .addTo(map)

    map.on("load", async () => {
      const fallbackCoordinates = [
        CAMPUS_1,
        [106.681961, 10.777914],
        [106.681415, 10.777851],
        [106.67779, 10.773909],
        [106.684204, 10.768158],
        [106.681694, 10.76516],
        [106.683955, 10.759467],
        MAIN_CAMPUS,
      ]

      let coordinates: number[][] = fallbackCoordinates
      let eastRoute: number[][] = [CAMPUS_1, [106.689, 10.769], MAIN_CAMPUS]
      let westRoute: number[][] = [CAMPUS_1, [106.675, 10.769], MAIN_CAMPUS]

      try {
        const [primaryResponse, eastResponse, westResponse] = await Promise.all(
          [
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${CAMPUS_1.join(",")};${MAIN_CAMPUS.join(",")}?steps=true&geometries=geojson&overview=full`,
            ),
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${CAMPUS_1.join(",")};106.689,10.769;${MAIN_CAMPUS.join(",")}?geometries=geojson&overview=full`,
            ),
            fetch(
              `https://router.project-osrm.org/route/v1/driving/${CAMPUS_1.join(",")};106.675,10.769;${MAIN_CAMPUS.join(",")}?geometries=geojson&overview=full`,
            ),
          ],
        )
        if (!primaryResponse.ok) throw new Error("Không thể tải tuyến")
        const primaryData = await primaryResponse.json()
        coordinates = primaryData.routes[0].geometry.coordinates
        if (eastResponse.ok) {
          const eastData = await eastResponse.json()
          eastRoute = eastData.routes[0].geometry.coordinates
        }
        if (westResponse.ok) {
          const westData = await westResponse.json()
          westRoute = westData.routes[0].geometry.coordinates
        }
        setRouteStatus("live")
      } catch {
        setRouteStatus("fallback")
      }

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
            "line-opacity": 0.9,
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

      addRoute("east-route", eastRoute, "#8FB7AE", 3, 5, true)
      addRoute("west-route", westRoute, "#8FB7AE", 3, 5, true)
      addRoute("sgu-route", coordinates, "#0B4F4A", 7, 11)

      const etaElement = document.createElement("div")
      etaElement.className = "map-route-eta is-primary"
      const etaTime = document.createElement("strong")
      etaTime.textContent = routes.safe.time
      const etaDistance = document.createElement("span")
      etaDistance.textContent = routes.safe.distance
      etaElement.append(etaTime, etaDistance)
      etaRef.current = etaElement
      etaMarkerRef.current = new maplibregl.Marker({
        element: etaElement,
        anchor: "center",
      })
        .setLngLat([106.6817, 10.7707])
        .addTo(map)

      const allRouteCoordinates = [...coordinates, ...eastRoute, ...westRoute]
      const bounds = allRouteCoordinates.reduce(
        (result, coordinate) => result.extend(coordinate as [number, number]),
        new maplibregl.LngLatBounds(
          allRouteCoordinates[0] as [number, number],
          allRouteCoordinates[0] as [number, number],
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
      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

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
    paint("east-route-line", "line-width", safe ? 3 : 7)
    paint("east-route-outline", "line-width", safe ? 5 : 11)
    paint("east-route-line", "line-dasharray", safe ? [1.4, 2.2] : undefined)

    const eta = etaRef.current
    if (eta) {
      const time = eta.querySelector("strong")
      const distance = eta.querySelector("span")
      if (time) time.textContent = routes[route].time
      if (distance) distance.textContent = routes[route].distance
    }
    etaMarkerRef.current?.setLngLat(
      safe ? [106.6817, 10.7707] : [106.6866, 10.7691],
    )
  }, [route, ready])

  const statusText =
    routeStatus === "live"
      ? `Tuyến thực tế · ${routes[route].distance} · ${routes[route].time}`
      : routeStatus === "fallback"
        ? "Tuyến dự phòng ngoại tuyến"
        : "Đang tải tuyến thực tế…"

  return (
    <div className="libre-map-shell">
      <div
        aria-label="Bản đồ tuyến đường từ Cơ sở 1 đến Cơ sở chính Đại học Sài Gòn"
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
