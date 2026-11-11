import { t } from "./i18n.js";
import { useEffect, useRef } from "react";
import { ROLE_LABELS } from "./auth.js";
export function ProfileDialog({
  user,
  shops,
  onClose,
  onLogout
}) {
  const closeRef = useRef(null);
  const logoutRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        const next = document.activeElement === closeRef.current ? logoutRef.current : closeRef.current;
        next?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [onClose]);
  const grantedShops = (shops || []).filter(shop => (user.shopIds || []).includes(shop.id));
  return <div className="profile-backdrop" onClick={onClose}>
    <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title" onClick={event => event.stopPropagation()}>
      <button ref={closeRef} id="profile-close" className="profile-close" onClick={onClose} aria-label={t("关闭个人信息")}>×</button>
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h2 id="profile-title">{t(user.name)}</h2>
      <dl>
        <dt>{t("登录账号")}</dt><dd>{user.username}</dd>
        <dt>{t("身份")}</dt><dd>{ROLE_LABELS[user.role]}</dd>
        <dt>{t("邮箱")}</dt><dd>{user.email || t("未填写")}</dd>
        <dt>{t("手机号")}</dt><dd>{user.phone || t("未填写")}</dd>
        {user.role === "merchant" && <><dt>{t("所属店铺")}</dt><dd>{grantedShops.map(shop => shop.name).join("、") || t("未分配")}</dd></>}
      </dl>
      <button ref={logoutRef} id="profile-logout" className="button-dark auth-submit" onClick={onLogout}>{t("退出登录")}</button>
    </section>
  </div>;
}