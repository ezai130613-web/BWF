/** Member-portal nearby search radius choices (km); 5 is the default. */
export const RADIUS_OPTIONS = [2, 5, 10, 25];

/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isValidLatLng(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** "2.3 KM away" / "450 m away" */
export function formatDistance(km: number) {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m away` : `${km.toFixed(1)} KM away`;
}
