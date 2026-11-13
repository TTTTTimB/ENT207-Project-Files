import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");

test("analytics floors cover every floor of the map catalog", async () => {
  const { floors, shops } = await import("../src/demoData.js");
  const { mapFloorCodes } = await import("../src/mapFloorCatalog.js");
  assert.deepEqual(floors.map((floor) => floor.code), [...mapFloorCodes]);
  for (const code of mapFloorCodes) {
    assert.ok(shops.some((shop) => shop.floor === code), `${code} should have at least one demo shop for store analytics`);
  }
});

test("floor pills default to all 11 customer floors", () => {
  const ui = read("src/ui.jsx");
  for (const code of ["B1", "1F", "2F", "3F", "4F", "5F", "6F", "7F", "8F", "9F", "10F"]) {
    assert.ok(ui.includes(`code: "${code}"`), `default floor pills should include ${code}`);
  }
});

test("analytics heatmap reuses navigation floor SVGs instead of a placeholder", () => {
  const app = read("src/App.jsx");
  assert.match(app, /function FloorHeatmap\(/);
  assert.match(app, /floorSvgLoaders\[floor\]/);
  assert.match(app, /viewBox", "0 0 1000 650"/);
  assert.match(app, /#右侧名称背景, \.list-item/);
  assert.match(app, /<FloorHeatmap floor=\{floor\} \/>/);
  assert.doesNotMatch(app, /mapAsset\(floor\)/, "analytics should no longer depend on the old 1F/2F image map");
  const css = read("src/shop-mobile.css");
  assert.match(css, /\.heatmap-floor svg\s*\{[\s\S]*?overflow:\s*hidden/);
});
