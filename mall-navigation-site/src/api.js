// 前端数据接口层：配置 VITE_API_BASE 后从后端 API 读取数据库数据；
// 未配置或后端不可用时，App 会自动回退到 src/demoData.js 的本地演示数据，
// 因此单文件便携版（file:// 离线打开）依然可以直接使用。

const API_BASE = String(import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");

const request = async (path, options = {}, timeoutMs = 6000) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json", ...(options.headers || {}) },
      ...options,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
};

// 批量请求：底层封装 fetch/json
export async function apiRequest(path, options = {}) {
  return request(path, options);
}

// 后端连通性检测（/api/health 返回 { ok: true } 视为可用）
export async function checkApi() {
  try {
    const data = await request("/api/health", {}, 3000);
    return Boolean(data && data.ok);
  } catch {
    return false;
  }
}

// 全部店铺（数据库已连接时使用）
export async function fetchAllShops() {
  const data = await request("/api/shop/all");
  if (!data || data.code !== 0) throw new Error(data?.msg || "店铺数据读取失败");
  return Array.isArray(data.data) ? data.data : [];
}

// 已配置的 API 地址（用于界面提示）
export function apiBaseLabel() {
  return API_BASE || "同源 /api";
}
