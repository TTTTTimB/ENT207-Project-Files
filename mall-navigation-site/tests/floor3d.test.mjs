import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseMapNodes, buildWalkableMap, planMultiFloorRoute } from "../src/routeEngine.js";
import { buildFloor3DScene, FLOOR_GAP, SLAB_THICKNESS, ROUTE_LIFT } from "../src/floor3dData.js";

const root = resolve(import.meta.dirname, "..");
const mapDir = resolve(root, "src/maps");
const floorFiles = {
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
const floorCodes = Object.keys(floorFiles);

let cache = null;
const floorsData = () => {
  if (!cache) {
    cache = {};
    for (const code of floorCodes) cache[code] = parseMapNodes(readFileSync(resolve(mapDir, floorFiles[code]), "utf8"));
  }
  return cache;
};
const getMap = (() => {
  const maps = new Map();
  return (floors, code) => {
    if (!maps.has(code)) maps.set(code, buildWalkableMap(floors[code]));
    return maps.get(code);
  };
})();

const crossFloorJourney = () => {
  const floors = floorsData();
  const start = { ...floors["1F"].destinations.find((node) => node.name === "DESCENTE"), floor: "1F" };
  const dest = { ...floors["5F"].destinations.find((node) => node.name.includes("青川")), floor: "5F" };
  return planMultiFloorRoute({ floors, start, dest, getMap: (code) => getMap(floors, code) });
};

test("3D scene stacks all floors and highlights journey floors", () => {
  const floors = floorsData();
  const journey = crossFloorJourney();
  const scene = buildFloor3DScene({ floors, floorCodes, journey, fallbackFloor: "1F" });
  assert.equal(scene.slabs.length, floorCodes.length, "all floors should be included as slabs");
  assert.deepEqual([...scene.activeFloors].sort(), ["1F", "5F"]);
  const active = scene.slabs.filter((slab) => slab.active).map((slab) => slab.floor);
  assert.deepEqual(active.sort(), ["1F", "5F"]);
  for (const slab of scene.slabs) {
    assert.equal(slab.y, slab.index * FLOOR_GAP);
    assert.ok(slab.outer.length > 2, `${slab.floor} slab outline`);
  }
  for (const slab of scene.slabs.filter((item) => item.active)) {
    assert.ok(slab.walls.length > 0, `${slab.floor} should extrude shop walls`);
  }
  const ghosts = scene.slabs.filter((slab) => !slab.active);
  assert.ok(ghosts.length > 0 && ghosts.every((slab) => slab.walls.length === 0), "non-journey floors have no walls");
});

test("3D scene draws walk routes above the slab and an elevator shaft between floors", () => {
  const floors = floorsData();
  const journey = crossFloorJourney();
  const scene = buildFloor3DScene({ floors, floorCodes, journey, fallbackFloor: "1F" });
  assert.equal(scene.routes.length, 2, "two walking legs expected");
  assert.equal(scene.shafts.length, 1, "one elevator ride expected");
  for (const route of scene.routes) {
    const slab = scene.slabs.find((item) => item.floor === route.floor);
    assert.ok(route.points.length > 1);
    assert.ok(Math.abs(route.y - (slab.y + SLAB_THICKNESS + ROUTE_LIFT)) < 1e-6, "route floats above the slab");
  }
  const shaft = scene.shafts[0];
  assert.equal(shaft.fromFloor, "1F");
  assert.equal(shaft.toFloor, "5F");
  assert.ok(shaft.to[1] > shaft.from[1], "shaft goes upward");
  const kinds = scene.markers.map((marker) => marker.kind).sort();
  assert.deepEqual(kinds, ["dest", "start", "transfer", "transfer"]);
  const labels = scene.labels.map((label) => label.floor).sort();
  assert.deepEqual(labels, ["1F", "5F"]);
});

test("3D scene handles same-floor journeys and the empty state", () => {
  const floors = floorsData();
  const sameJourney = planMultiFloorRoute({
    floors,
    start: { ...floors["2F"].destinations[0], floor: "2F" },
    dest: { ...floors["2F"].destinations[1], floor: "2F" },
    getMap: (code) => getMap(floors, code),
  });
  const sameScene = buildFloor3DScene({ floors, floorCodes, journey: sameJourney, fallbackFloor: "2F" });
  assert.deepEqual(sameScene.activeFloors, ["2F"]);
  assert.equal(sameScene.shafts.length, 0);
  assert.equal(sameScene.routes.length, 1);
  assert.equal(sameScene.sameFloor, true);

  const emptyScene = buildFloor3DScene({ floors, floorCodes, journey: null, fallbackFloor: "3F" });
  assert.deepEqual(emptyScene.activeFloors, ["3F"]);
  assert.equal(emptyScene.routes.length, 0);
  assert.equal(emptyScene.markers.length, 0);
  assert.equal(emptyScene.shafts.length, 0);
  assert.equal(emptyScene.hasJourney, false);
  assert.ok(emptyScene.bounds.maxX > emptyScene.bounds.minX);
  assert.ok(emptyScene.bounds.maxH > emptyScene.bounds.minH);
});

test("overview mode highlights every floor uniformly", () => {
  const floors = floorsData();
  const journey = crossFloorJourney();
  const scene = buildFloor3DScene({ floors, floorCodes, journey, fallbackFloor: "1F", overview: true });
  assert.equal(scene.overview, true);
  assert.ok(scene.slabs.every((slab) => slab.solid), "all floors are solid in overview");
  assert.ok(scene.slabs.every((slab) => slab.highlight === true), "every floor is highlighted in overview");
  assert.ok(scene.slabs.every((slab) => slab.walls.length > 0), "every floor extrudes its shop walls");
  assert.equal(scene.labels.length, scene.slabs.length, "every floor gets a label");
  assert.deepEqual([...scene.activeFloors].sort(), ["1F", "5F"], "journey floors are still tracked for the route");
  assert.ok(scene.bounds.maxH >= (floorCodes.length - 1) * FLOOR_GAP, "camera bounds cover the top floor");

  const routeScene = buildFloor3DScene({ floors, floorCodes, journey, fallbackFloor: "1F" });
  assert.ok(routeScene.slabs.some((slab) => !slab.solid), "route view keeps ghost slabs for other floors");
  assert.ok(routeScene.slabs.filter((slab) => slab.active).every((slab) => slab.highlight === true), "route view highlights journey floors");
  assert.ok(routeScene.slabs.filter((slab) => !slab.active).every((slab) => slab.highlight === false), "route view leaves other floors unhighlighted");
  assert.ok(routeScene.slabs.filter((slab) => slab.active).every((slab) => slab.walls.length > 0), "route view extrudes shop walls");
});
