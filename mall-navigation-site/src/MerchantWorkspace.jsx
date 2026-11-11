import { t, tUnit } from "./i18n.js";
import { useMemo, useState } from "react";
import { analytics } from "./demoData.js";
import { PageHeading, EmptyState, Footer } from "./ui.jsx";
import { Icon } from "./icons.jsx";
import { shopsForUser } from "./auth.js";
const money = value => `¥${Number(value).toLocaleString("zh-CN")}`;
const TITLES = {
  overview: "经营总览",
  "store-analytics": "店铺分析",
  trends: "客流与消费趋势",
  ranking: "店铺排行"
};

// 商户工作台：只展示当前账号被授权的店铺（账号与界面绑定）
export function MerchantWorkspace({
  user,
  screen,
  setScreen,
  shops
}) {
  const granted = shopsForUser(user, shops);
  const [selectedId, setSelectedId] = useState(granted[0]?.id);
  const [metric, setMetric] = useState("sales");
  const [sort, setSort] = useState("sales");
  const selected = granted.find(shop => shop.id === selectedId) || granted[0];
  const totals = granted.reduce((result, shop) => ({
    sales: result.sales + shop.sales,
    traffic: result.traffic + shop.traffic,
    orders: result.orders + shop.orders
  }), {
    sales: 0,
    traffic: 0,
    orders: 0
  });
  const ranked = useMemo(() => [...granted].sort((a, b) => b[sort] - a[sort]), [granted, sort]);
  const scope = screen === "store-analytics" && selected ? selected : totals;
  const openStore = shop => {
    setSelectedId(shop.id);
    setScreen("store-analytics");
  };
  const trendMax = Math.max(...analytics.trend.map(item => item[metric]));
  if (!granted.length) {
    return <section className="scoped-dashboard"><EmptyState title={t("尚未分配店铺")} text={t("请联系管理员分配店铺后重新登录。")} /><Footer /></section>;
  }
  return <section className="scoped-dashboard">
    <PageHeading eyebrow="YOUR STORE WORKSPACE" title={t(TITLES[screen] || TITLES.overview)} subtitle={t("{v1} · 已授权 {v2} 家店铺", {
      v1: t(user.name),
      v2: granted.length
    })} />
    <div className="sim-banner"><span className="demo-tag">{t("演示数据")}</span><span>{t("仅展示本账号所属店铺；金额、客流及趋势均为模拟值。")}</span></div>
    {screen === "store-analytics" && <div className="store-select-row"><label>{t("选择店铺")}<select value={selected.id} onChange={event => setSelectedId(Number(event.target.value))}>{granted.map(shop => <option key={shop.id} value={shop.id}>{shop.floor} · {shop.name}</option>)}</select></label></div>}

    {(screen === "overview" || screen === "store-analytics") && <>
      <div className="merchant-metrics">
        {[[t("净销售额"), money(scope.sales)], [t("进店人次"), t("{v1} 人次", {
          v1: scope.traffic.toLocaleString("zh-CN")
        })], [t("支付订单"), t("{v1} 单", {
          v1: scope.orders.toLocaleString("zh-CN")
        })], [t("平均订单金额"), money((scope.sales / Math.max(scope.orders, 1)).toFixed(2))]].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong><small>{t("今日模拟数据")}</small></div>)}
      </div>
      {screen === "store-analytics" ? <div className="panel assigned-detail">
            <span className="eyebrow">STORE PROFILE</span>
            <h2>{selected.name}</h2>
            <p>{t(selected.category)} · {tUnit(selected.unit)}</p>
            <p>{t("营业时间 10:00–22:00（演示）")}</p>
            <button className="button-outline" onClick={() => setScreen("trends")}>{t("查看授权店铺趋势")}</button>
          </div> : <>
            <h2 className="assigned-heading">{t("我的店铺")}</h2>
            <div className="assigned-shops">{granted.map(shop => <button className="panel" key={shop.id} onClick={() => openStore(shop)}>
              <span>{shop.floor} · {t(shop.category)}</span>
              <h3>{shop.name}</h3>
              <b>{money(shop.sales)}</b>
              <small>{t("查看店铺分析 →")}</small>
            </button>)}</div>
          </>}
    </>}

    {screen === "trends" && <section className="panel assigned-detail">
      <div className="panel-heading">
        <div><span className="eyebrow">AUTHORIZED STORES</span><h2>{t("今日时段趋势")}</h2></div>
        <div className="toggle-metric">
          <button className={metric === "sales" ? "on" : ""} onClick={() => setMetric("sales")}>{t("销售额")}</button>
          <button className={metric === "traffic" ? "on" : ""} onClick={() => setMetric("traffic")}>{t("客流")}</button>
        </div>
      </div>
      <p>{t("授权店铺合计：")}{metric === "sales" ? money(totals.sales) : t("{v1} 人次", {
          v1: totals.traffic.toLocaleString("zh-CN")
        })}</p>
      <div className="scoped-bars">{analytics.trend.map(item => {
          const trendTotal = analytics.trend.reduce((sum, entry) => sum + entry[metric], 0);
          const scaled = Math.round(totals[metric] * item[metric] / trendTotal);
          return <div key={item.label}>
          <span>{scaled.toLocaleString("zh-CN")}</span>
          <div><i style={{
                height: `${item[metric] / trendMax * 100}%`
              }} /></div>
          <small>{item.label}</small>
        </div>;
        })}</div>
      <p className="auth-help">{t("时段分布按演示比例生成，用于展示分析流程。")}</p>
    </section>}

    {screen === "ranking" && <section className="panel assigned-detail">
      <div className="ranking-tabs">{[["sales", t("净销售额")], ["traffic", t("进店人次")], ["orders", t("支付订单")]].map(([key, label]) => <button className={sort === key ? "on" : ""} key={key} onClick={() => setSort(key)}>{label}</button>)}</div>
      <p className="auth-help">{t("比较本账号授权的")} {granted.length} {t("家店铺。")}</p>
      <div className="scoped-ranking">{ranked.map((shop, index) => <button key={shop.id} onClick={() => openStore(shop)}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div><b>{shop.name}</b><small>{shop.floor} · {t(shop.category)}</small></div>
        <strong>{sort === "sales" ? money(shop.sales) : shop[sort].toLocaleString("zh-CN")}</strong>
      </button>)}</div>
    </section>}

    <Footer />
  </section>;
}