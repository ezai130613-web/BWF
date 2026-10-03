"use client";

import { useState } from "react";
import { PlaceAutocomplete } from "@/components/maps/place-autocomplete";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps/loader";

/**
 * Form field that stores a member's business location as coordinates
 * (hidden latitude/longitude/locationLabel inputs) from a Google Places
 * selection — what the member-portal radius search reads.
 */
export function LocationPickerField({
  label = "Business location (for nearby-member search)",
  defaultLabel,
  defaultLat,
  defaultLng,
  inputClassName,
}: {
  label?: string;
  defaultLabel: string | null;
  defaultLat: number | null;
  defaultLng: number | null;
  inputClassName?: string;
}) {
  const [place, setPlace] = useState(
    defaultLat !== null && defaultLng !== null ? { label: defaultLabel ?? "", lat: defaultLat, lng: defaultLng } : null,
  );

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700 sm:col-span-2">
      {label}
      <input type="hidden" name="locationLabel" value={place?.label ?? ""} />
      <input type="hidden" name="latitude" value={place ? String(place.lat) : ""} />
      <input type="hidden" name="longitude" value={place ? String(place.lng) : ""} />
      {GOOGLE_MAPS_API_KEY ? (
        <PlaceAutocomplete
          ariaLabel={label}
          defaultValue={defaultLabel ?? ""}
          placeholder="Start typing an area, e.g. Arumbakkam"
          inputClassName={
            inputClassName ??
            "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal text-neutral-900 focus:border-neutral-900 focus:outline-none"
          }
          onSelect={setPlace}
        />
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs font-normal text-neutral-500">
          Location search isn&rsquo;t configured yet (Google Maps key missing).
          {defaultLabel ? ` Current: ${defaultLabel}.` : ""}
        </p>
      )}
      <span className="text-xs font-normal text-neutral-500">
        {place ? `Saved coordinates: ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}` : "No coordinates yet — pick a suggestion from the list."}
      </span>
    </div>
  );
}
