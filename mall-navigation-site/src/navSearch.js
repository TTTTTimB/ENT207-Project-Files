// 起终点查找逻辑：支持商户名搜索 + 楼层代码筛选（5F / 5楼 / 5层 / B1 等）。
// 纯函数，便于测试；列表排序保持字母序（localeCompare zh-CN）。

// 把 "5F"、"5f"、"5楼"、"5层"、"5L"、"B1" 解析为标准楼层代码；裸数字不作为楼层。
export function parseFloorQuery(query) {
  const compact = String(query || "").replace(/\s+/g, "").toLowerCase();
  const basement = compact.match(/^b(\d+)$/);
  if (basement) return `B${basement[1]}`;
  const upper = compact.match(/^(\d+)(?:f|楼|层|l)$/);
  if (upper) return `${upper[1]}F`;
  return null;
}

// 单条选项是否命中搜索词：名称包含，或搜索词就是楼层代码。
export function matchesQuery(option, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  if (String(option.name || "").toLowerCase().includes(q)) return true;
  const floor = parseFloorQuery(query);
  return Boolean(floor && option.floor === floor);
}

// 过滤选项：先按楼层筛选，再按搜索词匹配。
export function filterOptions(options, { query = "", floor = "" } = {}) {
  return options.filter((option) => (!floor || option.floor === floor) && matchesQuery(option, query));
}

// 选项按名称字母排序，同名的按楼层排序。
export function sortOptions(options) {
  return [...options].sort(
    (a, b) => String(a.name).localeCompare(String(b.name), "zh-CN", { sensitivity: "base" }) || String(a.floor).localeCompare(String(b.floor), "en"),
  );
}
