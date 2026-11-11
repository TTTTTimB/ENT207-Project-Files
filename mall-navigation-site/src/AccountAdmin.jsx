import { t } from "./i18n.js";
import { useMemo, useState } from "react";
import { ROLE_LABELS, CREATABLE_ROLES, MIN_PASSWORD_LENGTH } from "./auth.js";
import { PageHeading, Footer } from "./ui.jsx";
const emptyForm = {
  username: "",
  name: "",
  role: "customer",
  email: "",
  phone: "",
  password: "",
  shopIds: [],
  enabled: true
};
function AuthField({
  label,
  children
}) {
  return <label className="auth-field"><span>{label}</span>{children}</label>;
}
export function AccountAdmin({
  auth,
  shops
}) {
  const [accounts, setAccounts] = useState(() => auth.list());
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = key => event => setForm(current => ({
    ...current,
    [key]: event.target.value
  }));
  const refresh = () => setAccounts(auth.list());
  const filtered = useMemo(() => accounts.filter(account => `${account.name} ${account.username} ${account.email} ${account.phone}`.toLowerCase().includes(search.toLowerCase())), [accounts, search]);
  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }
  function startEdit(account) {
    setEditing(account);
    setForm({
      username: account.username,
      name: account.name,
      role: account.role,
      email: account.email || "",
      phone: account.phone || "",
      password: "",
      shopIds: [...account.shopIds],
      enabled: account.enabled
    });
    setError("");
    setMessage("");
  }
  function switchRole(role) {
    setForm(current => ({
      ...current,
      role,
      shopIds: []
    }));
  }
  function toggleShop(shopId) {
    setForm(current => ({
      ...current,
      shopIds: current.shopIds.includes(shopId) ? current.shopIds.filter(id => id !== shopId) : [...current.shopIds, shopId]
    }));
  }
  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const payload = {
        username: form.username,
        name: form.name,
        role: form.role,
        email: form.email,
        phone: form.phone,
        password: form.password,
        shopIds: form.shopIds,
        enabled: form.enabled
      };
      const saved = editing ? await auth.update(editing.id, payload) : await auth.create(payload);
      refresh();
      setMessage(t("{v1}的账号已{v2}。", { v1: saved.name, v2: editing ? t("更新") : t("创建") }));
      resetForm();
    } catch (failure) {
      setError(failure.message || "保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return <section className="account-page">
    <PageHeading eyebrow="PEOPLE & ACCESS" title={t("账号管理")} subtitle={t("录入登录人员，分配角色和店铺权限。")} action={<span className="demo-tag">{accounts.length} {t("个本机账号")}</span>} />
    <div className="sim-banner">{t("本机演示账号 · 修改资料、权限或密码后，该人员需要重新登录。")}</div>
    {message && <p className="auth-success" role="status">{message}</p>}
    <div className="account-layout">
      <section className="account-editor panel" id="account-editor">
        <h2>{editing ? t("编辑账号") : t("录入新人员")}</h2>
        <form className="auth-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <AuthField label={t("登录账号")}>
              <input value={form.username} onChange={update("username")} required minLength={3} maxLength={32} disabled={Boolean(editing)} autoComplete="off" placeholder={t("如 staff_01")} />
            </AuthField>
            <AuthField label={t("姓名 / 昵称")}><input value={form.name} onChange={update("name")} required maxLength={40} /></AuthField>
            <AuthField label={t("角色")}>
              <select value={form.role} onChange={event => switchRole(event.target.value)}>
                {CREATABLE_ROLES.map(role => <option key={role} value={role}>{t(ROLE_LABELS[role])}</option>)}
              </select>
            </AuthField>
            <AuthField label={t("邮箱（选填）")}><input type="email" value={form.email} onChange={update("email")} maxLength={120} /></AuthField>
            <AuthField label={t("手机号（选填）")}><input type="tel" value={form.phone} onChange={update("phone")} maxLength={30} /></AuthField>
            <AuthField label={editing ? t("新密码（留空则不修改）") : t("初始密码")}>
              <input type="password" value={form.password} onChange={update("password")} required={!editing} minLength={MIN_PASSWORD_LENGTH} maxLength={128} autoComplete="new-password" placeholder={t("至少 {v1} 个字符", {
                v1: MIN_PASSWORD_LENGTH
              })} />
            </AuthField>
            {form.role === "merchant" && <fieldset className="shop-assignment">
              <legend>{t("所属店铺（至少选择一家）")}</legend>
              {shops.map(shop => <label key={shop.id}>
                <input type="checkbox" checked={form.shopIds.includes(shop.id)} onChange={() => toggleShop(shop.id)} />
                <span>{shop.floor} · {shop.name}</span>
              </label>)}
            </fieldset>}
            {editing && <AuthField label={t("账号状态")}>
              <select value={form.enabled ? "enabled" : "disabled"} onChange={event => setForm(current => ({
                ...current,
                enabled: event.target.value === "enabled"
              }))}>
                <option value="enabled">{t("启用")}</option>
                <option value="disabled">{t("停用")}</option>
              </select>
            </AuthField>}
            {error && <p className="auth-error" role="alert">{t(error)}</p>}
            <div className="account-actions">
              <button className="button-dark" type="submit">{busy ? t("保存中…") : editing ? t("保存修改") : t("创建账号")}</button>
              {editing && <button type="button" className="button-outline" onClick={resetForm}>{t("取消编辑")}</button>}
            </div>
          </fieldset>
        </form>
      </section>
      <section className="account-list">
        <AuthField label={t("搜索人员")}><input type="search" placeholder={t("姓名、账号、邮箱或手机号")} value={search} onChange={event => setSearch(event.target.value)} /></AuthField>
        {filtered.map(account => <article className="person-card" key={account.id}>
          <div className="person-title">
            <span className="avatar">{t(account.name).slice(0, 1)}</span>
            <div><h3>{t(account.name)}</h3><code>{account.username}</code></div>
            <span className={`person-state ${account.enabled ? "" : "disabled"}`}>{account.enabled ? t("启用") : t("停用")}</span>
          </div>
          <p>{t(ROLE_LABELS[account.role])}{account.role === "merchant" && t(" · {v1} 家店铺", {
              v1: account.shopIds.length
            })}</p>
          {account.email && <p>{t("邮箱：")}{account.email}</p>}
          {account.phone && <p>{t("电话：")}{account.phone}</p>}
          {account.role === "merchant" && <p>{shops.filter(shop => account.shopIds.includes(shop.id)).map(shop => `${shop.floor} ${shop.name}`).join("、") || t("未分配店铺")}</p>}
          {account.role !== "admin" ? <button type="button" className="button-outline" disabled={busy} aria-label={t("编辑 {v1}", {
            v1: account.username
          })} onClick={() => startEdit(account)}>{t("编辑资料 / 权限")}</button> : <small>{t("内置演示管理员")}</small>}
        </article>)}
        {!filtered.length && <p className="auth-help">{t("没有找到匹配的账号。")}</p>}
      </section>
    </div>
    <Footer />
  </section>;
}