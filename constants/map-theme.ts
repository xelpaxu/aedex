import type { ThemeColors } from "@/context/ThemeContext";

export const STREET_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function streetMapTileUrl() {
  return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
}

/** Filter only street tiles, preserving satellite imagery and report colors. */
export function streetMapThemeCss(colors: ThemeColors) {
  return `
    .aedex-street-tiles { filter: grayscale(1) invert(1) sepia(0.35) saturate(1.8) hue-rotate(125deg) brightness(0.85) contrast(0.9); }
    .leaflet-container { background: ${colors.bg}; }
    .leaflet-control-attribution,
    .leaflet-bar a { background: ${colors.surface}; color: ${colors.text}; }
    .leaflet-control-attribution a { color: ${colors.textSub}; }
    .leaflet-control-attribution { opacity: 1; }
    .leaflet-bar a:hover { background: ${colors.surfaceRaised}; }
  `;
}
