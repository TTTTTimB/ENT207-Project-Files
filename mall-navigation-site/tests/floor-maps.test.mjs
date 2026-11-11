import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const catalogPath = resolve(root, "src/mapFloorCatalog.js");
const mapDir = resolve(root, "src/maps");
const mapCodes = ["B1", "1F", "2F", "3F", "4F", "5F", "6F", "7F", "8F", "9F", "10F"];
const fileFor = (floor) => floor === "B1" ? "basement-1-right-list.svg" : `level-${floor.slice(0, -1)}-right-list.svg`;

test("customer floor map catalog includes B1 and 1F through 10F only", () => {
  assert.ok(existsSync(catalogPath), "customer map catalog should be added");
  const source = readFileSync(catalogPath, "utf8");
  for (const code of mapCodes) assert.ok(source.includes(`\"${code}\"`), `${code} should be selectable`);
  assert.ok(!source.includes("B2") && !source.includes("B3"), "B2 and B3 are intentionally omitted");
  const loaders = readFileSync(resolve(root, "src/floorSvgAssets.js"), "utf8");
  for (const floor of mapCodes) assert.match(loaders, new RegExp(`[\"']?${floor}[\"']?:\\s*\\(\\)\\s*=>\\s*import`), `${floor} SVG should load on demand`);
});

test("each floor SVG is script-free and links focusable names to highlighted map shapes", () => {
  assert.ok(existsSync(catalogPath), "customer map catalog should be added before its SVGs are checked");
  for (const floor of mapCodes) {
    const path = resolve(mapDir, fileFor(floor));
    assert.ok(existsSync(path), `${floor} SVG should be present`);
    const svg = readFileSync(path, "utf8");
    assert.doesNotMatch(svg, /<script\b/i, `${floor} SVG must not execute embedded scripts`);
    assert.match(svg, /class=\"shop\"[^>]*tabindex=\"0\"[^>]*role=\"button\"/, `${floor} names should be keyboard-focusable`);
    assert.match(svg, /\.shop:hover \.hit,\.shop:focus \.hit/, `${floor} map region should highlight on hover and focus`);
  }
});

test("mobile view exposes tap targets and routes name selection to the matching SVG group", () => {
  const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
  const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
  assert.match(app, /mobile-shop-list/, "mobile store list should be rendered");
  assert.match(app, /target\?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/s, "selecting a store name should focus its map group");
  assert.match(app, /target\?\.classList\.add\("is-selected"\)/, "selecting a store name should set a persistent map highlight");
  assert.match(app, /onClick=\{\(\) => setSelectedMapName\(entry\.id\)\}/, "mobile name tap should select its matching map group");
  assert.match(css, /@media\s*\(max-width:\s*760px\)/, "mobile layout breakpoint should exist");
  assert.match(css, /\.shop\.is-selected \.hit/, "selected shop should have a visible map highlight");
  assert.match(css, /mobile-shop-name\{[^}]*min-height:\s*44px/s, "mobile name controls should have touch-sized targets");
});

test("shop update SQL only changes names and never navigation coordinates", () => {
  const path = resolve(root, "database/09_按SVG同步店铺名称.sql");
  assert.ok(existsSync(path), "shop-name update SQL should be delivered");
  const sql = readFileSync(path, "utf8");
  assert.match(sql, /UPDATE\s+shop/i);
  assert.match(sql, /INSERT INTO\s+shop\s*\(mall_id, floor_id, shop_code, name\)/i, "new map stores should omit location and business fields");
  assert.doesNotMatch(sql, /SET\s+[^;]*(node_id\s*=|\bx\s*=|\by\s*=|floor_id\s*=|shop_code\s*=)/is, "SQL must not change location or identity fields");
  assert.match(sql, /SET\s+s?\.??name\s*=/i, "SQL should update store names");
  assert.match(sql, /UNION ALL SELECT '10F', 10/, "missing map floors should be inserted with valid MySQL derived-table syntax");
  assert.doesNotMatch(sql, /SELECT\s+'B[23]'|\('B[23]',/, "B2 and B3 must not be included in the shop sync");
});

test("PostgreSQL shop update SQL avoids MySQL-only commands", () => {
  const path = resolve(root, "database/09_按SVG同步店铺名称_PostgreSQL.sql");
  assert.ok(existsSync(path), "PostgreSQL-compatible shop-name update SQL should be delivered");
  const sql = readFileSync(path, "utf8");
  assert.match(sql, /BEGIN;[\s\S]*CREATE TEMP TABLE tmp_mall_context/);
  assert.match(sql, /UPDATE public\.shop AS s[\s\S]*SET name = t\.shop_name/);
  assert.match(sql, /INSERT INTO public\.shop \(mall_id, floor_id, shop_code, name\)/);
  assert.doesNotMatch(sql, /\bUSE\s+mall_navigation\b|SET NAMES|@mall_id|ENGINE=InnoDB|`/i);
  assert.doesNotMatch(sql, /SET\s+(node_id|x|y|floor_id|shop_code)\s*=/i);
});
