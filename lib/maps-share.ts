/** Deep-links compartilháveis para uma coordenada fixada (abre no Google Maps / Waze). */
export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function wazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Link universal de localização — como uma localização compartilhada no WhatsApp.
 * No celular o SO abre o seletor "abrir com" (Maps, Waze, Uber…); o `q=` mantém
 * o link utilizável onde o esquema puro não é honrado.
 */
export function geoUri(lat: number, lng: number): string {
  return `geo:${lat},${lng}?q=${lat},${lng}`;
}

/** Coordenada em texto legível. */
export function coordLabel(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
