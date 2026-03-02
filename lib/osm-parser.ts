import { OverpassResponse, OverpassElement, Road, ParsedPolygon } from "./types";

interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Parse Overpass road response into Road[].
 */
export function parseRoads(data: OverpassResponse): Road[] {
  // Build node coordinate map
  const nodeMap = new Map<number, LatLon>();
  for (const el of data.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  // Extract ways with highway tag
  const roads: Road[] = [];
  for (const el of data.elements) {
    if (el.type === "way" && el.tags?.highway && el.nodes) {
      const nodes: LatLon[] = [];
      for (const nodeId of el.nodes) {
        const coord = nodeMap.get(nodeId);
        if (coord) nodes.push(coord);
      }
      if (nodes.length >= 2) {
        roads.push({
          highwayType: el.tags.highway,
          nodes,
        });
      }
    }
  }

  return roads;
}

/**
 * Parse Overpass feature response into water and park polygons.
 */
export function parseFeatures(data: OverpassResponse): ParsedPolygon[] {
  const nodeMap = new Map<number, LatLon>();
  const wayMap = new Map<number, number[]>();

  for (const el of data.elements) {
    if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    }
    if (el.type === "way" && el.nodes) {
      wayMap.set(el.id, el.nodes);
    }
  }

  const polygons: ParsedPolygon[] = [];

  for (const el of data.elements) {
    if (el.type === "way" && el.nodes && el.tags) {
      const polyType = getPolygonType(el);
      if (!polyType) continue;

      // Closed way = polygon
      const nodeIds = el.nodes;
      if (nodeIds.length >= 3) {
        const ring = resolveNodes(nodeIds, nodeMap);
        if (ring.length >= 3) {
          polygons.push({ type: polyType, rings: [ring] });
        }
      }
    }

    if (el.type === "relation" && el.members && el.tags) {
      const polyType = getPolygonType(el);
      if (!polyType) continue;

      // Multipolygon relation: join outer/inner ways into rings
      const outerWays: number[][] = [];
      const innerWays: number[][] = [];

      for (const member of el.members) {
        if (member.type === "way") {
          const wayNodes = wayMap.get(member.ref);
          if (wayNodes) {
            if (member.role === "inner") {
              innerWays.push(wayNodes);
            } else {
              outerWays.push(wayNodes);
            }
          }
        }
      }

      const outerRings = joinWaysIntoRings(outerWays, nodeMap);
      const innerRings = joinWaysIntoRings(innerWays, nodeMap);

      for (const ring of outerRings) {
        if (ring.length >= 3) {
          const rings = [ring, ...innerRings.filter((r) => r.length >= 3)];
          polygons.push({ type: polyType, rings });
        }
      }
    }
  }

  return polygons;
}

function getPolygonType(
  el: OverpassElement
): "water" | "park" | null {
  if (!el.tags) return null;
  const { natural, waterway, leisure, landuse } = el.tags;
  if (
    natural === "water" ||
    natural === "bay" ||
    natural === "strait" ||
    waterway === "riverbank"
  ) {
    return "water";
  }
  if (leisure === "park" || landuse === "grass") {
    return "park";
  }
  return null;
}

function resolveNodes(
  nodeIds: number[],
  nodeMap: Map<number, LatLon>
): LatLon[] {
  const result: LatLon[] = [];
  for (const id of nodeIds) {
    const coord = nodeMap.get(id);
    if (coord) result.push(coord);
  }
  return result;
}

/**
 * Join disconnected way segments into closed rings by matching endpoints.
 */
function joinWaysIntoRings(
  ways: number[][],
  nodeMap: Map<number, LatLon>
): LatLon[][] {
  if (ways.length === 0) return [];

  const rings: LatLon[][] = [];
  const remaining = ways.map((w) => [...w]);

  while (remaining.length > 0) {
    const current = remaining.shift()!;

    let changed = true;
    while (changed) {
      changed = false;
      const first = current[0];
      const last = current[current.length - 1];

      // Check if closed
      if (first === last && current.length > 3) break;

      for (let i = 0; i < remaining.length; i++) {
        const other = remaining[i];
        const otherFirst = other[0];
        const otherLast = other[other.length - 1];

        if (last === otherFirst) {
          // Append other (skip duplicate node)
          current.push(...other.slice(1));
          remaining.splice(i, 1);
          changed = true;
          break;
        } else if (last === otherLast) {
          // Append reversed other
          current.push(...other.slice(0, -1).reverse());
          remaining.splice(i, 1);
          changed = true;
          break;
        } else if (first === otherLast) {
          // Prepend other
          current.unshift(...other.slice(0, -1));
          remaining.splice(i, 1);
          changed = true;
          break;
        } else if (first === otherFirst) {
          // Prepend reversed other
          current.unshift(...other.slice(1).reverse());
          remaining.splice(i, 1);
          changed = true;
          break;
        }
      }
    }

    const ring = resolveNodes(current, nodeMap);
    if (ring.length >= 3) {
      rings.push(ring);
    }
  }

  return rings;
}
