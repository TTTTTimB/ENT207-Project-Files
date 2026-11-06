// 本机演示账号体系：账号保存在 localStorage，会话保存在 sessionStorage。
// 密码使用 PBKDF2-SHA256（60 万次迭代）加盐哈希存储，与登录演示版保持一致。
// 该模块同时需要能在 Node 测试环境中运行，因此不直接依赖 window。

export const ACCOUNTS_KEY = "superbrand.login-demo.accounts.v1";
export const SESSION_KEY = "superbrand.login-demo.session.v1";
export const DEMO_PASSWORD = "MallDemo2026";
export const SESSION_TTL_MINUTES = 480;
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_ITERATIONS = 600000;

export const ROLE_LABELS = { customer: "顾客", merchant: "商户", admin: "管理员" };
export const CREATABLE_ROLES = ["customer", "merchant"];

export const SCREENS_BY_ROLE = {
  customer: ["home", "directory", "detail", "navigate", "saved"],
  merchant: ["overview", "store-analytics", "trends", "ranking"],
  admin: ["overview", "store-analytics", "trends", "ranking", "accounts"],
};

export const DEMO_ACCOUNTS = [
  { username: "customer", name: "顾客体验账号", role: "customer", shopIds: [] },
  { username: "merchant", name: "迪桑特店员", role: "merchant", shopIds: [97] },
  { username: "admin", name: "商场管理员", role: "admin", shopIds: [] },
];

export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

export function roleLabel(role) {
  return ROLE_LABELS[role] || "";
}

export function screensForRole(role) {
  return SCREENS_BY_ROLE[role] ? [...SCREENS_BY_ROLE[role]] : [];
}

export function defaultScreenForRole(role) {
  return role === "customer" ? "home" : "overview";
}

// 角色可见的店铺：管理员看全部，商户只看被分配的店铺，顾客不涉及经营数据。
export function shopsForUser(user, allShops) {
  if (!user || !user.enabled) return [];
  if (user.role === "admin") return [...allShops];
  if (user.role === "merchant") return allShops.filter((shop) => (user.shopIds || []).includes(shop.id));
  return [];
}

export function favoritesKey(userId) {
  return `superbrand.favorites.${userId}`;
}

const bytesToHex = (bytes) => [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex) => {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2 !== 0) throw new Error("账号密码数据格式不正确。");
  return new Uint8Array(hex.match(/.{2}/g).map((value) => parseInt(value, 16)));
};

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

function resolveStorage(candidate) {
  try {
    if (candidate && typeof candidate.getItem === "function") {
      const probe = "__superbrand_probe__";
      candidate.setItem(probe, "1");
      candidate.removeItem(probe);
      return candidate;
    }
  } catch {
    // 隐私模式或 file:// 下 localStorage 可能不可用，降级为内存存储
  }
  return memoryStorage();
}

function randomId(cryptoImpl) {
  if (cryptoImpl?.randomUUID) return cryptoImpl.randomUUID();
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function randomSalt(cryptoImpl) {
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function deriveHash(password, saltHex, cryptoImpl) {
  if (!cryptoImpl?.subtle) {
    throw new Error("当前环境不支持密码校验，请通过 HTTPS、本机 localhost 或双击便携 HTML 打开。");
  }
  const key = await cryptoImpl.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await cryptoImpl.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations: PASSWORD_ITERATIONS },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function sanitize(account) {
  if (!account) return null;
  return {
    id: account.id,
    username: account.username,
    name: account.name,
    role: account.role,
    shopIds: [...(account.shopIds || [])],
    email: account.email || "",
    phone: account.phone || "",
    enabled: account.enabled !== false,
    revision: account.revision,
    createdAt: account.createdAt,
  };
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`密码至少需要 ${MIN_PASSWORD_LENGTH} 个字符。`);
  }
}

export function createAuthStore({ storage, sessionStore, cryptoImpl, shops = [] } = {}) {
  const accountStorage = resolveStorage(storage);
  const sessionStorage = resolveStorage(sessionStore);
  const cryptoApi = cryptoImpl || (typeof globalThis !== "undefined" ? globalThis.crypto : undefined);
  const knownShopIds = new Set((shops || []).map((shop) => shop.id));
  const knownShopIdList = [...knownShopIds];

  function readAccounts() {
    const raw = accountStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("本机账号数据无法读取，请保留数据并联系演示负责人。");
    }
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => !item.id || !ROLE_LABELS[item.role] || !Array.isArray(item.shopIds) || typeof item.salt !== "string" || typeof item.passwordHash !== "string")
    ) {
      throw new Error("本机账号数据格式不正确。");
    }
    return parsed;
  }

  function writeAccounts(accounts) {
    try {
      accountStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch {
      throw new Error("浏览器无法保存账号，请允许本地存储或换用普通浏览窗口。");
    }
  }

  async function initialize() {
    const existing = readAccounts();
    if (existing.length > 0) return { created: false, accounts: existing.map(sanitize) };
    const seeded = [];
    for (const seed of DEMO_ACCOUNTS) {
      const salt = randomSalt(cryptoApi);
      seeded.push({
        id: randomId(cryptoApi),
        username: seed.username,
        name: seed.name,
        role: seed.role,
        shopIds: [...seed.shopIds],
        email: "",
        phone: "",
        enabled: true,
        revision: 1,
        createdAt: new Date().toISOString(),
        salt,
        passwordHash: await deriveHash(DEMO_PASSWORD, salt, cryptoApi),
      });
    }
    writeAccounts(seeded);
    return { created: true, accounts: seeded.map(sanitize) };
  }

  function readSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.id || !Number.isFinite(parsed.expiresAt)) return null;
      if (parsed.expiresAt < Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function current() {
    const session = readSession();
    if (!session) return null;
    const account = readAccounts().find((item) => item.id === session.id);
    if (!account || !account.enabled || account.revision !== session.revision) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return sanitize(account);
  }

  async function login(username, password, entry) {
    const normalized = normalizeUsername(username);
    if (!normalized || !password) throw new Error("请输入登录账号和密码。");
    const accounts = readAccounts();
    const account = accounts.find((item) => item.username.toLowerCase() === normalized.toLowerCase());
    if (!account) throw new Error("账号或密码不正确。");
    const digest = await deriveHash(password, account.salt, cryptoApi);
    if (digest !== account.passwordHash) throw new Error("账号或密码不正确。");
    if (!account.enabled) throw new Error("该账号已停用，请联系管理员。");
    const isCustomer = account.role === "customer";
    if (entry === "customer" && !isCustomer) throw new Error("该账号不属于此入口，请选择正确的登录入口。");
    if (entry === "business" && isCustomer) throw new Error("该账号不属于此入口，请选择正确的登录入口。");
    const fresh = readAccounts().find((item) => item.id === account.id);
    if (!fresh || !fresh.enabled || fresh.revision !== account.revision) throw new Error("账号信息已更新，请重新登录。");
    const session = { id: account.id, revision: account.revision, expiresAt: Date.now() + SESSION_TTL_MINUTES * 60 * 1000 };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      throw new Error("浏览器无法保存登录状态，请允许会话存储。");
    }
    return sanitize(account);
  }

  async function create(profile, registerCustomer = false) {
    const role = registerCustomer ? "customer" : profile.role;
    if (!CREATABLE_ROLES.includes(role)) throw new Error("这里只能创建顾客或商户账号。");
    const username = normalizeUsername(profile.username);
    if (!USERNAME_PATTERN.test(username)) throw new Error("登录账号需为 3–32 位英文字母、数字、点、横线或下划线。");
    const name = String(profile.name || "").trim();
    if (!name) throw new Error("请填写姓名或昵称。");
    assertPassword(profile.password);
    const shopIds = role === "merchant" ? [...new Set((profile.shopIds || []).filter((id) => knownShopIds.size === 0 || knownShopIds.has(id)))] : [];
    if (role === "merchant" && shopIds.length === 0) throw new Error("商户账号需至少选择一家店铺。");
    const accounts = readAccounts();
    if (accounts.some((item) => item.username.toLowerCase() === username.toLowerCase())) throw new Error("这个账号已存在，请更换。");
    const salt = randomSalt(cryptoApi);
    const account = {
      id: randomId(cryptoApi),
      username,
      name,
      role,
      shopIds,
      email: String(profile.email || "").trim(),
      phone: String(profile.phone || "").trim(),
      enabled: true,
      revision: 1,
      createdAt: new Date().toISOString(),
      salt,
      passwordHash: await deriveHash(profile.password, salt, cryptoApi),
    };
    writeAccounts([...accounts, account]);
    return sanitize(account);
  }

  async function update(id, profile) {
    const accounts = readAccounts();
    const existing = accounts.find((item) => item.id === id);
    if (!existing) throw new Error("账号不存在，请刷新后重试。");
    if (existing.role === "admin") throw new Error("管理员演示账号不能在这里修改。");
    const role = profile.role;
    if (!CREATABLE_ROLES.includes(role)) throw new Error("角色不正确。");
    const name = String(profile.name || "").trim();
    if (!name) throw new Error("请填写姓名或昵称。");
    if (profile.password) assertPassword(profile.password);
    const shopIds = role === "merchant" ? [...new Set((profile.shopIds || []).filter((shopId) => knownShopIds.size === 0 || knownShopIds.has(shopId)))] : [];
    if (role === "merchant" && shopIds.length === 0) throw new Error("商户账号需至少选择一家店铺。");
    const passwordFields = profile.password
      ? await (async () => {
          const salt = randomSalt(cryptoApi);
          return { salt, passwordHash: await deriveHash(profile.password, salt, cryptoApi) };
        })()
      : {};
    const fresh = readAccounts().find((item) => item.id === id);
    if (!fresh || fresh.revision !== existing.revision) throw new Error("该账号刚被更新，请刷新后再试。");
    const next = {
      ...fresh,
      name,
      role,
      shopIds,
      email: String(profile.email || "").trim(),
      phone: String(profile.phone || "").trim(),
      enabled: profile.enabled !== false,
      revision: fresh.revision + 1,
      ...passwordFields,
    };
    writeAccounts(accounts.map((item) => (item.id === id ? next : item)));
    return sanitize(next);
  }

  function list() {
    return readAccounts().map(sanitize);
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // 忽略：会话存储不可用时无需清理
    }
  }

  function loadFavorites(userId, validIds = []) {
    if (!userId) return [];
    try {
      const raw = accountStorage.getItem(favoritesKey(userId));
      const parsed = raw ? JSON.parse(raw) : [];
      const allowed = new Set(validIds.length ? validIds : knownShopIdList);
      return Array.isArray(parsed) ? parsed.filter((id) => allowed.has(id)) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(userId, ids) {
    if (!userId) return false;
    try {
      accountStorage.setItem(favoritesKey(userId), JSON.stringify(ids));
      return true;
    } catch {
      return false;
    }
  }

  return {
    initialize,
    current,
    login,
    create,
    update,
    list,
    logout,
    loadFavorites,
    saveFavorites,
    knownShopIds: knownShopIdList,
  };
}

let cachedAuth = null;
let cachedShopSignature = "";

// 浏览器单例：账号数据存 localStorage，会话存 sessionStorage（刷新保持、关闭标签页失效）
export function getAuth(shops = []) {
  const signature = shops.map((shop) => shop.id).join(",");
  if (cachedAuth && cachedShopSignature === signature) return cachedAuth;
  cachedAuth = createAuthStore({
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    sessionStore: typeof window !== "undefined" ? window.sessionStorage : undefined,
    cryptoImpl: typeof globalThis !== "undefined" ? globalThis.crypto : undefined,
    shops,
  });
  cachedShopSignature = signature;
  return cachedAuth;
}
