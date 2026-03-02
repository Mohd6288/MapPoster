export interface Theme {
  id: string;
  name: string;
  description: string;
  bg: string;
  text: string;
  gradient_color: string;
  water: string;
  parks: string;
  road_motorway: string;
  road_primary: string;
  road_secondary: string;
  road_tertiary: string;
  road_residential: string;
  road_default: string;
}

export interface PosterConfig {
  city: string;
  country: string;
  lat: number;
  lon: number;
  theme: Theme;
  distance: number;
  width: number;
  height: number;
  format: "png" | "svg" | "pdf";
  displayCity: string;
  displayCountry: string;
  fontFamily: string;
  fontSizeScale: number;
  letterSpacingScale: number;
  roadWidthMultiplier: number;
}

export interface SizePreset {
  label: string;
  width: number;
  height: number;
}

export interface Road {
  highwayType: string;
  nodes: { lat: number; lon: number }[];
}

export interface ParsedPolygon {
  type: "water" | "park";
  rings: { lat: number; lon: number }[][];
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  members?: { type: string; ref: number; role: string }[];
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export type GenerationStep =
  | "idle"
  | "geocoding"
  | "fetching-roads"
  | "fetching-features"
  | "rendering"
  | "exporting"
  | "done"
  | "error";
