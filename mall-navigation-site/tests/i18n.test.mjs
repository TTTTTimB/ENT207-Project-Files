import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getLanguage, setLanguage, t, tFacility, translateSvgLabel } from "../src/i18n.js";

const root = resolve(import.meta.dirname, "..");

test("default language is Chinese and missing translations fall back to the source", () => {
  setLanguage("zh");
  assert.equal(getLanguage(), "zh");
  assert.equal(t("登录顾客端 →"), "登录顾客端 →");
  assert.equal(t("Home"), "Home");
});

test("switching to English translates navigation, auth and customer labels", () => {
  setLanguage("en");
  assert.equal(getLanguage(), "en");
  assert.equal(t("登录顾客端 →"), "Sign in to customer app →");
  assert.equal(t("首页"), "Home");
  assert.equal(t("我的收藏"), "My favorites");
  assert.equal(t("登录账号"), "Username");
  assert.equal(t("数据库已连接"), "Database connected");
});

test("t() interpolates placeholders and keeps unknown text intact", () => {
  setLanguage("en");
  assert.equal(t("{v1} 家店铺", { v1: 3 }), "3 shop(s)");
  assert.equal(t("步行约 {v1} 分钟", { v1: 5 }), "Walk approx. 5 min");
  assert.equal(t("未收录文案"), "未收录文案");
});

test("facility names and SVG map labels are localized for English", () => {
  setLanguage("en");
  assert.equal(tFacility("电梯 P3"), "Elevator P3");
  assert.equal(tFacility("北门"), "North gate");
  assert.match(translateSvgLabel("1L 商铺名称"), /shop names/);
  assert.match(translateSvgLabel("连接楼层：1–7L"), /Connected floors/);
});

test("the language toggle is wired on both the login page and the signed-in top bar", () => {
  const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
  const login = readFileSync(resolve(root, "src/LoginScreen.jsx"), "utf8");
  const toggle = readFileSync(resolve(root, "src/LanguageToggle.jsx"), "utf8");
  const css = readFileSync(resolve(root, "src/i18n.css"), "utf8");
  assert.match(app, /<LanguageToggle\s+lang=\{lang\}\s+onToggle=\{toggleLanguage\}/);
  assert.match(login, /<LanguageToggle\s+lang=\{lang\}\s+onToggle=\{onToggleLang\}/);
  assert.match(toggle, /lang === "zh" \? "Switch to English" : "切换到中文"/);
  assert.match(css, /\.lang-toggle\s*\{/);
  assert.match(css, /\.auth-lang\s*\{/);
});

test("route steps and page components use the translation helper", () => {
  const route = readFileSync(resolve(root, "src/routeEngine.js"), "utf8");
  const nav = readFileSync(resolve(root, "src/NavigationScreen.jsx"), "utf8");
  const admin = readFileSync(resolve(root, "src/AccountAdmin.jsx"), "utf8");
  const svgHelper = resolve(root, "src/svgI18n.js");
  assert.match(route, /t\("从「\{v1\}」出发"/);
  assert.match(route, /t\("到达「\{v1\}」"/);
  assert.match(nav, /tFacility\(option\.name\)/);
  assert.match(admin, /t\(ROLE_LABELS\[account\.role\]\)/);
  assert.ok(existsSync(svgHelper), "SVG localization helper should exist");
});
