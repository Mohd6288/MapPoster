import { Theme, Road, ParsedPolygon, BBox } from "./types";
import { getCropBounds, projectPoint, ProjectionBounds } from "./projection";

/** Reference width for road scaling (3600px at 12" * 300 DPI) */
const REF_WIDTH = 3600;

/** Road width in pixels at reference canvas width */
const ROAD_WIDTHS: Record<string, number> = {
  motorway: 3.6,
  motorway_link: 3.6,
  trunk: 3.0,
  trunk_link: 3.0,
  primary: 3.0,
  primary_link: 3.0,
  secondary: 2.4,
  secondary_link: 2.4,
  tertiary: 1.8,
  tertiary_link: 1.8,
  residential: 1.2,
  living_street: 1.2,
  unclassified: 1.2,
};

/** Road drawing priority (lower = drawn first / behind) */
const ROAD_PRIORITY: Record<string, number> = {
  residential: 0,
  living_street: 0,
  unclassified: 0,
  tertiary_link: 1,
  tertiary: 1,
  secondary_link: 2,
  secondary: 2,
  primary_link: 3,
  primary: 3,
  trunk_link: 3,
  trunk: 3,
  motorway_link: 4,
  motorway: 4,
};

function getRoadColor(highwayType: string, theme: Theme): string {
  if (highwayType === "motorway" || highwayType === "motorway_link")
    return theme.road_motorway;
  if (
    highwayType === "trunk" ||
    highwayType === "trunk_link" ||
    highwayType === "primary" ||
    highwayType === "primary_link"
  )
    return theme.road_primary;
  if (highwayType === "secondary" || highwayType === "secondary_link")
    return theme.road_secondary;
  if (highwayType === "tertiary" || highwayType === "tertiary_link")
    return theme.road_tertiary;
  if (
    highwayType === "residential" ||
    highwayType === "living_street" ||
    highwayType === "unclassified"
  )
    return theme.road_residential;
  return theme.road_default;
}

function getRoadWidth(
  highwayType: string,
  canvasWidth: number,
  multiplier: number
): number {
  const baseWidth = ROAD_WIDTHS[highwayType] ?? 1.2;
  return baseWidth * (canvasWidth / REF_WIDTH) * multiplier;
}

function isLatinScript(text: string): boolean {
  let latinCount = 0;
  let totalAlpha = 0;
  for (const char of text) {
    if (/\p{L}/u.test(char)) {
      totalAlpha++;
      if ((char.codePointAt(0) ?? 0) < 0x250) {
        latinCount++;
      }
    }
  }
  return totalAlpha === 0 || latinCount / totalAlpha > 0.8;
}

/** Parse hex color to [r, g, b] in 0-255 range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

export interface RenderOptions {
  theme: Theme;
  roads: Road[];
  polygons: ParsedPolygon[];
  bbox: BBox;
  canvasWidth: number;
  canvasHeight: number;
  displayCity: string;
  displayCountry: string;
  lat: number;
  lon: number;
  widthInches: number;
  heightInches: number;
  fontFamily?: string;
  fontSizeScale?: number;
  letterSpacingScale?: number;
  roadWidthMultiplier?: number;
}

/**
 * Load a Google Font dynamically into the document.
 * Returns a promise that resolves when the font is ready.
 */
export async function loadGoogleFont(family: string): Promise<void> {
  if (!family || family.toLowerCase() === "roboto") return;

  const id = `gfont-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) {
    // Already loaded, just wait for it to be available
    await document.fonts.ready;
    return;
  }

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;700&display=swap`;
  document.head.appendChild(link);

  // Wait for the font to actually load
  await document.fonts.ready;

  // Give an extra moment for the font to register
  await new Promise((r) => setTimeout(r, 100));
}

/**
 * Render the poster onto a canvas element.
 */
export function renderPoster(
  canvas: HTMLCanvasElement,
  opts: RenderOptions
): void {
  const {
    theme,
    roads,
    polygons,
    bbox,
    canvasWidth,
    canvasHeight,
    displayCity,
    displayCountry,
    lat,
    lon,
    widthInches,
    heightInches,
    fontFamily = "Roboto",
    fontSizeScale = 1.0,
    letterSpacingScale = 1.0,
    roadWidthMultiplier = 1.0,
  } = opts;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d")!;
  const bounds = getCropBounds(bbox, canvasWidth, canvasHeight);

  // === Layer 0: Background fill ===
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // === Layer 0.5: Water polygons ===
  drawPolygons(
    ctx,
    polygons,
    "water",
    theme.water,
    bounds,
    canvasWidth,
    canvasHeight
  );

  // === Layer 0.8: Park polygons ===
  drawPolygons(
    ctx,
    polygons,
    "park",
    theme.parks,
    bounds,
    canvasWidth,
    canvasHeight
  );

  // === Layer 1: Roads ===
  drawRoads(ctx, roads, theme, bounds, canvasWidth, canvasHeight, roadWidthMultiplier);

  // === Layer 10: Gradient fades ===
  drawGradients(ctx, theme.gradient_color, canvasWidth, canvasHeight);

  // === Layer 11: Typography ===
  drawTypography(
    ctx,
    theme,
    displayCity,
    displayCountry,
    lat,
    lon,
    canvasWidth,
    canvasHeight,
    widthInches,
    heightInches,
    fontFamily,
    fontSizeScale,
    letterSpacingScale
  );
}

function drawPolygons(
  ctx: CanvasRenderingContext2D,
  polygons: ParsedPolygon[],
  type: "water" | "park",
  color: string,
  bounds: ProjectionBounds,
  cw: number,
  ch: number
): void {
  const filtered = polygons.filter((p) => p.type === type);
  ctx.fillStyle = color;

  for (const poly of filtered) {
    ctx.beginPath();
    for (const ring of poly.rings) {
      if (ring.length < 3) continue;
      const first = projectPoint(ring[0].lat, ring[0].lon, bounds, cw, ch);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < ring.length; i++) {
        const pt = projectPoint(ring[i].lat, ring[i].lon, bounds, cw, ch);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
    }
    ctx.fill("evenodd");
  }
}

function drawRoads(
  ctx: CanvasRenderingContext2D,
  roads: Road[],
  theme: Theme,
  bounds: ProjectionBounds,
  cw: number,
  ch: number,
  roadWidthMultiplier: number
): void {
  const sorted = [...roads].sort((a, b) => {
    const pa = ROAD_PRIORITY[a.highwayType] ?? 0;
    const pb = ROAD_PRIORITY[b.highwayType] ?? 0;
    return pa - pb;
  });

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const road of sorted) {
    if (road.nodes.length < 2) continue;

    ctx.strokeStyle = getRoadColor(road.highwayType, theme);
    ctx.lineWidth = getRoadWidth(road.highwayType, cw, roadWidthMultiplier);

    ctx.beginPath();
    const first = projectPoint(
      road.nodes[0].lat,
      road.nodes[0].lon,
      bounds,
      cw,
      ch
    );
    ctx.moveTo(first.x, first.y);

    for (let i = 1; i < road.nodes.length; i++) {
      const pt = projectPoint(
        road.nodes[i].lat,
        road.nodes[i].lon,
        bounds,
        cw,
        ch
      );
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }
}

function drawGradients(
  ctx: CanvasRenderingContext2D,
  gradientColor: string,
  cw: number,
  ch: number
): void {
  const [r, g, b] = hexToRgb(gradientColor);

  const topGrad = ctx.createLinearGradient(0, 0, 0, ch * 0.25);
  topGrad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  topGrad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, cw, ch * 0.25);

  const botGrad = ctx.createLinearGradient(0, ch * 0.75, 0, ch);
  botGrad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  botGrad.addColorStop(1, `rgba(${r},${g},${b},1)`);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, ch * 0.75, cw, ch * 0.25);
}

function drawTypography(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  displayCity: string,
  displayCountry: string,
  lat: number,
  lon: number,
  cw: number,
  ch: number,
  widthInches: number,
  heightInches: number,
  fontFamily: string,
  fontSizeScale: number,
  letterSpacingScale: number
): void {
  const scaleFactor = Math.min(heightInches, widthInches) / 12.0;
  const font = fontFamily || "Roboto";

  const baseMain = 60;
  const baseSub = 22;
  const baseCoords = 14;

  const pxScale = cw / (widthInches * 72);

  // Dynamic city font size with user scale
  const cityCharCount = displayCity.length;
  let mainFontSize = baseMain * scaleFactor * fontSizeScale;
  if (cityCharCount > 10) {
    const lengthFactor = 10 / cityCharCount;
    mainFontSize = Math.max(
      mainFontSize * lengthFactor,
      10 * scaleFactor * fontSizeScale
    );
  }
  const mainPx = mainFontSize * pxScale;
  const subPx = baseSub * scaleFactor * pxScale * fontSizeScale;
  const coordsPx = baseCoords * scaleFactor * pxScale;
  const attrPx = 8 * pxScale;

  // Format city name with letter spacing
  let formattedCity: string;
  if (isLatinScript(displayCity)) {
    const baseSpaces = 2;
    const spaces = Math.max(1, Math.round(baseSpaces * letterSpacingScale));
    const spacer = " ".repeat(spaces);
    formattedCity = displayCity.toUpperCase().split("").join(spacer);
  } else {
    formattedCity = displayCity;
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // City name at y = 0.86
  ctx.fillStyle = theme.text;
  ctx.font = `bold ${mainPx}px "${font}", sans-serif`;
  ctx.fillText(formattedCity, cw / 2, ch * 0.86);

  // Divider line at y = 0.875
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1 * scaleFactor * pxScale;
  ctx.beginPath();
  ctx.moveTo(cw * 0.4, ch * 0.875);
  ctx.lineTo(cw * 0.6, ch * 0.875);
  ctx.stroke();

  // Country at y = 0.90
  ctx.font = `300 ${subPx}px "${font}", sans-serif`;
  ctx.fillStyle = theme.text;
  ctx.fillText(displayCountry.toUpperCase(), cw / 2, ch * 0.9);

  // Coordinates at y = 0.93
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  const coordsText = `${Math.abs(lat).toFixed(4)}\u00b0 ${latDir} / ${Math.abs(lon).toFixed(4)}\u00b0 ${lonDir}`;

  ctx.globalAlpha = 0.7;
  ctx.font = `${coordsPx}px "${font}", sans-serif`;
  ctx.fillStyle = theme.text;
  ctx.fillText(coordsText, cw / 2, ch * 0.93);
  ctx.globalAlpha = 1;

  // Attribution at y = 0.98
  ctx.globalAlpha = 0.5;
  ctx.font = `300 ${attrPx}px "${font}", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("\u00a9 OpenStreetMap contributors", cw * 0.98, ch * 0.98);
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
}
