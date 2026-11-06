import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNTS_KEY,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  ROLE_LABELS,
  SESSION_KEY,
  createAuthStore,
  defaultScreenForRole,
  screensForRole,
  shopsForUser,
} from "../src/auth.js";

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
};

const shops = [
  { id: 97, name: "DESCENTE 迪桑特", floor: "1F" },
  { id: 96, name: "始祖鸟 ARC'TERYX", floor: "1F" },
  { id: 62, name: "DESCENTE", floor: "2F" },
];

const makeStore = () => createAuthStore({ storage: memoryStorage(), sessionStore: memoryStorage(), cryptoImpl: globalThis.crypto, shops });

test("初始化时自动创建三个演示账号", async () => {
  const auth = makeStore();
  await auth.initialize();
  const accounts = auth.list();
  assert.equal(accounts.length, 3);
  assert.deepEqual(accounts.map((item) => item.username).sort(), DEMO_ACCOUNTS.map((item) => item.username).sort());
  assert.equal(accounts.find((item) => item.username === "merchant").shopIds[0], 97);
  assert.equal(ROLE_LABELS.admin, "管理员");
  assert.equal(auth.list()[0].passwordHash, undefined);
});

test("登录成功、密码错误与入口校验", async () => {
  const auth = makeStore();
  await auth.initialize();
  const customer = await auth.login("customer", DEMO_PASSWORD, "customer");
  assert.equal(customer.role, "customer");
  assert.equal(auth.current().username, "customer");

  await assert.rejects(() => auth.login("customer", "wrong-password", "customer"), /账号或密码不正确/);
  await assert.rejects(() => auth.login("merchant", DEMO_PASSWORD, "customer"), /该账号不属于此入口/);
  await assert.rejects(() => auth.login("admin", DEMO_PASSWORD, "customer"), /该账号不属于此入口/);

  const merchant = await auth.login("merchant", DEMO_PASSWORD, "business");
  assert.equal(merchant.role, "merchant");
  const admin = await auth.login("admin", DEMO_PASSWORD, "business");
  assert.equal(admin.role, "admin");
});

test("会话可在刷新后恢复，退出登录后失效", async () => {
  const auth = makeStore();
  await auth.initialize();
  await auth.login("customer", DEMO_PASSWORD, "customer");
  assert.ok(auth.current());
  auth.logout();
  assert.equal(auth.current(), null);
});

test("账号被修改后旧会话失效（revision 校验）", async () => {
  const auth = makeStore();
  await auth.initialize();
  await auth.login("customer", DEMO_PASSWORD, "customer");
  const customer = auth.list().find((item) => item.username === "customer");
  await auth.update(customer.id, { ...customer, name: "新顾客昵称" });
  assert.equal(auth.current(), null);
});

test("管理员账号不可在账号管理中修改", async () => {
  const auth = makeStore();
  await auth.initialize();
  const admin = auth.list().find((item) => item.role === "admin");
  await assert.rejects(() => auth.update(admin.id, { ...admin, name: "改名" }), /管理员演示账号不能在这里修改/);
});

test("顾客注册与重复账号校验", async () => {
  const auth = makeStore();
  await auth.initialize();
  const created = await auth.create({ username: "shopper_01", name: "新顾客", password: "password123" }, true);
  assert.equal(created.role, "customer");
  assert.equal(auth.list().length, 4);
  await assert.rejects(() => auth.create({ username: "shopper_01", name: "重复", password: "password123" }, true), /这个账号已存在/);
  await assert.rejects(() => auth.create({ username: "merchant_x", name: "无店铺商户", password: "password123", role: "merchant" }), /至少选择一家店铺/);
  await assert.rejects(() => auth.create({ username: "bad name", name: "非法账号", password: "password123" }, true), /登录账号需为/);
  await assert.rejects(() => auth.create({ username: "short_pwd", name: "短密码", password: "123" }, true), /密码至少需要/);
});

test("角色与界面绑定：商户只看授权店铺、管理员看全部、顾客不涉及", () => {
  const merchant = { role: "merchant", shopIds: [97], enabled: true };
  const admin = { role: "admin", shopIds: [], enabled: true };
  const customer = { role: "customer", shopIds: [], enabled: true };
  assert.deepEqual(shopsForUser(merchant, shops).map((shop) => shop.id), [97]);
  assert.deepEqual(shopsForUser(admin, shops).map((shop) => shop.id), [97, 96, 62]);
  assert.deepEqual(shopsForUser(customer, shops), []);
  assert.deepEqual(shopsForUser({ role: "merchant", shopIds: [97], enabled: false }, shops), []);

  assert.deepEqual(screensForRole("customer"), ["home", "directory", "detail", "navigate", "saved"]);
  assert.ok(screensForRole("merchant").includes("ranking"));
  assert.ok(!screensForRole("merchant").includes("accounts"));
  assert.ok(screensForRole("admin").includes("accounts"));
  assert.equal(defaultScreenForRole("customer"), "home");
  assert.equal(defaultScreenForRole("merchant"), "overview");
});

test("收藏按账号保存在本机存储", async () => {
  const auth = makeStore();
  await auth.initialize();
  const customer = await auth.login("customer", DEMO_PASSWORD, "customer");
  assert.equal(auth.saveFavorites(customer.id, [97, 96]), true);
  assert.deepEqual(auth.loadFavorites(customer.id, [97, 96, 62]), [97, 96]);
  assert.deepEqual(auth.loadFavorites(customer.id, [97]), [97]);
  assert.deepEqual(auth.loadFavorites("other-user", [97]), []);
});

test("账号存储在初始化后写入本机并包含盐与哈希", async () => {
  const storage = memoryStorage();
  const sessionStore = memoryStorage();
  const auth = createAuthStore({ storage, sessionStore, cryptoImpl: globalThis.crypto, shops });
  await auth.initialize();
  const parsed = JSON.parse(storage.getItem(ACCOUNTS_KEY));
  assert.equal(parsed.length, 3);
  assert.ok(parsed.every((item) => typeof item.salt === "string" && item.salt.length === 32));
  assert.ok(parsed.every((item) => /^[0-9a-f]{64}$/.test(item.passwordHash)));
  assert.equal(sessionStore.getItem(SESSION_KEY), null);
});
