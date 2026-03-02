import { BBox, OverpassResponse } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

/**
 * Calculate bounding box from center point + distance in meters.
 * Uses the same compensated_dist formula from the Python code:
 *   compensated_dist = dist * (max(h,w) / min(h,w)) / 4
 */
export function calculateBBox(
  lat: number,
  lon: number,
  distMeters: number,
  widthInches: number,
  heightInches: number
): BBox {
  const compensatedDist =
    distMeters *
    (Math.max(heightInches, widthInches) /
      Math.min(heightInches, widthInches)) /
    4;

  // Degrees per meter at given latitude
  const latDeg = compensatedDist / 111320;
  const lonDeg = compensatedDist / (111320 * Math.cos((lat * Math.PI) / 180));

  return {
    south: lat - latDeg,
    west: lon - lonDeg,
    north: lat + latDeg,
    east: lon + lonDeg,
  };
}

function bboxString(bbox: BBox): string {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
}

/**
 * Fetch roads from Overpass API.
 */
export async function fetchRoads(bbox: BBox): Promise<OverpassResponse> {
  const bb = bboxString(bbox);
  const query = `
[out:json][timeout:60];
(
  way["highway"~"motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|unclassified"](${bb});
);
out body;
>;
out skel qt;
`;
  return overpassFetch(query);
}

/**
 * Fetch water and park features from Overpass API.
 */
export async function fetchFeatures(bbox: BBox): Promise<OverpassResponse> {
  const bb = bboxString(bbox);
  const query = `
[out:json][timeout:60];
(
  way["natural"~"water|bay|strait"](${bb});
  relation["natural"~"water|bay|strait"](${bb});
  way["waterway"="riverbank"](${bb});
  relation["waterway"="riverbank"](${bb});
  way["leisure"="park"](${bb});
  relation["leisure"="park"](${bb});
  way["landuse"="grass"](${bb});
  relation["landuse"="grass"](${bb});
);
out body;
>;
out skel qt;
`;
  return overpassFetch(query);
}

async function overpassFetch(query: string): Promise<OverpassResponse> {
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
