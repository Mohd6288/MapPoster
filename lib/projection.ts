import { BBox } from "./types";

export interface ProjectionBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

/**
 * Calculate cropped bounds matching Python get_crop_limits() logic.
 * Takes the raw data bbox and crops it to match the target aspect ratio.
 */
export function getCropBounds(
  dataBBox: BBox,
  canvasWidth: number,
  canvasHeight: number
): ProjectionBounds {
  const centerLat = (dataBBox.south + dataBBox.north) / 2;
  const centerLon = (dataBBox.west + dataBBox.east) / 2;

  // Half extents in degrees
  let halfLat = (dataBBox.north - dataBBox.south) / 2;
  let halfLon = (dataBBox.east - dataBBox.west) / 2;

  // Target aspect ratio (width / height)
  const aspect = canvasWidth / canvasHeight;

  // Current aspect in "visual" space (lon degrees adjusted for latitude)
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const currentVisualWidth = halfLon * cosLat;
  const currentVisualHeight = halfLat;

  const currentAspect = currentVisualWidth / currentVisualHeight;

  if (currentAspect > aspect) {
    // Too wide → reduce longitude extent
    halfLon = (halfLat * aspect) / cosLat;
  } else {
    // Too tall → reduce latitude extent
    halfLat = (halfLon * cosLat) / aspect;
  }

  return {
    minLat: centerLat - halfLat,
    maxLat: centerLat + halfLat,
    minLon: centerLon - halfLon,
    maxLon: centerLon + halfLon,
  };
}

/**
 * Project lat/lon to canvas pixel coordinates.
 * Equirectangular approximation (accurate to <0.1% at city scale).
 */
export function projectPoint(
  lat: number,
  lon: number,
  bounds: ProjectionBounds,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  const x =
    ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * canvasWidth;
  const y =
    ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * canvasHeight;
  return { x, y };
}
