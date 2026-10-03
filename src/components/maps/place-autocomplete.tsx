"use client";

import { useEffect, useId, useRef, useState } from "react";
import { GOOGLE_MAPS_API_KEY, loadGoogleMaps } from "@/lib/maps/loader";

export type SelectedPlace = { label: string; lat: number; lng: number };

type Suggestion = { id: string; main: string; secondary: string; prediction: google.maps.places.PlacePrediction };

// Bias (not restrict) suggestions toward Chennai — every chapter is there,
// but a member may work anywhere in India.
const CHENNAI = { lat: 13.0827, lng: 80.2707 };

/**
 * Google Places (New) autocomplete — typing "Arum" suggests "Arumbakkam,
 * Chennai, Tamil Nadu". Selecting a suggestion resolves the place's real
 * coordinates; the search/radius logic uses those, never the typed text.
 * With no API key configured it is a plain text input and never calls
 * onSelect, so callers must handle "text only, no coordinates".
 */
export function PlaceAutocomplete({
  defaultValue = "",
  placeholder,
  inputClassName,
  onSelect,
  onTextChange,
  name,
  id,
  ariaLabel,
}: {
  defaultValue?: string;
  placeholder?: string;
  inputClassName?: string;
  onSelect: (place: SelectedPlace) => void;
  /** Fires on every keystroke — callers usually clear any previously-selected coordinates here. */
  onTextChange?: (text: string) => void;
  name?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const placesRef = useRef<google.maps.PlacesLibrary | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>)
      .then((lib) => {
        if (!cancelled) placesRef.current = lib;
      })
      .catch(() => {
        if (!cancelled) setError("Location suggestions are unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const places = placesRef.current;
    const query = text.trim();
    if (!places || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const requestId = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        tokenRef.current ??= new places.AutocompleteSessionToken();
        const { suggestions: results } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: tokenRef.current,
          includedRegionCodes: ["in"],
          locationBias: { center: CHENNAI, radius: 50000 },
        });
        if (requestId !== requestRef.current) return;
        setSuggestions(
          results
            .map((r) => r.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => Boolean(p))
            .map((p) => ({
              id: p.placeId,
              main: p.mainText?.toString() ?? p.text.toString(),
              secondary: p.secondaryText?.toString() ?? "",
              prediction: p,
            })),
        );
        setActive(-1);
      } catch {
        if (requestId === requestRef.current) setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [text]);

  async function choose(s: Suggestion) {
    setOpen(false);
    const label = [s.main, s.secondary].filter(Boolean).join(", ");
    setText(label);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      tokenRef.current = null; // a session ends with the details fetch
      if (place.location) onSelect({ label, lat: place.location.lat(), lng: place.location.lng() });
      else setError("Couldn't find coordinates for that place — try another suggestion.");
    } catch {
      setError("Couldn't look up that place — try again.");
    }
  }

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setError(null);
          onTextChange?.(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            void choose(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(s);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-emerald-50" : ""}`}
            >
              <span className="font-medium text-neutral-900">{s.main}</span>
              {s.secondary ? <span className="ml-1 text-neutral-500">{s.secondary}</span> : null}
            </li>
          ))}
          <li className="px-3 pb-1 pt-2 text-right text-[10px] text-neutral-400">Powered by Google</li>
        </ul>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
