import { t } from "./i18n.js";

export function LanguageToggle({ lang, onToggle, className = "" }) {
  return <button
    type="button"
    className={`lang-toggle ${className}`.trim()}
    onClick={onToggle}
    aria-label={lang === "zh" ? "Switch to English" : "切换到中文"}
    title={lang === "zh" ? "Switch to English" : "切换到中文"}
  >
    <span className={lang === "zh" ? "is-active" : ""}>中文</span>
    <span className="lang-sep">/</span>
    <span className={lang === "en" ? "is-active" : ""}>EN</span>
  </button>;
}
