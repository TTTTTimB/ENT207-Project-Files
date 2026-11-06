import { useEffect, useMemo, useRef, useState } from "react";
import { floorSvgLoaders } from "./floorSvgAssets.js";
import { mapFloorCodes } from "./mapFloorCatalog.js";
import { parseMapNodes, buildWalkableMap, matchDestination, planMultiFloorRoute } from "./routeEngine.js";
import { buildFloor3DScene } from "./floor3dData.js";
import { Floor3DView, canUseWebGL } from "./Floor3DView.jsx";
import { filterOptions, sortOptions } from "./navSearch.js";
import { Icon } from "./icons.jsx";
import { PageHeading, SearchBox, Footer } from "./ui.jsx";

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
};

function OptionRow({ option, active, onSelect }) {
  return (
    <button className={`nav-option-row ${active ? "chosen" : ""}`} role="option" aria-selected={active} onClick={() => onSelect(option)}>
      <span className="nav-option-floor">{option.floor}</span>
      <span className="nav-option-name">{option.name}</span>
      {active && <Icon name="arrow" size={13}/>}
    </button>
  );
}

function OptionGroup({ title, icon, options, selectedKey, onSelect }) {
  if (!options.length) return null;
  return (
    <div className="nav-list-group">
      <div className="nav-group-title">{icon && <Icon name={icon} size={12}/>}{title}<span>{options.length}</span></div>
      {options.map((option) => <OptionRow key={option.key} option={option} active={option.key === selectedKey} onSelect={onSelect}/>)}
    </div>
  );
}

// 楼层筛选条：把原先页面顶部的楼层选择并入起终点列表面板。
function FloorChips({ value, onChange, label }) {
  return (
    <div className="nav-floor-chips" role="group" aria-label={label}>
      <button type="button" className={value === "" ? "on" : ""} aria-pressed={value === ""} onClick={() => onChange("")}>全部</button>
      {mapFloorCodes.map((code) => (
        <button key={code} type="button" className={value === code ? "on" : ""} aria-pressed={value === code} onClick={() => onChange(code)}>{code}</button>
      ))}
    </div>
  );
}

// 类型筛选（可复选）：商户 / 电梯 / 出入口 / 楼梯，未选中任何类型时显示全部。
const TYPE_FILTERS = [["shop", "商户"], ["elevator", "电梯"], ["gate", "出入口"], ["stairs", "楼梯"]];

function TypeChips({ value, onToggle }) {
  return (
    <div className="nav-type-chips" role="group" aria-label="按类型筛选起点（可多选）">
      <span className="nav-type-caption">类型</span>
      {TYPE_FILTERS.map(([kind, label]) => (
        <button key={kind} type="button" className={value.includes(kind) ? "on" : ""} aria-pressed={value.includes(kind)} onClick={() => onToggle(kind)}>{label}</button>
      ))}
    </div>
  );
}

// 当前选中项摘要（含清除按钮），让已选项始终可见。
function SelectedChip({ label, option, onClear }) {
  if (!option) return null;
  return (
    <div className="nav-selected-chip">
      <span className="nav-option-floor">{option.floor}</span>
      <span className="nav-selected-name">{option.name}</span>
      <button type="button" aria-label={`清除${label}`} onClick={onClear}>×</button>
    </div>
  );
}

export function NavigationScreen({ floor, initialDest, onDestConsumed, showToast }) {
  const [floorsData, setFloorsData] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [viewFloor, setViewFloor] = useState(floor);
  const [mapMode, setMapMode] = useState(() => (canUseWebGL() ? "3d" : "2d"));
  const [threeScope, setThreeScope] = useState("route");
  const [startKey, setStartKey] = useState("");
  const [destKey, setDestKey] = useState("");
  const [startQuery, setStartQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [startFloor, setStartFloor] = useState("");
  const [destFloor, setDestFloor] = useState("");
  const [startTypes, setStartTypes] = useState([]);
  const mapCacheRef = useRef(new Map());
  const mapRef = useRef(null);

  // 一次性加载 B1–10F 全部楼层：跨楼层导航需要所有楼层的节点与地图。
  useEffect(() => {
    let current = true;
    setFloorsData(null);
    setLoadFailed(false);
    Promise.all(mapFloorCodes.map(async (code) => {
      const load = floorSvgLoaders[code];
      if (!load) return [code, null];
      try {
        const svg = await load();
        return [code, { ...parseMapNodes(svg), svg }];
      } catch {
        return [code, null];
      }
    })).then((entries) => {
      if (!current) return;
      const data = {};
      for (const [code, value] of entries) if (value) data[code] = value;
      mapCacheRef.current = new Map();
      setFloorsData(data);
      if (Object.keys(data).length === 0) setLoadFailed(true);
    }).catch(() => { if (current) setLoadFailed(true); });
    return () => { current = false; };
  }, []);

  // 起点可选项：全部楼层的出入口/电梯/楼梯 + 所有商户（按字母排序）。
  const options = useMemo(() => {
    if (!floorsData) return null;
    const gates = [], elevators = [], stairs = [], shops = [];
    for (const code of mapFloorCodes) {
      const data = floorsData[code];
      if (!data) continue;
      for (const node of data.starts) {
        const option = { ...node, floor: code, key: `${code}:${node.id}` };
        if (node.kind === "gate") gates.push(option);
        else if (node.kind === "elevator") elevators.push(option);
        else if (node.kind === "stairs") stairs.push(option);
      }
      for (const node of data.destinations) shops.push({ ...node, floor: code, key: `${code}:${node.id}`, kind: "shop" });
    }
    gates.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    elevators.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    stairs.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    const byKey = new Map([...gates, ...elevators, ...stairs, ...shops].map((option) => [option.key, option]));
    return { gates, elevators, stairs, shops: sortOptions(shops), byKey };
  }, [floorsData]);

  const startOption = (options && startKey && options.byKey.get(startKey)) || null;
  const destOption = (options && destKey && options.byKey.get(destKey)) || null;

  // 默认起点：1F 大门；没有则取第一个可用起点。
  useEffect(() => {
    if (!options) return;
    setStartKey((current) => {
      if (current && options.byKey.has(current)) return current;
      const fallback = options.gates.find((option) => option.floor === "1F") || options.gates[0] || options.elevators[0] || options.shops[0];
      return fallback?.key || "";
    });
  }, [options]);

  // 从店铺详情跳转过来时，自动选中该店铺作为目的地。
  useEffect(() => {
    if (!options || !initialDest) return;
    const sameFloor = options.shops.filter((option) => option.floor === initialDest.floor);
    const match = matchDestination(sameFloor, initialDest.name) || matchDestination(options.shops, initialDest.name);
    if (match) {
      setDestKey(match.key);
      setDestFloor("");
      setViewFloor(match.floor);
    } else {
      showToast(`「${initialDest.name}」暂无地图定位，请手动选择目的地。`);
    }
    onDestConsumed?.();
  }, [initialDest, options, onDestConsumed, showToast]);

  // 行程规划：同层直接步行；跨层自动经电梯换乘，逐层导航。
  const journey = useMemo(() => {
    if (!floorsData || !startOption || !destOption) return null;
    const cache = mapCacheRef.current;
    const getMap = (code) => {
      if (cache.has(code)) return cache.get(code);
      const data = floorsData[code];
      if (!data) return null;
      const map = buildWalkableMap(data);
      cache.set(code, map);
      return map;
    };
    return planMultiFloorRoute({ floors: floorsData, start: startOption, dest: destOption, getMap });
  }, [floorsData, startOption, destOption]);

  // 行程变化时，若当前查看楼层没有路段，自动切到行程第一层。
  useEffect(() => {
    if (!journey) return;
    const legFloors = journey.legs.map((leg) => (leg.type === "walk" ? leg.floor : leg.fromFloor));
    if (!legFloors.includes(viewFloor)) {
      const first = journey.legs[0];
      setViewFloor(first.type === "walk" ? first.floor : first.fromFloor);
    }
    // 只在行程变化时检查，避免与用户手动切换楼层冲突
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey]);

  const chooseStart = (option) => { setStartKey(option.key); setViewFloor(option.floor); };
  const chooseDest = (option) => { setDestKey(option.key); setViewFloor(option.floor); };

  // 查询 + 楼层筛选 + 类型筛选（类型可复选，未选时显示全部）。
  const visibleStarts = useMemo(() => {
    if (!options) return null;
    const filter = { query: startQuery, floor: startFloor };
    const typeOn = (kind) => startTypes.length === 0 || startTypes.includes(kind);
    return {
      gates: typeOn("gate") ? filterOptions(options.gates, filter) : [],
      elevators: typeOn("elevator") ? filterOptions(options.elevators, filter) : [],
      stairs: typeOn("stairs") ? filterOptions(options.stairs, filter) : [],
      shops: typeOn("shop") ? filterOptions(options.shops, filter) : [],
    };
  }, [options, startQuery, startFloor, startTypes]);
  const toggleStartType = (kind) => setStartTypes((current) => (current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind]));
  const visibleDestinations = useMemo(
    () => (options ? filterOptions(options.shops, { query: destQuery, floor: destFloor }) : []),
    [options, destQuery, destFloor],
  );
  const visibleStartCount = visibleStarts ? visibleStarts.gates.length + visibleStarts.elevators.length + visibleStarts.stairs.length + visibleStarts.shops.length : 0;

  // 3D 场景数据：3D 地图内可切换「行程楼层」与「全览」两种显示范围。
  const scene3d = useMemo(
    () => (floorsData ? buildFloor3DScene({ floors: floorsData, floorCodes: mapFloorCodes, journey, fallbackFloor: viewFloor, overview: threeScope === "overview" }) : null),
    [floorsData, journey, viewFloor, threeScope],
  );

  // 地图路线绘制（2D 视图）：当前查看楼层上的全部步行路段 + 起终点/换乘电梯标记。
  const mapSvg = floorsData?.[viewFloor]?.svg || null;
  useEffect(() => {
    if (mapMode !== "2d") return;
    const svg = mapRef.current?.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".nav-route-overlay").forEach((el) => el.remove());
    svg.querySelectorAll(".nav-start, .nav-dest, .nav-transfer").forEach((el) => el.classList.remove("nav-start", "nav-dest", "nav-transfer"));
    if (!journey) return;
    const markNode = (id, className) => {
      if (!id) return;
      for (const group of svg.querySelectorAll(".shop, .facility")) if (group.id === id) group.classList.add(className);
    };
    if (startOption && startOption.floor === viewFloor) markNode(startOption.id, "nav-start");
    if (destOption && destOption.floor === viewFloor) markNode(destOption.id, "nav-dest");
    for (const leg of journey.legs) {
      if (leg.type !== "ride") continue;
      if (leg.fromFloor === viewFloor) markNode(leg.fromNode.id, "nav-transfer");
      if (leg.toFloor === viewFloor) markNode(leg.toNode.id, "nav-transfer");
    }
    const walkLegs = journey.legs.filter((leg) => leg.type === "walk" && leg.floor === viewFloor && leg.route && leg.route.points.length > 1);
    if (!walkLegs.length) return;
    const overlay = svgEl("g", { class: "nav-route-overlay" });
    for (const leg of walkLegs) {
      const points = leg.route.points.map((p) => `${p.x},${p.y}`).join(" ");
      overlay.append(
        svgEl("polyline", { class: "nav-route-casing", points }),
        svgEl("polyline", { class: "nav-route-line", points }),
        svgEl("polyline", { class: "nav-route-flow", points }),
      );
    }
    const marker = (className, point) => {
      const group = svgEl("g", { class: `nav-marker ${className}`, transform: `translate(${point.x} ${point.y})` });
      group.append(svgEl("circle", { class: "marker-halo", r: 10 }), svgEl("circle", { class: "marker-dot", r: 4.5 }));
      return group;
    };
    const first = walkLegs[0];
    const last = walkLegs[walkLegs.length - 1];
    overlay.append(
      marker("nav-marker-start", first.route.points[0]),
      marker("nav-marker-end", last.route.points[last.route.points.length - 1]),
    );
    svg.append(overlay);
  }, [mapMode, floorsData, viewFloor, journey, startOption, destOption]);

  const samePlace = startOption && destOption && startOption.key === destOption.key;
  const journeyLegs = journey && !samePlace ? journey.legs : [];
  const mapTitle = mapMode === "3d" ? "3D 地图" : "2D 地图";

  return <>
    <PageHeading eyebrow="INDOOR WAYFINDING" title="室内导航" subtitle="支持 B1–10F 全部楼层：楼层筛选已并入起点/终点列表，同层直接步行，跨层自动经电梯逐层导航。" />
    <div className="sim-banner"><span className="demo-tag">演示路线</span><span>路线沿楼层可走区域生成，自动避开店铺与墙体；跨楼层行程优先乘坐电梯换乘。</span></div>
    <div className="nav-planner">
      <section className="panel nav-panel nav-start-panel">
        <div className="nav-panel-title"><span className="map-overline">START · 起点</span><h3>从哪里出发</h3></div>
        <SelectedChip label="起点" option={startOption} onClear={() => setStartKey("")}/>
        <SearchBox query={startQuery} setQuery={setStartQuery} placeholder="搜索商户名 / 楼层（如 5F）"/>
        <FloorChips label="按楼层筛选起点" value={startFloor} onChange={setStartFloor}/>
        <TypeChips value={startTypes} onToggle={toggleStartType}/>
        {floorsData && visibleStarts ? <div className="nav-scroll">
          <OptionGroup title="商户（按字母排序）" icon="shop" options={visibleStarts.shops} selectedKey={startKey} onSelect={chooseStart}/>
          <OptionGroup title="出入口" icon="door" options={visibleStarts.gates} selectedKey={startKey} onSelect={chooseStart}/>
          <OptionGroup title="电梯" icon="arrow" options={visibleStarts.elevators} selectedKey={startKey} onSelect={chooseStart}/>
          <OptionGroup title="楼梯" icon="map" options={visibleStarts.stairs} selectedKey={startKey} onSelect={chooseStart}/>
        </div> : <div className="map-loading" role="status">{loadFailed ? "楼层地图加载失败，请刷新重试" : "正在读取全部楼层…"}</div>}
        {floorsData && visibleStarts && visibleStartCount === 0 && <p className="nav-empty-hint">没有匹配的起点，试试其他关键词或切换楼层。</p>}
        {floorsData && <p className="nav-result-count">共 {visibleStartCount} 个起点</p>}
      </section>
      <section className="panel nav-panel nav-dest-panel">
        <div className="nav-panel-title"><span className="map-overline">DESTINATION · 目的地</span><h3>要去哪家店</h3></div>
        <SelectedChip label="目的地" option={destOption} onClear={() => setDestKey("")}/>
        <SearchBox query={destQuery} setQuery={setDestQuery} placeholder="搜索商户名 / 楼层（如 5F）"/>
        <FloorChips label="按楼层筛选目的地" value={destFloor} onChange={setDestFloor}/>
        {floorsData ? <div className="nav-scroll" role="listbox" aria-label="目的地店铺（按字母排序）">
          {visibleDestinations.map((option) => <OptionRow key={option.key} option={option} active={option.key === destKey} onSelect={chooseDest}/>)}
        </div> : <div className="map-loading" role="status">{loadFailed ? "楼层地图加载失败，请刷新重试" : "正在读取全部楼层…"}</div>}
        {floorsData && visibleDestinations.length === 0 && <p className="nav-empty-hint">没有匹配的店铺，试试其他关键词或切换楼层。</p>}
        {floorsData && <p className="nav-result-count">共 {visibleDestinations.length} 家店铺</p>}
      </section>
      <section className="panel nav-panel nav-route-card" aria-live="polite">
        <div className="nav-panel-title"><span className="map-overline">ROUTE · 行程</span><h3>导航方案</h3></div>
        {!startOption ? <div className="nav-route-empty">请选择起点</div>
          : !destOption ? <div className="nav-route-empty">请选择目的地店铺</div>
          : samePlace ? <div className="nav-route-empty">起点与目的地相同，无需导航</div>
          : !journey ? <div className="nav-route-empty">该行程暂无法生成路线（地图数据未覆盖相关楼层）</div>
          : <div className="nav-journey">
            <div className="route-summary"><b>{Math.round(journey.walkMeters)}<small> 米</small></b><span>{journey.rideCount ? `步行约 ${journey.minutes} 分钟 · 乘梯 ${journey.rideCount} 次` : `步行约 ${journey.minutes} 分钟`}</span></div>
            <ol className="nav-legs">
              {journeyLegs.map((leg, index) => leg.type === "ride"
                ? <li key={index} className="nav-leg nav-leg-ride"><span className="nav-leg-floor">{leg.fromFloor}→{leg.toFloor}</span><div><b>乘「{leg.shaftName}」</b><small>跨楼层换乘</small></div></li>
                : <li key={index} className="nav-leg nav-leg-walk">
                  <button className="nav-leg-button" onClick={() => { setViewFloor(leg.floor); setMapMode("2d"); }} title={`在 2D 地图查看 ${leg.floor}`}>
                    <span className="nav-leg-floor">{leg.floor}</span>
                    <span className="nav-leg-text"><b>{leg.from.name} → {leg.to.name}</b><small>步行约 {leg.description.meters} 米</small></span>
                    <Icon name="map" size={14}/>
                  </button>
                </li>)}
            </ol>
            <ol className="route-steps nav-steps">{journey.steps.map((step, index) => <li key={index} className={`step-${step.kind}`}>{step.text}</li>)}</ol>
          </div>}
      </section>
    </div>
    <section className="panel nav-map-panel">
      <div className="map-panel-top">
        <div>
          <span className="map-overline">FLOOR GUIDE</span>
          <h3>{mapTitle}</h3>
          {mapMode === "3d" && <div className="nav-3d-scope" role="group" aria-label="3D 显示范围">
            <button type="button" className={threeScope === "route" ? "on" : ""} aria-pressed={threeScope === "route"} onClick={() => setThreeScope("route")}>行程楼层</button>
            <button type="button" className={threeScope === "overview" ? "on" : ""} aria-pressed={threeScope === "overview"} onClick={() => setThreeScope("overview")}>全览</button>
          </div>}
          {mapMode === "3d" && threeScope === "overview" && <p className="nav-3d-floors">全览：整栋楼视角，全部楼层统一高亮</p>}
          {mapMode === "3d" && threeScope === "route" && scene3d?.activeFloors?.length > 0 && <p className="nav-3d-floors">展示楼层：{scene3d.activeFloors.join(" · ")}</p>}
          {mapMode === "2d" && <div className="nav-floor-switch" role="group" aria-label="切换楼层">
            {mapFloorCodes.map((code) => <button key={code} type="button" className={code === viewFloor ? "on" : ""} aria-pressed={code === viewFloor} onClick={() => setViewFloor(code)}>{code}</button>)}
          </div>}
        </div>
        <div className="nav-view-toggle" role="group" aria-label="地图视图切换">
          <button type="button" className={mapMode === "3d" ? "on" : ""} aria-pressed={mapMode === "3d"} onClick={() => setMapMode("3d")}>3D 地图</button>
          <button type="button" className={mapMode === "2d" ? "on" : ""} aria-pressed={mapMode === "2d"} onClick={() => setMapMode("2d")}>2D 地图</button>
        </div>
      </div>
      {mapMode === "3d"
        ? (scene3d ? <Floor3DView sceneData={scene3d} onUnavailable={() => { setMapMode("2d"); showToast("当前浏览器不支持 WebGL，已切换为 2D 地图。"); }}/> : <div className="map-loading" role="status">{loadFailed ? "楼层地图加载失败，请刷新重试" : "正在读取全部楼层…"}</div>)
        : (mapSvg ? <div ref={mapRef} className="interactive-floor-map nav-map" role="group" aria-label={`${viewFloor} 导航地图`} dangerouslySetInnerHTML={{ __html: mapSvg }}/> : loadFailed ? <div className="map-loading" role="status">本层地图加载失败，请刷新重试</div> : <div className="map-loading" role="status">楼层地图加载中…</div>)}
      <div className="nav-map-legend"><span><i className="legend-start"/>起点</span><span><i className="legend-end"/>目的地</span><span><i className="legend-line"/>推荐路线</span><span><i className="legend-transfer"/>换乘电梯</span><span className="demo-tag">演示路线</span></div>
    </section>
    <Footer/>
  </>;
}
