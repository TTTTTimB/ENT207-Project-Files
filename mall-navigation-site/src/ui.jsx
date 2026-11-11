import { useEffect, useRef } from "react";
import { t } from "./i18n.js";
import { Icon } from "./icons.jsx";
export function SideButton({
  icon,
  children,
  active,
  onClick
}) {
  return <button className={`side-button ${active ? "selected" : ""}`} onClick={onClick}><Icon name={icon} /><span>{children}</span>{active && <i className="nav-indicator" />}</button>;
}
export function MobileNav({
  items,
  current,
  onSelect
}) {
  return <nav className="mobile-nav-bar" aria-label={t("页面导航")}>{items.map(([screen, label, icon]) => <button key={screen} className={current === screen ? "current" : ""} onClick={() => onSelect(screen)}><Icon name={icon} size={16} /><span>{label}</span></button>)}</nav>;
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action
}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}
export function FloorPills({
  value,
  setValue,
  codes
}) {
  const items = codes ? codes.map(code => ({
    code
  })) : null;
  const pills = items || [{
    code: "B1"
  }, {
    code: "1F"
  }, {
    code: "2F"
  }, {
    code: "3F"
  }, {
    code: "4F"
  }, {
    code: "5F"
  }, {
    code: "7F"
  }];
  const listRef = useRef(null);
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector("button.current");
    if (!active || container.scrollWidth <= container.clientWidth + 1) return;
    const activeRect = active.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const target = container.scrollLeft + (activeRect.left - containerRect.left) - (container.clientWidth - active.clientWidth) / 2;
    container.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth"
    });
  }, [value]);
  return <div ref={listRef} className="floor-pills" role="tablist" aria-label={t("选择楼层")}>{pills.map(f => <button key={f.code} role="tab" aria-selected={value === f.code} className={value === f.code ? "current" : ""} onClick={() => setValue(f.code)}>{f.code}</button>)}</div>;
}
export function SearchBox({
  query,
  setQuery,
  placeholder = "搜索店铺或品牌"
}) {
  return <label className="search-box"><Icon name="search" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder || t("搜索店铺或品牌")} />{query && <button aria-label={t("清除搜索")} onClick={() => setQuery("")}>×</button>}</label>;
}
export function EmptyState({
  title,
  text,
  action
}) {
  return <div className="empty-state"><span>✳</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
export function Footer() {
  return <footer className="site-footer"><span>SUPER BRAND MALL</span><span>{t("上海正大广场\u3000·\u3000以体验为中心的商业空间")}</span><span>© 2026</span></footer>;
}