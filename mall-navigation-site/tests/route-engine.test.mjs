import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseMapNodes, buildWalkableMap, findRoute, describeRoute, matchDestination, defaultStart, polygonCentroid, segmentClear,
  parseServedFloors, collectShafts, planFloorTransitions, planMultiFloorRoute,
} from "../src/routeEngine.js";

const root = resolve(import.meta.dirname, "..");
const mapDir = resolve(root, "src/maps");
const floors = {
  B1: "basement-1-right-list.svg",
  "1F": "level-1-right-list.svg",
  "2F": "level-2-right-list.svg",
  "3F": "level-3-right-list.svg",
  "4F": "level-4-right-list.svg",
  "5F": "level-5-right-list.svg",
  "6F": "level-6-right-list.svg",
  "7F": "level-7-right-list.svg",
  "8F": "level-8-right-list.svg",
  "9F": "level-9-right-list.svg",
  "10F": "level-10-right-list.svg",
};
const svgFor = (floor) => readFileSync(resolve(mapDir, floors[floor]), "utf8");
const farthestFrom = (nodes, point) => nodes.reduce((a, b) => (Math.hypot(b.x - point.x, b.y - point.y) > Math.hypot(a.x - point.x, a.y - point.y) ? b : a));

let allFloorsCache = null;
const allFloors = () => {
  if (!allFloorsCache) {
    allFloorsCache = {};
    for (const floor of Object.keys(floors)) allFloorsCache[floor] = parseMapNodes(svgFor(floor));
  }
  return allFloorsCache;
};
const createGetMap = (floorsData) => {
  const cache = new Map();
  return (floor) => {
    if (!cache.has(floor)) cache.set(floor, buildWalkableMap(floorsData[floor]));
    return cache.get(floor);
  };
};

test("polygonCentroid computes a stable centroid for hit outlines", () => {
  const center = polygonCentroid("M0 0 L10 0 L10 10 L0 10 Z");
  assert.ok(center);
  assert.ok(Math.abs(center.x - 5) < 1e-6 && Math.abs(center.y - 5) < 1e-6);
  const single = polygonCentroid("M3 4");
  assert.equal(single.x, 3, "single point falls back to itself");
  assert.equal(single.y, 4);
});

test("1F map parses gates, facilities, destinations and routing geometry", () => {
  const { starts, destinations, obstacles, walkable } = parseMapNodes(svgFor("1F"));
  const gates = starts.filter((s) => s.kind === "gate");
  const elevators = starts.filter((s) => s.kind === "elevator");
  const stairs = starts.filter((s) => s.kind === "stairs");
  assert.equal(gates.length, 4, "four entrances expected on 1F");
  assert.ok(elevators.length > 0 && stairs.length > 0, "facilities should be present");
  assert.ok(destinations.length >= 5, "shop destinations should be present");
  assert.ok(walkable.length >= 1, "floor plate polygon should be extracted");
  assert.ok(obstacles.length >= 20, "shop wall polygons should be extracted");
  for (const node of [...starts, ...destinations]) {
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `${node.id} has coordinates`);
    assert.ok(node.name, `${node.id} has a readable name`);
  }
  assert.ok(!destinations.some((d) => /gate/i.test(d.id)), "gates are start options, not destinations");
  assert.ok(!destinations.some((d) => /mother|baby/i.test(d.id + d.name)), "service rooms are excluded");
});

test("every floor SVG parses into navigable nodes", () => {
  for (const [floor, file] of Object.entries(floors)) {
    const { starts, destinations, obstacles, walkable } = parseMapNodes(svgFor(floor));
    assert.ok(starts.length > 0, `${floor} should expose start options`);
    assert.ok(destinations.length > 0, `${floor} should expose destinations`);
    assert.ok(obstacles.length > 0, `${floor} should expose wall obstacles`);
    assert.ok(walkable.length >= 1, `${floor} should expose the floor plate`);
  }
});

test("walkable grid covers corridors and blocks shop interiors", () => {
  const geometry = parseMapNodes(svgFor("1F"));
  const map = buildWalkableMap(geometry);
  let walkableCells = 0;
  for (let cy = 0; cy < map.H; cy++) for (let cx = 0; cx < map.W; cx++) if (map.isWalkable(cx, cy)) walkableCells++;
  assert.ok(walkableCells > 800, `floor plate should cover a large walkable area, got ${walkableCells}`);
  const shop = geometry.destinations[0];
  const cx = Math.floor((shop.x - map.minX) / map.cellSize);
  const cy = Math.floor((shop.y - map.minY) / map.cellSize);
  assert.equal(map.isWalkable(cx, cy), false, "shop interior should be blocked");
});

test("1F route from an entrance never crosses shop walls", () => {
  const geometry = parseMapNodes(svgFor("1F"));
  const map = buildWalkableMap(geometry);
  const start = defaultStart(geometry.starts);
  const dest = farthestFrom(geometry.destinations, start);
  const route = findRoute(geometry, map, start.id, dest.id);
  assert.ok(route, `route should exist from ${start.name} to ${dest.name}`);
  assert.ok(route.lengthUnits > 0);
  for (let i = 0; i < route.points.length - 1; i++) {
    assert.ok(segmentClear(geometry, route.points[i], route.points[i + 1]), `segment ${i} stays clear of walls`);
  }
  const description = describeRoute(route, start, dest);
  assert.ok(description.meters > 0 && description.minutes >= 1);
  assert.match(description.steps[0].text, /出发/);
  assert.match(description.steps.at(-1).text, /到达/);
  assert.ok(description.steps.some((s) => /直行/.test(s.text)), "route includes walking instructions");
});

test("far-apart 1F destinations keep the whole route clear of walls", () => {
  const geometry = parseMapNodes(svgFor("1F"));
  const map = buildWalkableMap(geometry);
  const list = geometry.destinations;
  const pairs = [
    [list[0], list[Math.floor(list.length / 2)]],
    [farthestFrom(list, list[0]), list[0]],
  ];
  for (const [from, to] of pairs) {
    const route = findRoute(geometry, map, from.id, to.id);
    assert.ok(route, `route should exist between ${from.name} and ${to.name}`);
    for (let i = 0; i < route.points.length - 1; i++) {
      assert.ok(segmentClear(geometry, route.points[i], route.points[i + 1]), `segment ${i} between ${from.name}→${to.name} stays clear`);
    }
  }
});

test("every floor routes from its default start to every destination without crossing walls", () => {
  for (const [floor, file] of Object.entries(floors)) {
    const geometry = parseMapNodes(svgFor(floor));
    const map = buildWalkableMap(geometry);
    const start = defaultStart(geometry.starts);
    for (const dest of geometry.destinations) {
      const route = findRoute(geometry, map, start.id, dest.id);
      assert.ok(route, `${floor} should route from ${start.name} to ${dest.name}`);
      for (let i = 0; i < route.points.length - 1; i++) {
        assert.ok(segmentClear(geometry, route.points[i], route.points[i + 1]), `${floor} ${start.name}→${dest.name} segment ${i} stays clear`);
      }
    }
  }
});

test("identical start and destination produce a zero-length route", () => {
  const geometry = parseMapNodes(svgFor("1F"));
  const map = buildWalkableMap(geometry);
  const route = findRoute(geometry, map, geometry.starts[0].id, geometry.starts[0].id);
  assert.ok(route);
  assert.equal(route.lengthUnits, 0);
});

test("demo store names match map nodes across formatting differences", () => {
  const { destinations } = parseMapNodes(svgFor("1F"));
  assert.equal(matchDestination(destinations, "DESCENTE 迪桑特")?.name, "DESCENTE");
  assert.ok(/丝芙兰/.test(matchDestination(destinations, "丝芙兰 SEPHORA")?.name || ""));
  assert.equal(matchDestination(destinations, "不存在的店铺"), null);
});

test("parseServedFloors understands elevator and stair labels", () => {
  const elevator = parseServedFloors("电梯 P3；当前楼层：1L；停靠楼层：B3、B1、1–10L；楼层信息与官网搜索列表一致");
  assert.ok(elevator.has("B1"));
  assert.ok(elevator.has("1F"));
  assert.ok(elevator.has("10F"));
  const stairs = parseServedFloors("楼梯；当前楼层：1L；连接楼层：1–7L；多层连接，不能据此判断单段直达");
  assert.ok(stairs.has("1F") && stairs.has("7F"));
  assert.ok(!stairs.has("8F"));
  assert.equal(parseServedFloors("").size, 0);
});

test("elevator shafts connect floors for multi-level journeys", () => {
  const floorsData = allFloors();
  const shafts = collectShafts(floorsData, Object.keys(floors));
  const elevators = shafts.filter((shaft) => shaft.kind === "elevator");
  assert.ok(elevators.length > 0, "elevator shafts should be collected");
  assert.ok(elevators.some((shaft) => shaft.floors.includes("1F") && shaft.floors.includes("5F")), "at least one elevator serves 1F and 5F");
  const transitions = planFloorTransitions(shafts, "1F", "5F");
  assert.ok(transitions && transitions.length === 1, "direct elevator should connect 1F to 5F");
  assert.equal(transitions[0].from, "1F");
  assert.equal(transitions[0].to, "5F");
  const none = planFloorTransitions(shafts, "不存在", "5F");
  assert.equal(none, null);
});

test("cross-floor journey walks to the elevator, rides, then walks on arrival", () => {
  const floorsData = allFloors();
  const getMap = createGetMap(floorsData);
  const start = { ...floorsData["1F"].destinations.find((d) => d.name === "DESCENTE"), floor: "1F" };
  const dest = { ...floorsData["5F"].destinations.find((d) => d.name.includes("青川")), floor: "5F" };
  const journey = planMultiFloorRoute({ floors: floorsData, start, dest, getMap });
  assert.ok(journey, "cross-floor journey should be planned");
  assert.equal(journey.crossFloor, true);
  assert.deepEqual(journey.legs.map((leg) => leg.type), ["walk", "ride", "walk"]);
  assert.equal(journey.legs[0].floor, "1F");
  assert.equal(journey.legs[1].fromFloor, "1F");
  assert.equal(journey.legs[1].toFloor, "5F");
  assert.equal(journey.legs[2].floor, "5F");
  assert.ok(journey.walkMeters > 0);
  assert.ok(journey.steps.some((step) => step.kind === "ride"));
  assert.match(journey.steps[0].text, /^1F · /);
  for (const leg of journey.legs.filter((item) => item.type === "walk")) {
    for (let i = 0; i < leg.route.points.length - 1; i++) {
      assert.ok(segmentClear(floorsData[leg.floor], leg.route.points[i], leg.route.points[i + 1]), `${leg.floor} segment ${i} stays clear`);
    }
  }
});

test("same-floor journey stays a single walking leg", () => {
  const floorsData = allFloors();
  const getMap = createGetMap(floorsData);
  const start = { ...floorsData["1F"].destinations[0], floor: "1F" };
  const dest = { ...floorsData["1F"].destinations[1], floor: "1F" };
  const journey = planMultiFloorRoute({ floors: floorsData, start, dest, getMap });
  assert.ok(journey);
  assert.equal(journey.crossFloor, false);
  assert.ok(journey.legs.every((leg) => leg.type === "walk"));
  assert.equal(journey.rideCount, 0);
});

test("elevator to elevator journey only needs the ride", () => {
  const floorsData = allFloors();
  const getMap = createGetMap(floorsData);
  const startElevator = floorsData["1F"].starts.find((node) => node.kind === "elevator");
  const destElevator = floorsData["5F"].starts.find((node) => node.kind === "elevator" && node.name === startElevator.name);
  assert.ok(startElevator && destElevator, "same elevator should exist on both floors");
  const journey = planMultiFloorRoute({
    floors: floorsData,
    start: { ...startElevator, floor: "1F" },
    dest: { ...destElevator, floor: "5F" },
    getMap,
  });
  assert.ok(journey);
  assert.deepEqual(journey.legs.map((leg) => leg.type), ["ride"]);
  assert.equal(journey.walkMeters, 0);
});
