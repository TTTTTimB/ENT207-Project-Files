import { useEffect, useMemo, useRef, useState } from "react";
import { floors, shops, analytics, categories } from "./demoData.js";
import { checkApi, fetchAllShops } from "./api.js";
import { floorSvgLoaders } from "./floorSvgAssets.js";
import { mapFloorCodes } from "./mapFloorCatalog.js";
import { Icon } from "./icons.jsx";
import { SideButton, MobileNav, PageHeading, FloorPills, SearchBox, EmptyState, Footer } from "./ui.jsx";
import { NavigationScreen } from "./NavigationScreen.jsx";
import { LoginScreen } from "./LoginScreen.jsx";
import { AccountAdmin } from "./AccountAdmin.jsx";
import { MerchantWorkspace } from "./MerchantWorkspace.jsx";
import { ProfileDialog } from "./ProfileDialog.jsx";
import { getAuth, screensForRole, defaultScreenForRole, ROLE_LABELS } from "./auth.js";

const money = (n) => `¥${Number(n).toLocaleString("zh-CN")}`;
const mapAsset = (floor) => floor === "1F" ? "/assets/level-1.svg" : floor === "2F" ? "/assets/level-2.svg" : null;

function App() {
  const auth = useMemo(() => getAuth(shops), []);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [screen, setScreen] = useState("home");
  const [floor, setFloor] = useState("1F");
  const [shopId, setShopId] = useState(shops[0].id);
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("today");
  const [metric, setMetric] = useState("sales");
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState([]);
  const [navRequest, setNavRequest] = useState(null);
  const [apiMode, setApiMode] = useState(false);
  const [apiShops, setApiShops] = useState([]);

  // 初始化本机演示账号（首次打开时自动创建演示账号）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await auth.initialize();
        if (cancelled) return;
        const restored = auth.current();
        if (restored) {
          setUser(restored);
          setScreen(defaultScreenForRole(restored.role));
        }
      } catch (failure) {
        if (!cancelled) setAuthError(failure.message || "本机账号初始化失败。");
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [auth]);

  // 尝试连接后端数据库：成功则使用数据库店铺数据，失败则回退到本地演示数据
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await checkApi();
      if (!available || cancelled) return;
      try {
        const rows = await fetchAllShops();
        if (cancelled) return;
        const mapped = rows
          .filter((row) => mapFloorCodes.includes(row.floorCode))
          .map((row) => ({
            id: row.id,
            floor: row.floorCode,
            name: row.name,
            category: "数据库店铺",
            unit: row.unitNumber || "",
            status: row.status,
            sales: 0,
            traffic: 0,
            orders: 0,
          }));
        if (!mapped.length) return;
        setApiShops(mapped);
        setApiMode(true);
        setShopId(mapped[0].id);
      } catch {
        // 接口不可用时保持演示数据，不影响页面使用
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeShops = apiMode && apiShops.length ? apiShops : shops;
  const activeShopIds = useMemo(() => activeShops.map((shop) => shop.id), [activeShops]);
  const categoryOptions = apiMode ? ["全部"] : categories;
  const visibleShops = useMemo(() => activeShops.filter((s) => s.floor === floor && (category === "全部" || s.category === category) && s.name.toLowerCase().includes(query.toLowerCase())), [activeShops, floor, category, query]);
  const activeShop = activeShops.find((s) => s.id === shopId) || activeShops[0];
  const analyticsShop = shops.find((s) => s.floor === floor) || shops[0];
  const roleScreens = user ? screensForRole(user.role) : [];
  const safeScreen = roleScreens.includes(screen) ? screen : user ? defaultScreenForRole(user.role) : "home";

  const showToast = (message) => { setToast(message); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => setToast(""), 2600); };

  // 收藏按账号持久化（与登录演示版一致：superbrand.favorites.<账号id>）
  useEffect(() => {
    if (!user || user.role !== "customer") { setSaved([]); return; }
    setSaved(auth.loadFavorites(user.id, activeShopIds));
  }, [user, auth, activeShopIds]);

  function persistSaved(ids) {
    setSaved(ids);
    if (user && !auth.saveFavorites(user.id, ids)) showToast("浏览器无法保存收藏，请检查本地存储设置。");
  }

  const handleLogin = (nextUser) => {
    setUser(nextUser);
    setScreen(defaultScreenForRole(nextUser.role));
    setFloor("1F");
    setCategory("全部");
    setQuery("");
    setNavRequest(null);
  };
  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setShowProfile(false);
    setSaved([]);
    setScreen("home");
  };
  const goHome = () => { if (user) setScreen(defaultScreenForRole(user.role)); };
  const openShop = (shop) => { setShopId(shop.id); setScreen("detail"); };
  const setFloorAndResetShop = (value) => { setFloor(value); const first = activeShops.find((s) => s.floor === value); if (first) setShopId(first.id); };

  if (!authReady) {
    return <div className="auth-loading" role="status"><span className="brand-mark">S</span><p>正在准备本机演示账号…</p></div>;
  }
  if (!user) {
    return <LoginScreen auth={auth} initialError={authError} onLogin={handleLogin}/>;
  }

  const isAdmin = user.role === "admin";
  const roleTabLabel = user.role === "customer" ? "顾客端" : isAdmin ? "商场管理工作台" : "商户经营分析";

  return <div className="app-shell">
    <header className="topbar session-topbar">
      <button className="brand" onClick={goHome} aria-label="回到首页"><span className="brand-mark">S</span><span><b>SUPER BRAND MALL</b><small>简化 · 纯粹 · 智能</small></span></button>
      <span className="session-role">{roleTabLabel}</span>
      <div className="top-right"><span className="open-badge" title={apiMode ? "店铺数据来自数据库" : "当前为本地演示数据"}><i/>{apiMode ? "数据库已连接" : "演示数据"}</span><button className="session-person" onClick={() => setShowProfile(true)} aria-label="查看个人信息"><span className="avatar">{user.name.slice(0, 1)}</span><span>{user.name}</span></button><button className="session-logout" onClick={handleLogout}>退出登录</button></div>
    </header>
    <div className="session-demo-note">本机登录演示 · 账号与收藏仅保存在此浏览器，经营数据为模拟值。</div>
    {user.role === "customer" ? <div className="guest-layout">
      <aside className="side-nav">
        <div className="side-caption">DISCOVER</div>
        <SideButton icon="home" active={safeScreen === "home"} onClick={() => setScreen("home")}>商场首页</SideButton>
        <SideButton icon="shop" active={safeScreen === "directory"} onClick={() => setScreen("directory")}>店铺目录</SideButton>
        <SideButton icon="nav" active={safeScreen === "navigate"} onClick={() => { setNavRequest(null); setScreen("navigate"); }}>室内导航</SideButton>
        <SideButton icon="heart" active={safeScreen === "saved"} onClick={() => setScreen("saved")}>我的收藏</SideButton>
        <div className="side-promo"><span className="promo-icon"><Icon name="sparkle"/></span><b>探索正大广场</b><p>发现喜欢的品牌与空间</p><button onClick={() => { setScreen("directory"); setCategory("全部"); }}>浏览店铺 <Icon name="arrow" size={15}/></button></div>
        <p className="side-foot">上海正大广场<br/>陆家嘴 · 浦东新区</p>
      </aside>
      <MobileNav items={[["home","首页","home"],["directory","店铺","shop"],["navigate","导航","nav"],["saved","收藏","heart"]]} current={safeScreen} onSelect={setScreen}/>
      <main className="main-content">
        {safeScreen === "home" && <GuestHome floor={floor} setFloor={setFloorAndResetShop} visibleShops={visibleShops} openShop={openShop} category={category} setCategory={setCategory} query={query} setQuery={setQuery} showToast={showToast} goDirectory={() => setScreen("directory")} goNavigate={() => setScreen("navigate")} />}
        {safeScreen === "directory" && <Directory floor={floor} setFloor={setFloorAndResetShop} visibleShops={visibleShops} openShop={openShop} category={category} setCategory={setCategory} query={query} setQuery={setQuery} categoryOptions={categoryOptions} />}
        {safeScreen === "saved" && <Saved saved={saved} setSaved={persistSaved} shops={activeShops} openShop={openShop} showToast={showToast} />}
        {safeScreen === "navigate" && <NavigationScreen floor={floor} initialDest={navRequest} onDestConsumed={() => setNavRequest(null)} showToast={showToast} />}
        {safeScreen === "detail" && <ShopDetail shop={activeShop} goBack={() => setScreen("directory")} showToast={showToast} saved={saved.includes(activeShop.id)} toggleSaved={() => persistSaved(saved.includes(activeShop.id) ? saved.filter((x) => x !== activeShop.id) : [...saved, activeShop.id])} onNavigate={(shop) => { setFloorAndResetShop(shop.floor); setNavRequest({ floor: shop.floor, name: shop.name }); setScreen("navigate"); }} canOpenAnalytics={false} openAnalytics={() => {}} />}
      </main>
    </div> : <div className="merchant-layout">
      <aside className="merchant-nav">
        <div className="workspace-label">经营工作台</div><div className="mall-selector"><span className="mall-symbol">S</span><span><b>上海正大广场</b><small>{isAdmin ? "商场管理 · 管理员" : "商户工作台 · 商户"}</small></span><span className="chevron">⌄</span></div>
        <div className="side-caption">数据分析</div>
        <SideButton icon="chart" active={safeScreen === "overview"} onClick={() => setScreen("overview")}>经营总览</SideButton>
        <SideButton icon="shop" active={safeScreen === "store-analytics"} onClick={() => setScreen("store-analytics")}>店铺分析</SideButton>
        <SideButton icon="trend" active={safeScreen === "trends"} onClick={() => setScreen("trends")}>客流与消费趋势</SideButton>
        <SideButton icon="list" active={safeScreen === "ranking"} onClick={() => setScreen("ranking")}>店铺排行</SideButton>
        {isAdmin && <SideButton icon="people" active={safeScreen === "accounts"} onClick={() => setScreen("accounts")}>账号管理</SideButton>}
        <div className="merchant-nav-bottom"><span className="avatar avatar-small">{user.name.slice(0, 1)}</span><span><b>{user.name}</b><small>{ROLE_LABELS[user.role]} · 演示账户</small></span><span className="chevron">···</span></div>
      </aside>
      <MobileNav items={[["overview","总览","chart"],["store-analytics","店铺","shop"],["trends","趋势","trend"],["ranking","排行","list"],...(isAdmin ? [["accounts","账号","people"]] : [])]} current={safeScreen} onSelect={setScreen}/>
      <main className="main-content analytics-content">
        {!isAdmin && <MerchantWorkspace user={user} screen={safeScreen} setScreen={setScreen} shops={shops}/>}
        {isAdmin && safeScreen === "overview" && <AnalyticsOverview floor={floor} setFloor={setFloorAndResetShop} dateRange={dateRange} setDateRange={setDateRange} openShop={openShopFromAnalytics} setScreen={setScreen} setShopId={setShopId} />}
        {isAdmin && safeScreen === "store-analytics" && <StoreAnalytics shop={analyticsShop} floor={floor} setFloor={setFloorAndResetShop} shopId={shopId} setShopId={setShopId} dateRange={dateRange} setDateRange={setDateRange} showToast={showToast} />}
        {isAdmin && safeScreen === "trends" && <Trends floor={floor} setFloor={setFloorAndResetShop} dateRange={dateRange} setDateRange={setDateRange} metric={metric} setMetric={setMetric} />}
        {isAdmin && safeScreen === "ranking" && <Ranking floor={floor} setFloor={setFloorAndResetShop} setShopId={setShopId} setScreen={setScreen} />}
        {isAdmin && safeScreen === "accounts" && <AccountAdmin auth={auth} shops={shops}/>}
      </main>
    </div>}
    {showProfile && <ProfileDialog user={user} shops={shops} onClose={() => setShowProfile(false)} onLogout={handleLogout}/>}
    {toast && <div className="toast"><span>✦</span>{toast}</div>}
  </div>;
}

function openShopFromAnalytics(shop, setShopId, setScreen) { setShopId(shop.id); setScreen("store-analytics"); }

function GuestHome({ floor, setFloor, visibleShops, openShop, category, setCategory, query, setQuery, showToast, goDirectory, goNavigate }) {
  const [interactiveMap, setInteractiveMap] = useState(null);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);
  const mobileMap = interactiveMap?.replace('viewBox="0 0 1400 720"', 'viewBox="0 0 1000 650"') || null;
  const mapContainerRef = useRef(null);
  const mobileMapRef = useRef(null);
  const [mapNames, setMapNames] = useState([]);
  const [selectedMapName, setSelectedMapName] = useState("");
  useEffect(() => {
    let current = true;
    setInteractiveMap(null);
    setMapLoadFailed(false);
    const load = floorSvgLoaders[floor];
    if (load) load().then((svg) => { if (current) setInteractiveMap(svg); }).catch(() => { if (current) setMapLoadFailed(true); });
    return () => { current = false; };
  }, [floor]);
  useEffect(() => {
    if (!interactiveMap) { setMapNames([]); setSelectedMapName(""); return; }
    const parsed = new DOMParser().parseFromString(interactiveMap, "image/svg+xml");
    const entries = [...parsed.querySelectorAll(".shop")].map((group) => ({
      id: group.id,
      name: group.querySelector(".list-item text")?.textContent?.trim() || "",
    })).filter((entry) => entry.id && entry.name);
    setMapNames(entries);
    setSelectedMapName("");
  }, [interactiveMap]);
  useEffect(() => {
    const roots = [mapContainerRef.current, mobileMapRef.current].filter(Boolean);
    const cleanups = [];
    for (const root of roots) {
      const svg = root.querySelector("svg");
      const overlay = svg?.querySelector("#facility-overlay");
      const facilities = [...(svg?.querySelectorAll(".facility") || [])];
      if (!svg || !overlay || facilities.length === 0) continue;
      let pinned = null;
      svg.setAttribute("data-facility-interactive", "true");
      const show = (item) => {
        overlay.replaceChildren();
        const tooltip = item?.querySelector(".facility-tooltip");
        if (tooltip) overlay.append(tooltip.cloneNode(true));
      };
      const nearest = (event) => {
        const matrix = svg.getScreenCTM();
        if (!matrix) return null;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        let winner = null, distance = 9;
        for (const item of facilities) {
          const current = Math.hypot(Number(item.dataset.x) - point.x, Number(item.dataset.y) - point.y);
          if (current < distance) { winner = item; distance = current; }
        }
        return winner;
      };
      const clear = () => { pinned = null; facilities.forEach((item) => item.setAttribute("aria-pressed", "false")); show(null); };
      const toggle = (item) => {
        pinned = pinned === item ? null : item;
        facilities.forEach((facility) => facility.setAttribute("aria-pressed", String(facility === pinned)));
        show(pinned);
      };
      const onPointerMove = (event) => show(nearest(event) || pinned);
      const onPointerLeave = () => show(pinned);
      const onClick = (event) => { const item = nearest(event); if (item) { item.focus(); toggle(item); } else clear(); };
      const onKeyDown = (event) => { if (event.key === "Escape") clear(); };
      const facilityHandlers = facilities.map((facility) => {
        const onFocus = () => show(facility);
        const onBlur = () => show(pinned);
        const onFacilityKeyDown = (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(facility); } };
        facility.addEventListener("focus", onFocus);
        facility.addEventListener("blur", onBlur);
        facility.addEventListener("keydown", onFacilityKeyDown);
        return () => {
          facility.removeEventListener("focus", onFocus);
          facility.removeEventListener("blur", onBlur);
          facility.removeEventListener("keydown", onFacilityKeyDown);
        };
      });
      svg.addEventListener("pointermove", onPointerMove);
      svg.addEventListener("pointerleave", onPointerLeave);
      svg.addEventListener("click", onClick);
      svg.addEventListener("keydown", onKeyDown);
      cleanups.push(() => {
        svg.removeEventListener("pointermove", onPointerMove);
        svg.removeEventListener("pointerleave", onPointerLeave);
        svg.removeEventListener("click", onClick);
        svg.removeEventListener("keydown", onKeyDown);
        facilityHandlers.forEach((cleanup) => cleanup());
        svg.removeAttribute("data-facility-interactive");
      });
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [interactiveMap]);
  function focusMapName(id) {
    const map = mobileMapRef.current;
    const target = [...(map?.querySelectorAll(".shop") || [])].find((group) => group.id === id);
    map?.querySelectorAll(".shop.is-selected").forEach((group) => group.classList.remove("is-selected"));
    target?.classList.add("is-selected");
    target?.focus({ preventScroll: true });
    map?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  useEffect(() => {
    if (selectedMapName) focusMapName(selectedMapName);
  }, [selectedMapName, interactiveMap]);
  return <>
    <section className="welcome-row"><div><div className="eyebrow">WELCOME TO SUPER BRAND MALL</div><h1>发现下一段<br/><em>美好时光</em></h1><p>在上海正大广场，遇见你喜欢的品牌、味道与生活。</p><div className="welcome-actions"><button className="button-dark" onClick={() => document.getElementById("discover-shops")?.scrollIntoView({ behavior: "smooth" })}>探索店铺 <Icon name="arrow" size={16}/></button><button className="button-quiet" onClick={goNavigate}>室内导航 <Icon name="nav" size={16}/></button></div></div><div className="welcome-art"><div className="art-orbit orbit-a"/><div className="art-orbit orbit-b"/><div className="art-sun"/><div className="art-copy"><small>LUJIAZUI · SHANGHAI</small><strong>Make room<br/>for wonder.</strong><span>EST. 2002　·　A PLACE TO GATHER</span></div><div className="art-leaf leaf-one">✳</div><div className="art-leaf leaf-two">✳</div></div></section>
    <section className="explore-section" id="discover-shops"><div className="section-heading"><div><div className="eyebrow">EXPLORE THE MALL</div><h2>楼层与店铺</h2></div><FloorPills value={floor} setValue={setFloor} codes={mapFloorCodes}/></div>
      <div className="interactive-floor-panel"><div className="map-panel-top"><div><span className="map-overline">FLOOR GUIDE</span><h3>{floor} · 楼层导览</h3></div><span className="map-status"><i/>开放中</span></div>{interactiveMap ? <><p className="map-hover-hint">悬停右侧店名或在手机上点按店名，可高亮对应位置</p><div ref={mapContainerRef} className="interactive-floor-map interactive-floor-desktop" role="group" aria-label={`${floor} 楼层地图与店铺列表`} dangerouslySetInnerHTML={{ __html: interactiveMap }}/><div className="interactive-floor-mobile"><div ref={mobileMapRef} className="interactive-floor-map mobile-map" role="group" aria-label={`${floor} 楼层地图`} dangerouslySetInnerHTML={{ __html: mobileMap }}/><div className="mobile-shop-list" role="group" aria-label={`${floor} 店铺名称`}>{mapNames.map((entry) => <button key={entry.id} className="mobile-shop-name" aria-current={selectedMapName === entry.id ? "true" : undefined} onClick={() => setSelectedMapName(entry.id)}>{entry.name}</button>)}</div></div></> : mapLoadFailed ? <div className="map-loading" role="status">楼层地图加载失败，请刷新重试</div> : <div className="map-loading" role="status">楼层地图加载中…</div>}<div className="map-panel-foot"><span><Icon name="pin" size={15}/> 陆家嘴西路168号</span><button onClick={goNavigate}>地图导览 <Icon name="arrow" size={14}/></button></div></div>
    </section>
    <section className="feature-strip"><div><span className="feature-index">01</span><div><small>SHOP & DISCOVER</small><b>品牌好店</b><p>从日常灵感，到特别时刻</p></div></div><div><span className="feature-index">02</span><div><small>TASTE & GATHER</small><b>风味相聚</b><p>为一餐一味，留一点时间</p></div></div><div><span className="feature-index">03</span><div><small>MAKE IT YOURS</small><b>自在探索</b><p>浏览店铺，找到想去的地方</p></div></div></section>
    <Footer/>
  </>;
}

function ShopFilters({ category, setCategory, options }) {
  return <div className="category-filters">{(options || categories).map((c) => <button key={c} className={category === c ? "chosen" : ""} onClick={() => setCategory(c)}>{c}</button>)}</div>;
}

function MapPlaceholder({ floor }) {
  return <div className="map-placeholder"><Icon name="map" size={25}/><b>{floor} 楼层地图待接入</b><span>当前可浏览本层店铺列表</span></div>;
}

function ShopRow({ shop, index, onClick }) {
  const swatches = ["sand", "olive", "rose", "blue", "cream"];
  return <button className="shop-row" onClick={onClick}><span className={`shop-monogram ${swatches[index % swatches.length]}`}>{shop.name.slice(0, 1)}</span><span className="shop-row-text"><b>{shop.name}</b><small>{shop.category} <i>·</i> {shop.unit || `${shop.floor} 楼`}</small></span><span className="shop-open">营业中</span><Icon name="arrow" size={15}/></button>;
}

function Directory({ floor, setFloor, visibleShops, openShop, category, setCategory, query, setQuery, categoryOptions }) {
  const filters = categoryOptions || categories;
  return <><PageHeading eyebrow="SHOP DIRECTORY" title="店铺目录" subtitle="按楼层与类型，找到想去的店铺。" action={<FloorPills value={floor} setValue={setFloor} codes={mapFloorCodes}/>} />
    <div className="directory-tools"><SearchBox query={query} setQuery={setQuery}/>{filters.length > 1 && <ShopFilters category={category} setCategory={setCategory} options={filters}/>}<span className="result-count">{visibleShops.length} 家店铺</span></div>
    <div className="directory-grid">{visibleShops.map((shop, i) => <button className="directory-card" key={shop.id} onClick={() => openShop(shop)}><span className={`directory-art tone-${i % 5}`}><span className="directory-art-label">{shop.category}</span><strong>{shop.name}</strong><span className="art-decoration">✳</span></span><span className="directory-card-meta"><span><b>{shop.name}</b><small>{shop.unit || `${shop.floor} 楼`}　·　营业中</small></span><Icon name="arrow" size={16}/></span></button>)}</div>
    {visibleShops.length === 0 && <EmptyState title="没有找到相关店铺" text="试试更换楼层或搜索关键词。"/>}<Footer/>
  </>;
}

function ShopDetail({ shop, goBack, showToast, saved, toggleSaved, onNavigate, openAnalytics, canOpenAnalytics = true }) {
  return <><button className="back-link" onClick={goBack}><Icon name="back" size={16}/> 返回店铺列表</button><div className="detail-hero"><span className={`detail-hero-art tone-${shop.id % 5}`}><span className="map-overline">SUPER BRAND MALL · {shop.floor}</span><strong>{shop.name}</strong><span className="art-decoration">✳</span></span><div className="detail-overview"><div className="eyebrow">{shop.floor} · {shop.category.toUpperCase()}</div><h1>{shop.name}</h1><p className="detail-sub">在正大广场，发现更多关于{shop.name}的灵感。</p><div className="detail-info"><span><Icon name="pin" size={17}/>{shop.unit || `${shop.floor} 楼`}</span><span><Icon name="clock" size={17}/>10:00 – 22:00</span><span className="open-label"><i/>营业中</span></div><div className="detail-actions"><button className="button-dark" onClick={() => onNavigate(shop)}>前往店铺 <Icon name="nav" size={16}/></button><button className={`button-outline ${saved ? "is-saved" : ""}`} onClick={toggleSaved}><Icon name="heart" size={16}/>{saved ? "已收藏" : "收藏店铺"}</button></div></div></div><div className="detail-lower"><div className="detail-note"><span className="eyebrow">ABOUT THIS PLACE</span><h2>为日常发现<br/>一点新意。</h2><p>店铺信息来自数据库；营业时间、品牌介绍与实时经营数据将在后续接入。</p></div><div className="traffic-card"><div className="card-topline"><span>楼层热度</span><span className="demo-tag">模拟数据</span></div><b>人气适中</b><p>当前楼层客流平稳，适合从容逛逛。</p><div className="traffic-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>{canOpenAnalytics && <button className="text-link" onClick={openAnalytics}>查看经营数据 <Icon name="arrow" size={14}/></button>}</div></div><Footer/></>;
}

function Saved({ saved, setSaved, shops: shopList, openShop, showToast }) {
  const savedShops = shopList.filter((s) => saved.includes(s.id));
  return <><PageHeading eyebrow="YOUR COLLECTION" title="我的收藏" subtitle="把喜欢的店铺，留在这里。"/>{savedShops.length ? <div className="directory-grid">{savedShops.map((shop, i) => <div className="saved-card" key={shop.id}><button className="directory-card" onClick={() => openShop(shop)}><span className={`directory-art tone-${i % 5}`}><span className="directory-art-label">{shop.category}</span><strong>{shop.name}</strong></span><span className="directory-card-meta"><span><b>{shop.name}</b><small>{shop.floor}　·　{shop.unit || "正大广场"}</small></span><Icon name="arrow" size={16}/></span></button><button className="remove-saved" onClick={() => {setSaved(saved.filter((id) => id !== shop.id)); showToast("已从收藏中移除");}}>移除收藏</button></div>)}</div> : <EmptyState title="还没有收藏店铺" text="浏览店铺并点选“收藏店铺”，就会出现在这里。" action={<button className="button-dark" onClick={() => showToast("请从左侧打开店铺目录")}>去发现店铺</button>}/>}<Footer/></>;
}

function DateFilter({ value, setValue }) {
  return <div className="date-filter">{[["today", "今日"], ["7d", "近 7 天"], ["30d", "近 30 天"]].map(([v, label]) => <button key={v} className={value === v ? "on" : ""} onClick={() => setValue(v)}>{label}</button>)}</div>;
}

function AnalyticsOverview({ floor, setFloor, dateRange, setDateRange, openShop, setScreen, setShopId }) {
  const floorStats = floors.find((f) => f.code === floor) || floors[1];
  const heading = <div className="filter-row"><FloorPills value={floor} setValue={setFloor}/><DateFilter value={dateRange} setValue={setDateRange}/></div>;
  return <><PageHeading eyebrow="BUSINESS INTELLIGENCE" title="经营总览" subtitle="查看楼层客流与消费表现，及时掌握经营动态。" action={heading}/><div className="sim-banner"><span className="demo-tag">演示数据</span><span>以下为界面展示用模拟数据，尚未连接实时数据库。</span><button onClick={() => setScreen("store-analytics")}>数据口径 <Icon name="arrow" size={14}/></button></div>
    <div className="analytics-kpis"><Kpi icon="people" label="楼层期末在场人数" value={floorStats.occupancy.toLocaleString("zh-CN")} suffix="人" delta="较上一时段" change="12.8%" tone="olive"/><Kpi icon="bag" label="楼层净销售额" value={floorStats.sales.toLocaleString("zh-CN")} suffix="元" delta="较上一周期" change="8.6%" tone="gold"/><Kpi icon="pin" label="楼层进入人次" value={floorStats.traffic.toLocaleString("zh-CN")} suffix="人次" delta="较上一周期" change="5.2%" tone="blue"/><Kpi icon="chart" label="支付订单数" value={floorStats.orders.toLocaleString("zh-CN")} suffix="单" delta="较上一周期" change="3.4%" tone="rose"/></div>
    <div className="dashboard-grid"><section className="panel trend-panel"><div className="panel-heading"><div><span className="map-overline">TRAFFIC & SALES</span><h3>客流与消费趋势</h3></div><button className="small-select" onClick={() => setScreen("trends")}>查看趋势 <Icon name="arrow" size={14}/></button></div><div className="chart-legend"><span><i className="legend-line"/>进入人次</span><span><i className="legend-bar"/>净销售额</span></div><TrendChart/></section>
      <section className="panel floor-heat"><div className="panel-heading"><div><span className="map-overline">FLOOR ACTIVITY</span><h3>{floor} 客流分布</h3></div><span className="demo-tag">示意</span></div><div className="heatmap-visual">{mapAsset(floor) ? <><img src={mapAsset(floor)} alt={`${floor} 楼层客流分布示意图`}/><span className="heat heat-a"/><span className="heat heat-b"/><span className="heat heat-c"/><span className="heat heat-d"/><span className="heatmap-pin pin-a"/><span className="heatmap-pin pin-b"/><span className="heatmap-pin pin-c"/></> : <MapPlaceholder floor={floor}/>}</div>{mapAsset(floor) && <div className="heatmap-legend"><span>低</span><i/><i/><i/><i/><span>高</span></div>}</section></div>
    <section className="panel ranking-preview"><div className="panel-heading"><div><span className="map-overline">STORE PERFORMANCE</span><h3>本层店铺表现</h3></div><button className="small-select" onClick={() => setScreen("ranking")}>查看排行 <Icon name="arrow" size={14}/></button></div><StoreRanking compact floor={floor} onClick={(s) => openShop(s, setShopId, setScreen)}/></section><Footer/></>;
}

function Kpi({ icon, label, value, suffix, delta, change, tone }) {
  return <div className="kpi-card"><div className={`kpi-icon ${tone}`}><Icon name={icon} size={18}/></div><span className="kpi-label">{label}</span><div className="kpi-number">{value}<small>{suffix}</small></div><div className="kpi-delta"><span>↗ {change}</span><small>{delta}</small></div></div>;
}

function TrendChart() {
  return <div className="trend-chart"><div className="chart-y-labels"><span>5,000</span><span>3,750</span><span>2,500</span><span>1,250</span><span>0</span></div><div className="chart-main"><div className="chart-grid-lines"><i/><i/><i/><i/><i/></div><div className="chart-bars">{analytics.trend.map((item, i) => <div className="chart-column" key={item.label}><span className="chart-bar" style={{height: `${item.sales / 51}px`}}/><span className="chart-dot" style={{bottom: `${item.traffic / 35}px`}}/><small>{item.label}</small></div>)}</div><svg className="chart-line" viewBox="0 0 600 180" preserveAspectRatio="none" aria-label="客流趋势线"><path d="M10 104 C60 97 64 118 110 106 S155 80 210 92 S260 72 310 79 S360 101 410 67 S460 76 510 49 S562 62 590 24"/></svg></div></div>;
}

function StoreAnalytics({ shop, floor, setFloor, shopId, setShopId, dateRange, setDateRange, showToast }) {
  const floorStats = floors.find((f) => f.code === floor) || floors[1];
  const sameFloor = shops.filter((s) => s.floor === floor);
  return <><PageHeading eyebrow="STORE INSIGHTS" title="店铺分析" subtitle="深入了解单店客流与消费表现。" action={<div className="filter-row"><FloorPills value={floor} setValue={setFloor}/><DateFilter value={dateRange} setValue={setDateRange}/></div>}/><div className="store-select-row"><label>选择店铺<select value={shopId} onChange={(e) => setShopId(Number(e.target.value))}>{sameFloor.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><span className="demo-tag">模拟数据 · {shop.unit || shop.floor}</span></div>
    <div className="store-summary"><div><span className="eyebrow">{shop.floor} · {shop.category.toUpperCase()}</span><h2>{shop.name}</h2><p>营业中　·　今日 10:00 – 22:00</p></div><span className={`store-monogram tone-${shop.id % 5}`}>{shop.name.slice(0,1)}</span></div>
    <div className="analytics-kpis store-kpis"><Kpi icon="people" label="期末店内人数" value="86" suffix="人" delta="当前统计窗口" change="实时模拟" tone="olive"/><Kpi icon="bag" label="店铺净销售额" value="8,640" suffix="元" delta="今日累计" change="6.8%" tone="gold"/><Kpi icon="pin" label="进店人次" value="486" suffix="人次" delta="今日累计" change="4.2%" tone="blue"/><Kpi icon="chart" label="支付订单数" value="128" suffix="单" delta="客单价 ¥67.50" change="2.1%" tone="rose"/></div>
    <div className="dashboard-grid store-insight-grid"><section className="panel trend-panel"><div className="panel-heading"><div><span className="map-overline">HOURLY PERFORMANCE</span><h3>每小时客流与销售额</h3></div><button className="small-select" onClick={() => showToast("图表数据为演示值，接入数据库后将按时间筛选。")}>数据说明 <Icon name="arrow" size={14}/></button></div><div className="chart-legend"><span><i className="legend-line"/>进入人次</span><span><i className="legend-bar"/>净销售额</span></div><TrendChart/></section><section className="panel store-context"><span className="map-overline">FLOOR CONTEXT</span><h3>{shop.floor} 楼经营概览</h3><div className="context-number">{floorStats.occupancy.toLocaleString("zh-CN")} <small>人</small></div><p>楼层期末在场人数</p><div className="context-divider"/><div className="context-line"><span>楼层净销售额</span><b>{money(floorStats.sales)}</b></div><div className="context-line"><span>楼层进入人次</span><b>{floorStats.traffic.toLocaleString("zh-CN")}</b></div><button className="text-link" onClick={() => showToast("数据来源：本地演示数据")}>查看统计口径 <Icon name="arrow" size={14}/></button></section></div><Footer/></>;
}

function Trends({ floor, setFloor, dateRange, setDateRange, metric, setMetric }) {
  const floorStats = floors.find((f) => f.code === floor) || floors[1];
  const isTraffic = metric === "traffic";
  return <><PageHeading eyebrow="PERFORMANCE TRENDS" title="客流与消费趋势" subtitle="比较不同时间段的楼层经营表现。" action={<div className="filter-row"><FloorPills value={floor} setValue={setFloor}/><DateFilter value={dateRange} setValue={setDateRange}/></div>}/><div className="sim-banner"><span className="demo-tag">模拟数据</span><span>趋势值为本地演示数据。客流为进入人次，消费为净销售额。</span></div><section className="panel trend-full"><div className="panel-heading"><div><span className="map-overline">{floor} · HOURLY VIEW</span><h3>每日时段表现</h3></div><div className="toggle-metric"><button className={metric === "sales" ? "on" : ""} onClick={() => setMetric("sales")}>净销售额</button><button className={metric === "traffic" ? "on" : ""} onClick={() => setMetric("traffic")}>进入人次</button></div></div><div className="big-metric"><b>{isTraffic ? floorStats.traffic.toLocaleString("zh-CN") : money(floorStats.sales)}</b><span>较上一周期 <strong>↗ {isTraffic ? "5.2%" : "8.6%"}</strong></span></div><div className="wide-bars">{analytics.trend.map((v) => <div key={v.label}><div className="wide-bar-track"><i style={{height: `${(isTraffic ? v.traffic / 52 : v.sales / 52)}%`}}/></div><span>{v.label}</span></div>)}</div></section><div className="dashboard-grid"><section className="panel"><span className="map-overline">BUSIEST HOUR</span><h3>高峰时段</h3><div className="peak-time">14:00 <small>– 15:00</small></div><p className="muted">进入人次最高的完整小时</p></section><section className="panel"><span className="map-overline">DATA COVERAGE</span><h3>数据覆盖情况</h3><div className="coverage-row"><span>客流统计</span><b>完整 <i>96%</i></b></div><div className="coverage-track"><i style={{width:"96%"}}/></div><div className="coverage-row"><span>消费统计</span><b>完整 <i>91%</i></b></div><div className="coverage-track"><i style={{width:"91%"}}/></div><small className="muted">模拟状态：接入数据库后显示实际完整度。</small></section></div><Footer/></>;
}

function Ranking({ floor, setFloor, setShopId, setScreen }) {
  const [sort, setSort] = useState("sales");
  const ranking = [...shops.filter((s) => s.floor === floor)].sort((a,b) => sort === "traffic" ? b.traffic-a.traffic : sort === "orders" ? b.orders-a.orders : b.sales-a.sales);
  return <><PageHeading eyebrow="STORE RANKING" title="店铺排行" subtitle="比较本楼层店铺在所选周期内的表现。" action={<FloorPills value={floor} setValue={setFloor}/>} /><div className="sim-banner"><span className="demo-tag">演示数据</span><span>无统计记录的店铺，接入后会显示为暂无数据，不会按零值参与排行。</span></div><section className="panel ranking-table-panel"><div className="ranking-controls"><div className="ranking-tabs">{[["sales","净销售额"],["traffic","进店人次"],["orders","订单数"]].map(([key,label]) => <button className={sort === key ? "on" : ""} key={key} onClick={() => setSort(key)}>{label}</button>)}</div><span className="map-overline">{floor} · {ranking.length} STORES</span></div><StoreRanking floor={floor} shopsList={ranking} sort={sort} onClick={(shop) => {setShopId(shop.id); setScreen("store-analytics");}}/><div className="ranking-foot">展示本楼层演示店铺　·　具体指标口径可在接入后端时调整</div></section><Footer/></>;
}

function StoreRanking({ floor, onClick, compact = false, shopsList, sort = "sales" }) {
  const list = shopsList || [...shops.filter((s) => s.floor === floor)].sort((a,b) => b.sales-a.sales);
  const metricKey = sort === "traffic" ? "traffic" : sort === "orders" ? "orders" : "sales";
  return <div className={`store-ranking ${compact ? "compact-ranking" : ""}`}><div className="ranking-header"><span>#</span><span>店铺</span><span>净销售额</span><span>进店人次</span><span>支付订单</span><span/></div>{list.slice(0, compact ? 5 : 12).map((shop,i) => <button className="ranking-row" key={shop.id} onClick={() => onClick?.(shop)}><span className={`rank-num rank-${i+1}`}>{String(i+1).padStart(2,"0")}</span><span className="rank-shop"><i className={`rank-monogram tone-${i%5}`}>{shop.name.slice(0,1)}</i><span><b>{shop.name}</b><small>{shop.category} · {shop.unit || shop.floor}</small></span></span><span className={metricKey === "sales" ? "metric-highlight" : ""}>{money(shop.sales)}</span><span className={metricKey === "traffic" ? "metric-highlight" : ""}>{shop.traffic.toLocaleString("zh-CN")}</span><span className={metricKey === "orders" ? "metric-highlight" : ""}>{shop.orders}</span><Icon name="arrow" size={14}/></button>)}</div>;
}

export { App };
