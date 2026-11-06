import test from "node:test";
import assert from "node:assert/strict";
import { parseFloorQuery, matchesQuery, filterOptions, sortOptions } from "../src/navSearch.js";

test("parseFloorQuery recognizes floor tokens but not bare digits", () => {
  assert.equal(parseFloorQuery("5F"), "5F");
  assert.equal(parseFloorQuery("5f"), "5F");
  assert.equal(parseFloorQuery("5楼"), "5F");
  assert.equal(parseFloorQuery("5层"), "5F");
  assert.equal(parseFloorQuery("5L"), "5F");
  assert.equal(parseFloorQuery("10F"), "10F");
  assert.equal(parseFloorQuery("B1"), "B1");
  assert.equal(parseFloorQuery(" b1 "), "B1");
  assert.equal(parseFloorQuery("5"), null, "bare digits search names, not floors");
  assert.equal(parseFloorQuery("星巴克"), null);
  assert.equal(parseFloorQuery(""), null);
});

const options = [
  { key: "1F:a", floor: "1F", name: "DESCENTE" },
  { key: "2F:b", floor: "2F", name: "adidas" },
  { key: "5F:c", floor: "5F", name: "QingChuan 青川" },
  { key: "5F:d", floor: "5F", name: "1555273" },
];

test("filterOptions combines name search and floor filter", () => {
  assert.equal(filterOptions(options, {}).length, 4);
  assert.deepEqual(filterOptions(options, { query: "DESCENTE" }).map((option) => option.key), ["1F:a"]);
  assert.equal(filterOptions(options, { query: "5F" }).length, 2);
  assert.equal(filterOptions(options, { query: "5楼" }).length, 2, "5楼 should behave like 5F");
  assert.equal(filterOptions(options, { query: "", floor: "5F" }).length, 2);
  assert.equal(filterOptions(options, { query: "青川", floor: "1F" }).length, 0);
  assert.equal(filterOptions(options, { query: "155" }).length, 1, "bare digits still match names");
});

test("matchesQuery tolerates case and spacing", () => {
  assert.ok(matchesQuery(options[0], "descente"));
  assert.ok(matchesQuery(options[2], "  青川 "));
  assert.ok(!matchesQuery(options[1], "QingChuan"));
});

test("sortOptions sorts alphabetically with floor tiebreaker", () => {
  const sorted = sortOptions([
    { floor: "5F", name: "Zara" },
    { floor: "2F", name: "adidas" },
    { floor: "1F", name: "adidas" },
  ]);
  assert.deepEqual(sorted.map((option) => `${option.floor}:${option.name}`), ["1F:adidas", "2F:adidas", "5F:Zara"]);
});
