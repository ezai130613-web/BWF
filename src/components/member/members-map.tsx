"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/loader";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

/** Searched point, the radius circle, and one pin per result member. */
export function MembersMap({
  center,
  radiusKm,
  members,
}: {
  center: { lat: number; lng: number; label: string };
  radiusKm: number;
  members: { id: string; name: string; lat: number; lng: number; subtitle: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const maps = await loadGoogleMaps();
        const [{ Map, Circle, InfoWindow }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
          maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        if (cancelled || !ref.current) return;
        const map = new Map(ref.current, { center, zoom: 13, mapId: MAP_ID, streetViewControl: false, mapTypeControl: false });
        const circle = new Circle({
          map,
          center,
          radius: radiusKm * 1000,
          strokeColor: "#1c5a3f",
          strokeWeight: 1.5,
          fillColor: "#2f7a56",
          fillOpacity: 0.08,
        });
        const bounds = circle.getBounds();
        if (bounds) map.fitBounds(bounds, 24);

        new AdvancedMarkerElement({
          map,
          position: center,
          title: center.label,
          content: new PinElement({ background: "#c9a063", borderColor: "#a97f45", glyphColor: "#0a2118" }).element,
        });
        const info = new InfoWindow();
        for (const m of members) {
          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: m.lat, lng: m.lng },
            title: m.name,
            content: new PinElement({ background: "#123d2c", borderColor: "#0a2118", glyphColor: "#e4cd9c" }).element,
          });
          marker.addListener("click", () => {
            const div = document.createElement("div");
            const strong = document.createElement("strong");
            strong.textContent = m.name;
            const small = document.createElement("div");
            small.textContent = m.subtitle;
            div.append(strong, small);
            info.setContent(div);
            info.open({ map, anchor: marker });
          });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [center, radiusKm, members]);

  if (failed) return null;
  return <div ref={ref} className="h-72 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-emerald-50 shadow-sm lg:h-full lg:min-h-[28rem]" aria-label="Map of nearby members" role="region" />;
}
