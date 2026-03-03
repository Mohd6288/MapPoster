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
 * Uses Map-based index for O(n) amortized lookups instead of O(n^2) linear scan.
 */
function joinWaysIntoRings(
  ways: number[][],
  nodeMap: Map<number, LatLon>
): LatLon[][] {
  if (ways.length === 0) return [];

  const rings: LatLon[][] = [];
  const wayData = ways.map((w) => [...w]);

  // Index ways by their first and last node IDs for O(1) lookup
  const byFirst = new Map<number, number[]>();
  const byLast = new Map<number, number[]>();

  for (let i = 0; i < wayData.length; i++) {
    const w = wayData[i];
    const first = w[0];
    const last = w[w.length - 1];
    if (!byFirst.has(first)) byFirst.set(first, []);
    byFirst.get(first)!.push(i);
    if (!byLast.has(last)) byLast.set(last, []);
    byLast.get(last)!.push(i);
  }

  const used = new Set<number>();

  for (let startIdx = 0; startIdx < wayData.length; startIdx++) {
    if (used.has(startIdx)) continue;
    used.add(startIdx);
    idxRemove(byFirst, wayData[startIdx][0], startIdx);
    idxRemove(byLast, wayData[startIdx][wayData[startIdx].length - 1], startIdx);

    const current = wayData[startIdx];
    let changed = true;
    while (changed) {
      changed = false;
      const first = current[0];
      const last = current[current.length - 1];
      if (first === last && current.length > 3) break;

      // Extend from end: find way starting with `last`
      let match = idxFind(byFirst, last, used);
      if (match !== -1) {
        const other = wayData[match];
        used.add(match);
        idxRemove(byFirst, other[0], match);
        idxRemove(byLast, other[other.length - 1], match);
        current.push(...other.slice(1));
        changed = true;
        continue;
      }
      // Find way ending with `last` (append reversed)
      match = idxFind(byLast, last, used);
      if (match !== -1) {
        const other = wayData[match];
        used.add(match);
        idxRemove(byFirst, other[0], match);
        idxRemove(byLast, other[other.length - 1], match);
        current.push(...other.slice(0, -1).reverse());
        changed = true;
        continue;
      }
      // Extend from front: find way ending with `first`
      match = idxFind(byLast, first, used);
      if (match !== -1) {
        const other = wayData[match];
        used.add(match);
        idxRemove(byFirst, other[0], match);
        idxRemove(byLast, other[other.length - 1], match);
        current.unshift(...other.slice(0, -1));
        changed = true;
        continue;
      }
      // Find way starting with `first` (prepend reversed)
      match = idxFind(byFirst, first, used);
      if (match !== -1) {
        const other = wayData[match];
        used.add(match);
        idxRemove(byFirst, other[0], match);
        idxRemove(byLast, other[other.length - 1], match);
        current.unshift(...other.slice(1).reverse());
        changed = true;
        continue;
      }
    }

    const ring = resolveNodes(current, nodeMap);
    if (ring.length >= 3) {
      rings.push(ring);
    }
  }

  return rings;
}

function idxRemove(index: Map<number, number[]>, key: number, val: number): void {
  const arr = index.get(key);
  if (!arr) return;
  const idx = arr.indexOf(val);
  if (idx !== -1) arr.splice(idx, 1);
  if (arr.length === 0) index.delete(key);
}

function idxFind(index: Map<number, number[]>, key: number, used: Set<number>): number {
  const arr = index.get(key);
  if (!arr) return -1;
  for (const i of arr) {
    if (!used.has(i)) return i;
  }
  return -1;
}
