import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("mobile floor selectors are compact horizontal scrollers", () => {
  const cssPath = resolve(root, "src/shop-mobile.css");
  assert.ok(existsSync(cssPath), "mobile stylesheet should exist");
  const css = readFileSync(cssPath, "utf8");
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.floor-pills\s*\{[\s\S]*?overflow-x:\s*auto/, "home/directory floor pills should scroll horizontally");
  assert.match(css, /\.floor-pills::-webkit-scrollbar\s*\{[\s\S]*?display:\s*none/, "floor pill scrollbar should be hidden");
  assert.match(css, /\.floor-pills button\s*\{[\s\S]*?height:\s*26px/, "mobile floor pills should be shorter");
  assert.match(css, /\.nav-floor-chips\s*\{[\s\S]*?overflow-x:\s*auto/, "navigation floor chips should scroll horizontally");
  assert.match(css, /\.nav-floor-chips::-webkit-scrollbar\s*\{[\s\S]*?display:\s*none/, "navigation chip scrollbar should be hidden");
  assert.match(css, /scroll-snap-type:\s*x proximity/, "pill rows should snap while swiping");
});

test("mobile navigation panels never stretch the page wider than the viewport", () => {
  const css = readFileSync(resolve(root, "src/shop-mobile.css"), "utf8");
  assert.match(css, /\.nav-planner\s*\{[\s\S]*?min-width:\s*0/, "nav planner should allow its grid tracks to shrink");
  assert.match(css, /\.nav-planner > \*\s*\{[\s\S]*?min-width:\s*0/, "nav panels should not use content min-width");
});

test("floor selectors auto-scroll the active floor into view", () => {
  const ui = readFileSync(resolve(root, "src/ui.jsx"), "utf8");
  const nav = readFileSync(resolve(root, "src/NavigationScreen.jsx"), "utf8");
  assert.match(ui, /const listRef = useRef\(null\)/);
  assert.match(ui, /container\.scrollTo\(\{\s*left:\s*Math\.max\(0, target\),\s*behavior:\s*"smooth"\s*\}\)/s);
  assert.match(nav, /const listRef = useRef\(null\)/);
  assert.match(nav, /container\.scrollTo\(\{\s*left:\s*Math\.max\(0, target\),\s*behavior:\s*"smooth"\s*\}\)/s);
  assert.match(nav, /className="nav-floor-chips"/);
});
