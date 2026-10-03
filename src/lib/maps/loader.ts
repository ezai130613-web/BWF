/**
 * Loads the Google Maps JavaScript API once per page, on demand
 * (2026-10-03, member location search). Requires
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY with "Maps JavaScript API" and
 * "Places API (New)" enabled — restrict the key to this site's HTTP
 * referrers in Google Cloud, since it is necessarily public. Without a key
 * every caller degrades to plain text input (see PlaceAutocomplete).
 *
 * Deliberately not a "use client" module: server pages read
 * GOOGLE_MAPS_API_KEY too, and a client-module export would arrive there as
 * an (always truthy) client reference. loadGoogleMaps() only runs in the browser.
 */

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let loading: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (!GOOGLE_MAPS_API_KEY) return Promise.reject(new Error("Google Maps API key not configured"));
  if (typeof window !== "undefined" && typeof window.google?.maps?.importLibrary === "function") return Promise.resolve(window.google.maps);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const callbackName = "__bwfGoogleMapsReady";
    (window as unknown as Record<string, () => void>)[callbackName] = () => resolve(window.google.maps);
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      loading: "async",
      libraries: "places,marker",
      region: "IN",
      callback: callbackName,
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
