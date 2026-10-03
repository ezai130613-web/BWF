"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PlaceAutocomplete } from "@/components/maps/place-autocomplete";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps/loader";
import { inputClass, primaryButtonClass } from "@/components/member/ui";
import { RADIUS_OPTIONS } from "@/lib/geo";

/**
 * GET form for /member/search. Picking a Google suggestion fills hidden
 * lat/lng — the server searches by distance from those coordinates.
 * Editing the text afterwards drops them again, so a half-typed place is
 * never searched as if it were the old one.
 */
export function NearbySearchForm({
  defaults,
  chapters,
  categories,
}: {
  defaults: { q: string; place: string; lat: string; lng: string; radius: number; chapter: string; category: string };
  chapters: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const [coords, setCoords] = useState(defaults.lat && defaults.lng ? { lat: defaults.lat, lng: defaults.lng } : null);
  const [place, setPlace] = useState(defaults.place);

  return (
    <form action="/member/search" method="GET" className="grid gap-4 md:grid-cols-6">
      <input type="hidden" name="lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="lng" value={coords?.lng ?? ""} />
      <input type="hidden" name="place" value={place} />

      <div className="flex flex-col gap-1.5 md:col-span-3">
        <label htmlFor="nearby-place" className="text-sm font-medium text-neutral-800">
          Where are you?
        </label>
        {GOOGLE_MAPS_API_KEY ? (
          <PlaceAutocomplete
            id="nearby-place"
            defaultValue={defaults.place}
            placeholder="Start typing an area — e.g. Arumbakkam"
            inputClassName={inputClass}
            onSelect={(p) => {
              setCoords({ lat: String(p.lat), lng: String(p.lng) });
              setPlace(p.label);
            }}
            onTextChange={(text) => {
              setCoords(null);
              setPlace(text);
            }}
          />
        ) : (
          <input
            id="nearby-place"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="Area / locality (e.g. Royapettah)"
            className={inputClass}
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nearby-radius" className="text-sm font-medium text-neutral-800">
          Within
        </label>
        <select id="nearby-radius" name="radius" defaultValue={String(defaults.radius)} className={inputClass}>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r} km
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label htmlFor="nearby-q" className="text-sm font-medium text-neutral-800">
          Name or company (optional)
        </label>
        <input id="nearby-q" type="text" name="q" defaultValue={defaults.q} placeholder="e.g. Ramesh" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label htmlFor="nearby-chapter" className="text-sm font-medium text-neutral-800">
          Chapter
        </label>
        <select id="nearby-chapter" name="chapter" defaultValue={defaults.chapter} className={inputClass}>
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 md:col-span-2">
        <label htmlFor="nearby-category" className="text-sm font-medium text-neutral-800">
          Category
        </label>
        <select id="nearby-category" name="category" defaultValue={defaults.category} className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end md:col-span-2">
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          <Search className="h-4 w-4" aria-hidden /> Search
        </button>
      </div>
    </form>
  );
}
