import { darkColors, type ThemeColors } from "@/context/ThemeContext";

export const STREET_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>';

export function streetMapTileUrl(colors: ThemeColors) {
  const style = colors.bg === darkColors.bg ? "dark_all" : "light_all";
  const key = process.env.EXPO_PUBLIC_CARTO_API_KEY;
  return `https://basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png${key ? `?key=${encodeURIComponent(key)}` : ""}`;
}

/** Use the basemap's original colors; theme only the surrounding map controls. */
export function streetMapThemeCss(colors: ThemeColors) {
  return `
    .leaflet-container { background: ${colors.bg}; }
    .leaflet-control-attribution,
    .leaflet-bar a { background: ${colors.surface}; color: ${colors.text}; }
    .leaflet-control-attribution a { color: ${colors.textSub}; }
    .leaflet-control-attribution { opacity: 1; }
    .leaflet-bar a:hover { background: ${colors.surfaceRaised}; }
  `;
}
