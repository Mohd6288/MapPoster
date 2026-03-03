import { BBox, OverpassResponse } from "./types";

const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Calculate bounding box from center point + distance in meters.
 * Uses the same compensated_dist formula from the Python code.
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
export async function fetchRoads(bbox: BBox, signal?: AbortSignal): Promise<OverpassResponse> {
  const bb = bboxString(bbox);
  const query = `
[out:json][timeout:30];
(
  way["highway"~"motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|residential|living_street|unclassified"](${bb});
);
out body;
>;
out skel qt;
`;
  return overpassFetch(query, signal);
}

/**
 * Fetch water and park features from Overpass API.
 */
export async function fetchFeatures(bbox: BBox, signal?: AbortSignal): Promise<OverpassResponse> {
  const bb = bboxString(bbox);
  const query = `
[out:json][timeout:30];
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
  return overpassFetch(query, signal);
}

async function overpassFetch(query: string, externalSignal?: AbortSignal): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Cycle through servers on retries
    const serverUrl = OVERPASS_SERVERS[attempt % OVERPASS_SERVERS.length];

    try {
      // Abort if caller cancels or timeout expires
      if (externalSignal?.aborted) throw new DOMException("Aborted", "AbortError");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      // Forward external abort to our controller
      const onExternalAbort = () => controller.abort();
      externalSignal?.addEventListener("abort", onExternalAbort, { once: true });

      const res = await fetch(serverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onExternalAbort);

      if (res.status === 429) {
        // Rate limited — wait and try another server
        lastError = new Error("Server busy, retrying...");
        await delay(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      if (res.status === 504 || res.status === 503) {
        // Gateway timeout or service unavailable — try another server
        lastError = new Error("Server timeout, retrying...");
        await delay(RETRY_DELAY_MS);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Overpass API error: ${res.status} ${res.statusText}`);
      }

      return res.json();
    } catch (err) {
      // If user cancelled, throw immediately — don't retry
      if (externalSignal?.aborted) {
        throw new DOMException("Generation cancelled", "AbortError");
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new Error(
          "Request timed out. Try reducing the coverage distance."
        );
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        lastError = new Error(
          "Network error. Check your internet connection."
        );
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError || new Error("Failed to fetch map data after multiple attempts.");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
