import { darkColors, ThemeColors } from "@/context/ThemeContext";

/** Filter only street tiles so report colors and satellite imagery stay accurate. */
export function streetMapThemeCss(colors: ThemeColors) {
  const filter = colors.bg === darkColors.bg
    ? "invert(1) hue-rotate(155deg) saturate(0.45) brightness(0.85) contrast(0.9)"
    : "grayscale(0.7) sepia(0.12) hue-rotate(115deg) saturate(0.65)";

  return `
    .aedex-street-tiles { filter: ${filter}; }
    .leaflet-container { background: ${colors.bg}; }
    .leaflet-control-attribution,
    .leaflet-bar a { background: ${colors.surface}; color: ${colors.text}; }
    .leaflet-control-attribution a { color: ${colors.textSub}; }
    .leaflet-control-attribution { opacity: 1; }
    .leaflet-bar a:hover { background: ${colors.surfaceRaised}; }
  `;
}
