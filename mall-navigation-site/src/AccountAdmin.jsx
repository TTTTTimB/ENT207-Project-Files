import { useMemo, useState } from "react";
import { ROLE_LABELS, CREATABLE_ROLES, MIN_PASSWORD_LENGTH } from "./auth.js";
import { PageHeading, Footer } from "./ui.jsx";

const emptyForm = { username: "", name: "", role: "customer", email: "", phone: "", password: "", shopIds: [], enabled: true };

function AuthField({ label, children }) {
  return <label className="auth-field"><span>{label}</span>{children}</label>;
}

export function AccountAdmin({ auth, shops }) {
  const [accounts, setAccounts] = useState(() => auth.list());
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const refresh = () => setAccounts(auth.list());
  const filtered = useMemo(() => accounts.filter((account) => `${account.name} ${account.username} ${account.email} ${account.phone}`.toLowerCase().includes(search.toLowerCase())), [accounts, search]);

  function resetForm() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  function startEdit(account) {
    setEditing(account);
    setForm({ username: account.username, name: account.name, role: account.role, email: account.email || "", phone: account.phone || "", password: "", shopIds: [...account.shopIds], enabled: account.enabled });
    setError("");
    setMessage("");
  }

  function switchRole(role) {
    setForm((current) => ({ ...current, role, shopIds: [] }));
  }

  function toggleShop(shopId) {
    setForm((current) => ({ ...current, shopIds: current.shopIds.includes(shopId) ? current.shopIds.filter((id) => id !== shopId) : [...current.shopIds, shopId] }));
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
        enabled: form.enabled,
      };
      const saved = editing ? await auth.update(editing.id, payload) : await auth.create(payload);
      refresh();
      setMessage(`${saved.name}的账号已${editing ? "更新" : "创建"}。`);
      resetForm();
    } catch (failure) {
      setError(failure.message || "保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return <section className="account-page">
    <PageHeading eyebrow="PEOPLE & ACCESS" title="账号管理" subtitle="录入登录人员，分配角色和店铺权限。" action={<span className="demo-tag">{accounts.length} 个本机账号</span>}/>
    <div className="sim-banner">本机演示账号 · 修改资料、权限或密码后，该人员需要重新登录。</div>
    {message && <p className="auth-success" role="status">{message}</p>}
    <div className="account-layout">
      <section className="account-editor panel" id="account-editor">
        <h2>{editing ? "编辑账号" : "录入新人员"}</h2>
        <form className="auth-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <AuthField label="登录账号">
              <input value={form.username} onChange={update("username")} required minLength={3} maxLength={32} disabled={Boolean(editing)} autoComplete="off" placeholder="如 staff_01"/>
            </AuthField>
            <AuthField label="姓名 / 昵称"><input value={form.name} onChange={update("name")} required maxLength={40}/></AuthField>
            <AuthField label="角色">
              <select value={form.role} onChange={(event) => switchRole(event.target.value)}>
                {CREATABLE_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
              </select>
            </AuthField>
            <AuthField label="邮箱（选填）"><input type="email" value={form.email} onChange={update("email")} maxLength={120}/></AuthField>
            <AuthField label="手机号（选填）"><input type="tel" value={form.phone} onChange={update("phone")} maxLength={30}/></AuthField>
            <AuthField label={editing ? "新密码（留空则不修改）" : "初始密码"}>
              <input type="password" value={form.password} onChange={update("password")} required={!editing} minLength={MIN_PASSWORD_LENGTH} maxLength={128} autoComplete="new-password" placeholder={`至少 ${MIN_PASSWORD_LENGTH} 个字符`}/>
            </AuthField>
            {form.role === "merchant" && <fieldset className="shop-assignment">
              <legend>所属店铺（至少选择一家）</legend>
              {shops.map((shop) => <label key={shop.id}>
                <input type="checkbox" checked={form.shopIds.includes(shop.id)} onChange={() => toggleShop(shop.id)}/>
                <span>{shop.floor} · {shop.name}</span>
              </label>)}
            </fieldset>}
            {editing && <AuthField label="账号状态">
              <select value={form.enabled ? "enabled" : "disabled"} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.value === "enabled" }))}>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </AuthField>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <div className="account-actions">
              <button className="button-dark" type="submit">{busy ? "保存中…" : editing ? "保存修改" : "创建账号"}</button>
              {editing && <button type="button" className="button-outline" onClick={resetForm}>取消编辑</button>}
            </div>
          </fieldset>
        </form>
      </section>
      <section className="account-list">
        <AuthField label="搜索人员"><input type="search" placeholder="姓名、账号、邮箱或手机号" value={search} onChange={(event) => setSearch(event.target.value)}/></AuthField>
        {filtered.map((account) => <article className="person-card" key={account.id}>
          <div className="person-title">
            <span className="avatar">{account.name.slice(0, 1)}</span>
            <div><h3>{account.name}</h3><code>{account.username}</code></div>
            <span className={`person-state ${account.enabled ? "" : "disabled"}`}>{account.enabled ? "启用" : "停用"}</span>
          </div>
          <p>{ROLE_LABELS[account.role]}{account.role === "merchant" && ` · ${account.shopIds.length} 家店铺`}</p>
          {account.email && <p>邮箱：{account.email}</p>}
          {account.phone && <p>电话：{account.phone}</p>}
          {account.role === "merchant" && <p>{shops.filter((shop) => account.shopIds.includes(shop.id)).map((shop) => `${shop.floor} ${shop.name}`).join("、") || "未分配店铺"}</p>}
          {account.role !== "admin"
            ? <button type="button" className="button-outline" disabled={busy} aria-label={`编辑 ${account.username}`} onClick={() => startEdit(account)}>编辑资料 / 权限</button>
            : <small>内置演示管理员</small>}
        </article>)}
        {!filtered.length && <p className="auth-help">没有找到匹配的账号。</p>}
      </section>
    </div>
    <Footer/>
  </section>;
}
