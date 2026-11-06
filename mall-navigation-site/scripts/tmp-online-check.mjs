import { spawn } from "node:child_process";

const edge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9500 + Math.floor(Math.random() * 300);
const userDataDir = `${process.env.TEMP}\\online-check-${Date.now()}`;
const pageUrl = "https://mall-navigation-demo.pages.dev/";

const child = spawn(edge, [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${userDataDir}`,
  `--remote-debugging-port=${port}`,
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let target;
for (let i = 0; i < 100 && !target; i += 1) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = targets.find((item) => item.type === "page");
  } catch { /* 等待启动 */ }
  if (!target) await sleep(250);
}
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => { socket.onopen = resolve; });
let nextId = 1;
const pending = new Map();
const exceptions = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown") {
    exceptions.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: pageUrl });
await sleep(5000);

const flow = `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const until = async (check, label) => {
    for (let i = 0; i < 200; i += 1) { if (check()) return true; await wait(100); }
    throw new Error("等待超时: " + label);
  };
  const setValue = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const state = {};
  try {
    await until(() => document.querySelector(".auth-page"), "登录页");
    state.loginVisible = true;
    state.title = document.title;
    state.story = document.querySelector(".auth-story h1")?.innerText.replace(/\\s+/g, " ").trim();
    setValue(document.querySelector('.auth-form input[autocomplete="username"]'), "customer");
    setValue(document.querySelector(".auth-password input"), "MallDemo2026");
    await wait(150);
    document.querySelector(".auth-form").requestSubmit();
    await until(() => document.querySelector(".guest-layout"), "顾客界面");
    await wait(6000);
    state.badge = document.querySelector(".open-badge")?.innerText.trim();
    state.role = document.querySelector(".session-role")?.innerText.trim();
    [...document.querySelectorAll(".side-button")].find((b) => b.innerText.includes("店铺目录"))?.click();
    await wait(1200);
    state.directoryCount = document.querySelector(".result-count")?.innerText.trim();
    state.firstCard = document.querySelector(".directory-card strong")?.innerText.trim();
    state.filters = document.querySelectorAll(".category-filters").length;
  } catch (error) {
    state.error = error.message;
  }
  return state;
})()`;

const result = await send("Runtime.evaluate", { expression: flow, awaitPromise: true, returnByValue: true });
const state = result.result?.value || { error: "无返回值" };
console.log("STATE:", JSON.stringify(state, null, 2));
console.log("EXCEPTIONS:", JSON.stringify(exceptions.slice(0, 5)));

const checks = {
  "线上页面可访问(登录页)": state.loginVisible === true && typeof state.story === "string" && state.story.includes("每一次抵达"),
  "顾客登录成功": state.role === "顾客端",
  "右上角显示数据库已连接": state.badge === "数据库已连接",
  "店铺目录显示 21 家(数据库)": state.directoryCount === "21 家店铺",
  "出现数据库店铺": typeof state.firstCard === "string" && /CHJ|潮宏基|周生生|周大福|华为/.test(state.firstCard),
  "无脚本异常": exceptions.length === 0 && !state.error,
};
for (const [name, ok] of Object.entries(checks)) console.log((ok ? "✔ " : "✖ ") + name);
if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1;

socket.close();
await sleep(300);
try {
  const { execFileSync } = await import("node:child_process");
  execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
} catch { child.kill(); }
