import { t } from "./i18n.js";
import { useState } from "react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABELS } from "./auth.js";
import { LanguageToggle } from "./LanguageToggle.jsx";
const emptyForm = {
  username: "",
  password: "",
  name: "",
  email: "",
  phone: "",
  confirm: ""
};
function AuthField({
  label,
  children
}) {
  return <label className="auth-field"><span>{label}</span>{children}</label>;
}
export function LoginScreen({
  auth,
  initialError = "",
  onLogin,
  lang = "zh",
  onToggleLang
}) {
  const [entry, setEntry] = useState("customer");
  const [register, setRegister] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const update = key => event => setForm(current => ({
    ...current,
    [key]: event.target.value
  }));
  function switchEntry(nextEntry) {
    setEntry(nextEntry);
    setRegister(false);
    setError("");
    setForm(emptyForm);
  }
  function fillDemoAccount(seed) {
    setEntry(seed.role === "customer" ? "customer" : "business");
    setRegister(false);
    setError("");
    setForm({
      ...emptyForm,
      username: seed.username,
      password: DEMO_PASSWORD
    });
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (register) {
        if (form.password !== form.confirm) throw new Error("两次输入的密码不一致。");
        await auth.create({
          username: form.username,
          name: form.name,
          password: form.password,
          email: form.email,
          phone: form.phone
        }, true);
      }
      const user = await auth.login(form.username, form.password, entry);
      onLogin(user);
    } catch (failure) {
      setError(failure.message || "登录失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return <main className="auth-page">
    <LanguageToggle lang={lang} onToggle={onToggleLang} className="auth-lang" />
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark">S</span><div><b>SUPER BRAND MALL</b><small>{t("上海正大广场 · 智能导览")}</small></div></div>
      <div className="auth-story-main">
        <span className="eyebrow">A PLACE TO FIND YOUR WAY</span>
        <h1>{t("每一次抵达，")}<br /><em>{t("都有新发现。")}</em></h1>
        <p>{t("用一个账号，开启属于你的商场体验。")}</p>
        <div className="auth-orbits" aria-hidden="true"><span>S</span></div>
        <div className="auth-promises"><span>{t("01 发现品牌与空间")}</span><span>{t("02 找到想去的地方")}</span><span>{t("03 了解店铺经营")}</span></div>
      </div>
      <small className="auth-story-foot">LUJIAZUI · SHANGHAI</small>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <span className="auth-demo-label">{t("本机演示版")}</span>
        <h2>{register ? t("创建顾客账号") : t("欢迎来到正大广场")}</h2>
        <p className="auth-subtitle">{register ? t("收藏喜欢的店铺，开始探索。") : t("登录后进入与你的身份对应的页面。")}</p>
        <div className="auth-tabs" aria-label={t("登录入口")}>
          <button type="button" disabled={busy} aria-pressed={entry === "customer"} onClick={() => switchEntry("customer")}>{t("顾客登录")}</button>
          <button type="button" disabled={busy} aria-pressed={entry === "business"} onClick={() => switchEntry("business")}>{t("商户 / 管理员登录")}</button>
        </div>
        {initialError && <p className="auth-error" role="alert">{t(initialError)}</p>}
        <form className="auth-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            {register && <AuthField label={t("姓名 / 昵称")}><input value={form.name} onChange={update("name")} maxLength={40} required autoComplete="nickname" placeholder={t("你希望我们如何称呼你")} /></AuthField>}
            <AuthField label={t("登录账号")}>
              <input value={form.username} onChange={update("username")} required minLength={3} maxLength={32} pattern="[A-Za-z0-9_.\-]{3,32}" autoCapitalize="none" autoCorrect="off" autoComplete="username" placeholder={t("英文字母、数字、点、横线或下划线")} />
            </AuthField>
            <AuthField label={t("密码")}>
              <div className="auth-password">
                <input value={form.password} onChange={update("password")} type={showPassword ? "text" : "password"} required minLength={register ? 8 : undefined} maxLength={128} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? t("至少 8 个字符") : t("请输入密码")} />
                <button type="button" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? t("隐藏密码") : t("显示密码")}>{showPassword ? t("隐藏") : t("显示")}</button>
              </div>
            </AuthField>
            {register && <>
              <AuthField label={t("确认密码")}><input type="password" value={form.confirm} onChange={update("confirm")} required autoComplete="new-password" /></AuthField>
              <AuthField label={t("邮箱（选填）")}><input type="email" value={form.email} onChange={update("email")} maxLength={120} autoComplete="email" /></AuthField>
              <AuthField label={t("手机号（选填）")}><input type="tel" value={form.phone} onChange={update("phone")} maxLength={30} autoComplete="tel" /></AuthField>
            </>}
            {error && <p className="auth-error" role="alert">{t(error)}</p>}
            <button type="submit" className="button-dark auth-submit">{busy ? t("正在处理…") : register ? t("注册并进入顾客端") : entry === "customer" ? t("登录顾客端 →") : t("登录经营工作台 →")}</button>
          </fieldset>
        </form>
        {entry === "customer" ? <button type="button" disabled={busy} className="auth-text-button" onClick={() => {
          setRegister(value => !value);
          setError("");
        }}>{register ? t("已有账号？返回登录") : t("还没有账号？注册顾客账号")}</button> : <p className="auth-help">{t("商户账号由管理员录入，并分配可查看的店铺。")}</p>}
        {!register && <details className="auth-demo">
          <summary>{t("试用演示账号")}</summary>
          <p>{t("以下账号的初始密码均为")} <code>{DEMO_PASSWORD}</code></p>
          <div>{DEMO_ACCOUNTS.map(seed => <button type="button" key={seed.username} disabled={busy} onClick={() => fillDemoAccount(seed)}>
            {t(ROLE_LABELS[seed.role])} <code>{seed.username}</code><small>{t("填入账号")}</small>
          </button>)}</div>
        </details>}
        <p className="auth-local-note">{t("账号仅保存在当前浏览器，不会同步到其他设备。请使用演示信息；此版本不用于保护真实经营数据。")}</p>
      </div>
    </section>
  </main>;
}