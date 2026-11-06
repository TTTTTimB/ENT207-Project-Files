#!/usr/bin/env node
// 生成「单文件便携版」：把所有 JS / CSS / 地图数据 / 图片内联进一个 HTML，
// 任意电脑双击即可在浏览器打开（file:// 环境，无需 Node、无需服务器）。
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, "dist-portable");
const clientDir = path.join(outRoot, "client");
const publicDir = path.join(root, "public");

rmSync(outRoot, { recursive: true, force: true });

await build({
  root,
  configFile: false,
  logLevel: "warn",
  base: "./",
  plugins: [react()],
  build: {
    outDir: clientDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

const indexFile = path.join(clientDir, "index.html");
if (!existsSync(indexFile)) throw new Error("便携版构建失败：缺少 " + indexFile);
let html = readFileSync(indexFile, "utf8");

// 1) 内联样式表
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => {
  const file = path.join(clientDir, href.replace(/^\.?\//, ""));
  return `<style>\n${readFileSync(file, "utf8")}\n</style>`;
});

// 2) 内联入口脚本（含按需加载的地图 SVG，已通过 inlineDynamicImports 合并）
html = html.replace(/<script([^>]*)src="([^"]+)"([^>]*)><\/script>/g, (_, before, src, after) => {
  const file = path.join(clientDir, src.replace(/^\.?\//, ""));
  const js = readFileSync(file, "utf8").replace(/<\/script>/gi, "<\\/script>");
  return `<script${before}${after}>\n${js}\n</script>`;
});

// 3) 内联 modulepreload / 图标等其余外链（多删少补，保证不残留外部请求）
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>\s*/g, "");

// 4) 把 public 目录里的楼层示意图转成 data URI（营业分析页 <img> 使用绝对路径）
const toDataUri = (file) => "data:image/svg+xml;base64," + readFileSync(file).toString("base64");
for (const name of ["level-1.svg", "level-2.svg"]) {
  const file = path.join(publicDir, "assets", name);
  if (!existsSync(file)) continue;
  const uri = toDataUri(file);
  for (const prefix of ["/", "./", ""]) {
    html = html.split(`"${prefix}assets/${name}"`).join(`"${uri}"`);
    html = html.split(`'${prefix}assets/${name}'`).join(`'${uri}'`);
  }
}

// 5) 检查是否还残留外部引用（只检查 HTML 壳层标签，忽略已内联的 script/style 内容）
const shell = html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "");
const leftover = [...shell.matchAll(/(?:src|href)="(?!data:)([^"]+)"/g)]
  .map((m) => m[1])
  .filter((ref) => !ref.startsWith("#"));
if (leftover.length) throw new Error("便携版仍包含外部引用：" + leftover.join(", "));
if (!html.includes("data:image/svg+xml;base64,")) throw new Error("便携版未内联楼层示意图");
if (!/<style>/.test(html)) throw new Error("便携版未内联样式");
if (!/<script[^>]*type="module"[^>]*>/.test(html)) throw new Error("便携版未内联入口脚本");
const inlinedScript = (html.match(/<script[^>]*>([\s\S]*)<\/script>/) || [])[1] || "";
const dynamicAssetRefs = inlinedScript.match(/import\("\.[^"]*"\)|from"\.\/assets/);
if (dynamicAssetRefs) throw new Error("便携版脚本仍引用外部模块：" + dynamicAssetRefs[0]);

const outFile = path.join(outRoot, "正大广场-导航演示.html");
writeFileSync(outFile, html, "utf8");
copyFileSync(indexFile, path.join(outRoot, "index.html"));
console.log("便携版已生成：", path.relative(root, outFile), `(${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
