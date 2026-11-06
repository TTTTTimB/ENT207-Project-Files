# Multi-floor Maps, Shop Sync SQL, and Mobile Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add B1 and 1F–10F source SVG maps (excluding B2/B3), provide a safe shop-name update SQL file, and make map/name highlighting usable on mobile.

**Architecture:** Keep sanitized SVG assets in `src/maps`; define a separate customer map-floor catalog so merchant analytics do not claim data for unsupported floors. Desktop uses the source SVG's linked map and names; mobile crops the map area and renders its names as tap targets that focus the matching SVG group. Generate the SQL from map labels and known database shop codes, changing names only and preserving location and business fields.

**Tech Stack:** React, Vite, SVG, Node built-in test runner, MySQL 8.

---

### Task 1: Map catalog and asset integrity

**Files:** `src/mapFloorCatalog.js`, `src/maps/*.svg`, `tests/floor-maps.test.mjs`

- [ ] Write tests asserting B1 and 1F–10F are catalogued, each expected SVG exists, SVG store groups are keyboard-focusable with hover/focus styles, and embedded scripts are absent.
- [ ] Run `node --test tests/floor-maps.test.mjs` and confirm the new-floor asset assertions fail.
- [ ] Extract the requested non-B2/B3 SVGs from `right-list.zip`, remove active script blocks, add focus semantics to each `.shop` group, and map each floor code to its asset.
- [ ] Rerun the test and confirm it passes.

### Task 2: Customer floor selection

**Files:** `src/App.jsx`, `src/demoData.js` (only if a strictly necessary floor-selection change is needed), `tests/floor-maps.test.mjs`

- [ ] Add a failing assertion that the customer floor picker uses the map catalog while merchant analytics continue to use data-backed floors.
- [ ] Implement raw SVG imports for B1 and 1F–10F and use the full linked map in the customer floor guide.
- [ ] Run the focused tests and confirm every map floor can be selected without adding fake analytics records.

### Task 3: Mobile map and tap-to-highlight

**Files:** `src/App.jsx`, `src/styles.css`, `tests/floor-maps.test.mjs`

- [ ] Add a failing assertion for the mobile breakpoint, touch-sized name controls, and a mobile name-list-to-map focus path.
- [ ] On narrow screens, show a readable map-only SVG and a separate list of names parsed from that same SVG; selecting a name focuses/highlights its exact group.
- [ ] Keep desktop hover, keyboard focus, and facility interactions working; retain horizontal scrolling only where needed for tablet widths.
- [ ] Run automated tests and verify 1F and 2F in the browser at desktop and phone widths.

### Task 4: Shop update SQL

**Files:** `database/09_按楼层SVG同步店铺名称.sql`, `tests/floor-maps.test.mjs`

- [ ] Test that SQL references only `name` plus shop/floor matching keys and does not update `node_id`, coordinates, or other business fields.
- [ ] Generate a rerunnable MySQL script from SVG names and verified existing `shop_code` mappings; preserve shop identity and all other columns and avoid deleting unmatched rows.
- [ ] Add a preview result query and run static SQL checks; document that IDs must resolve to the existing mall/floor records before execution.

### Task 5: Final verification

- [ ] Run `node --test tests/floor-maps.test.mjs`, `npm run build`, and `npm run test:sites`.
- [ ] Inspect desktop hover/focus and mobile tap highlight in the local browser; leave the customer page open on a representative floor.
