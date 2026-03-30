const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8081);
const FRONTEND_URL = String(process.env.FRONTEND_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const DB_PATH = path.join(__dirname, 'db.json');
const START_TIME = Date.now();
const RATE_LIMIT = new Map();
const DELIVERY_PARTNERS = ['Delhivery', 'Blue Dart', 'DTDC'];
const DEFAULT_ALLOWED_ORIGINS = [
  'http://127.0.0.1:8080',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://www.piplanisprint.com',
  'https://piplanisprint.com',
  'https://api.piplanisprint.com'
];
const ENV_ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS, 'null', '']);

const categories = [
  { id: 'phone-electronics', name: 'Phone and Electronics Accessories', subcategories: ['Phone Cases', 'Chargers', 'Skins', 'Earbud Covers'] },
  { id: 'corporate-office', name: 'Corporate and Office Products', subcategories: ['Notebooks', 'Planners', 'Mugs', 'Desk Sets'] },
  { id: 'home-decor', name: 'Home Decor', subcategories: ['Photo Frames', 'Wall Art', 'Cushions', 'Lighting'] },
  { id: 'kitchen', name: 'Kitchen Products', subcategories: ['Bottle', 'Jars', 'Coasters', 'Aprons'] },
  { id: 'fashion', name: 'Fashion Accessories', subcategories: ['Totes', 'Wallets', 'Caps', 'Scarves'] },
  { id: 'car-bike', name: 'Car and Bike Accessories', subcategories: ['Car Tags', 'Seat Covers', 'Helmet Skins', 'Keychains'] },
  { id: 'religious', name: 'Religious Products', subcategories: ['Pooja Kits', 'Plaques', 'Idol Bases', 'Prayer Cards'] },
  { id: 'kids', name: 'Kids Products', subcategories: ['School Kits', 'Sippers', 'Name Stickers', 'Puzzles'] },
  { id: 'promotional', name: 'Promotional Products', subcategories: ['Pens', 'Lanyards', 'Badges', 'Gift Kits'] },
  { id: 'industrial', name: 'Industrial Printing Products', subcategories: ['Labels', 'Safety Signs', 'Panels', 'Barcode Tags'] },
  { id: 'festival', name: 'Festival Products', subcategories: ['Diwali Gifts', 'Rakhi Hampers', 'Christmas Decor', 'New Year Kits'] },
  { id: 'luxury', name: 'Luxury and Premium Products', subcategories: ['Leather Sets', 'Metal Cards', 'Premium Boxes', 'Executive Gifts'] }
];

const materials = ['Acrylic', 'Wood', 'Metal', 'Fabric', 'Ceramic', 'Leather', 'Glass', 'PVC'];
const deliverySpeeds = ['Standard', 'Express', 'Priority'];
const customizationTypes = ['ready', 'name', 'photo', 'logo'];

function buildProducts(targetCount = 240) {
  const list = [];
  let globalIndex = 0;

  while (list.length < targetCount) {
    for (const category of categories) {
      if (list.length >= targetCount) break;
      const idx = Math.floor(list.length / categories.length) + 1;
      const sub = category.subcategories[(idx - 1) % category.subcategories.length];
      list.push({
        id: `PPL-${String(globalIndex + 1).padStart(4, '0')}`,
        title: sub,
        categoryId: category.id,
        category: category.name,
        subcategory: sub,
        description: 'Premium printable product with durable finish and customization support.',
        basePrice: 199 + (globalIndex % 10) * 120 + idx * 12,
        priceMax: 699 + (globalIndex % 10) * 120 + idx * 12,
        material: materials[(globalIndex + 2) % materials.length],
        deliverySpeed: deliverySpeeds[globalIndex % deliverySpeeds.length],
        customizationType: customizationTypes[globalIndex % customizationTypes.length],
        rating: Number((3.8 + (globalIndex % 12) * 0.1).toFixed(1)),
        reviews: 8 + (globalIndex % 180),
        popularity: 1500 - globalIndex * 4,
        isBestSeller: globalIndex % 7 === 0,
        isFeatured: globalIndex % 5 === 0,
        discountType: 'none',
        discountValue: 0,
        discountActive: false,
        customBasePrice: 0,
        customizationDimensions: { width: 1200, height: 800 },
        stockQty: 50,
        createdAt: new Date(Date.now() - globalIndex * 86400000).toISOString()
      });
      globalIndex += 1;
    }
  }

  return list;
}

const seedProducts = buildProducts(240);

const defaults = {
  users: [
    {
      id: 'USR-1001',
      name: 'Guest Customer',
      email: 'customer@piplaniprintlab.com',
      phone: '+91-99999-99999',
      password: 'demo123',
      rewards: 0,
      wishlist: [],
      savedDesigns: [],
      addresses: [],
      paymentMethods: ['UPI', 'Credit Card']
    }
  ],
  sessions: [],
  orders: [],
  coupons: [
    { code: 'WELCOME10', type: 'percent', value: 10, minOrder: 1000, active: true },
    { code: 'BULK500', type: 'flat', value: 500, minOrder: 5000, active: true }
  ],
  reviews: [],
  notifications: [],
  corporateRequests: [],
  customizationRequests: [],
  promoSlides: [],
  reservations: [],
  otpSessions: [],
  emailQueue: [],
  smsQueue: [],
  pushQueue: [],
  logs: {
    error: [],
    login: [],
    order: [],
    security: [],
    system: []
  },
  csrfSecret: `csrf_${Math.random().toString(36).slice(2)}_${Date.now()}`,
  products: seedProducts
};

function ensureDbShape(db) {
  return {
    users: Array.isArray(db.users) ? db.users : defaults.users,
    sessions: Array.isArray(db.sessions) ? db.sessions : defaults.sessions,
    orders: Array.isArray(db.orders) ? db.orders : defaults.orders,
    coupons: Array.isArray(db.coupons) ? db.coupons : defaults.coupons,
    reviews: Array.isArray(db.reviews) ? db.reviews : defaults.reviews,
    notifications: Array.isArray(db.notifications) ? db.notifications : defaults.notifications,
    corporateRequests: Array.isArray(db.corporateRequests) ? db.corporateRequests : defaults.corporateRequests,
    customizationRequests: Array.isArray(db.customizationRequests) ? db.customizationRequests : defaults.customizationRequests,
    promoSlides: Array.isArray(db.promoSlides) ? db.promoSlides : defaults.promoSlides,
    reservations: Array.isArray(db.reservations) ? db.reservations : defaults.reservations,
    otpSessions: Array.isArray(db.otpSessions) ? db.otpSessions : defaults.otpSessions,
    emailQueue: Array.isArray(db.emailQueue) ? db.emailQueue : defaults.emailQueue,
    smsQueue: Array.isArray(db.smsQueue) ? db.smsQueue : defaults.smsQueue,
    pushQueue: Array.isArray(db.pushQueue) ? db.pushQueue : defaults.pushQueue,
    logs: db.logs && typeof db.logs === 'object'
      ? {
          error: Array.isArray(db.logs.error) ? db.logs.error : [],
          login: Array.isArray(db.logs.login) ? db.logs.login : [],
          order: Array.isArray(db.logs.order) ? db.logs.order : [],
          security: Array.isArray(db.logs.security) ? db.logs.security : [],
          system: Array.isArray(db.logs.system) ? db.logs.system : []
        }
      : defaults.logs,
    csrfSecret: typeof db.csrfSecret === 'string' && db.csrfSecret ? db.csrfSecret : defaults.csrfSecret,
    products: Array.isArray(db.products) && db.products.length ? db.products : defaults.products
  };
}

function readDb() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return ensureDbShape(data);
  } catch {
    return ensureDbShape({});
  }
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function appendLog(db, type, payload) {
  if (!db.logs || !db.logs[type]) return;
  db.logs[type].unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...payload
  });
  db.logs[type] = db.logs[type].slice(0, 500);
}

async function dispatchSms(db, to, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    return { status: 'queued', provider: 'local_queue' };
  }

  try {
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: message
    });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendLog(db, 'error', {
        event: 'sms_send_failed',
        provider: 'twilio',
        to,
        statusCode: response.status,
        error: payload.message || 'Twilio API error'
      });
      return { status: 'queued', provider: 'twilio', error: payload.message || 'Twilio API error' };
    }
    return { status: 'sent', provider: 'twilio', providerId: payload.sid || '' };
  } catch (error) {
    appendLog(db, 'error', {
      event: 'sms_send_failed',
      provider: 'twilio',
      to,
      error: String(error && error.message ? error.message : error)
    });
    return { status: 'queued', provider: 'twilio', error: String(error && error.message ? error.message : error) };
  }
}

async function sendTwilioVerifyOtp(db, to, channel = 'sms') {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    return { ok: false, status: 'not_configured', provider: 'local_queue' };
  }

  try {
    const body = new URLSearchParams({
      To: to,
      Channel: channel
    });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendLog(db, 'error', {
        event: 'twilio_verify_send_failed',
        provider: 'twilio_verify',
        to,
        statusCode: response.status,
        error: payload.message || 'Twilio Verify API error'
      });
      return { ok: false, status: 'failed', provider: 'twilio_verify', error: payload.message || 'Twilio Verify API error' };
    }
    return {
      ok: true,
      status: payload.status || 'pending',
      provider: 'twilio_verify',
      providerId: payload.sid || ''
    };
  } catch (error) {
    appendLog(db, 'error', {
      event: 'twilio_verify_send_failed',
      provider: 'twilio_verify',
      to,
      error: String(error && error.message ? error.message : error)
    });
    return { ok: false, status: 'failed', provider: 'twilio_verify', error: String(error && error.message ? error.message : error) };
  }
}

async function verifyTwilioOtp(db, to, code) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    return { ok: false, status: 'not_configured' };
  }

  try {
    const body = new URLSearchParams({
      To: to,
      Code: code
    });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      appendLog(db, 'error', {
        event: 'twilio_verify_check_failed',
        provider: 'twilio_verify',
        to,
        statusCode: response.status,
        error: payload.message || 'Twilio Verify check failed'
      });
      return { ok: false, status: 'failed', error: payload.message || 'Twilio Verify check failed' };
    }
    return {
      ok: payload.status === 'approved',
      status: payload.status || 'pending',
      provider: 'twilio_verify'
    };
  } catch (error) {
    appendLog(db, 'error', {
      event: 'twilio_verify_check_failed',
      provider: 'twilio_verify',
      to,
      error: String(error && error.message ? error.message : error)
    });
    return { ok: false, status: 'failed', error: String(error && error.message ? error.message : error) };
  }
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/script/gi, '')
    .trim();
}

function sanitizePayload(payload) {
  if (Array.isArray(payload)) return payload.map(sanitizePayload);
  if (!payload || typeof payload !== 'object') return typeof payload === 'string' ? sanitizeText(payload) : payload;
  const out = {};
  Object.keys(payload).forEach((key) => {
    out[key] = sanitizePayload(payload[key]);
  });
  return out;
}

function isRateLimited(req, db) {
  const ip = req.socket?.remoteAddress || 'unknown';
  const key = `${ip}:${req.method}`;
  const now = Date.now();
  const bucket = RATE_LIMIT.get(key) || [];
  const recent = bucket.filter((ts) => now - ts < 60_000);
  const limit = req.method === 'GET' ? 180 : 70;
  recent.push(now);
  RATE_LIMIT.set(key, recent);
  if (recent.length > limit) {
    appendLog(db, 'security', { event: 'rate_limit', ip, method: req.method, path: req.url });
    return true;
  }
  return false;
}

function assignDeliveryPartner(order) {
  const seed = String(order.orderId || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return DELIVERY_PARTNERS[seed % DELIVERY_PARTNERS.length];
}

function generateInvoice(order) {
  return {
    invoiceNo: `INV-${Date.now()}`,
    issuedAt: new Date().toISOString(),
    orderId: order.orderId,
    customer: order.customer,
    items: (order.items || []).map((item) => ({
      id: item.id,
      title: item.title,
      qty: Number(item.qty || 1),
      unitPrice: Number(item.price || 0),
      total: Number(item.qty || 1) * Number(item.price || 0)
    })),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    shipping: Number(order.shipping || 0),
    total: Number(order.total || 0)
  };
}

function hasValidOtp(db, phone, email) {
  const now = Date.now();
  const token = (db.otpSessions || []).find((entry) =>
    (
      (entry.channel === 'phone' && entry.recipient === String(phone || '').trim()) ||
      (entry.channel === 'email' && entry.recipient === String(email || '').trim().toLowerCase())
    ) &&
    entry.verified &&
    !entry.consumed &&
    now <= new Date(entry.expiresAt).getTime()
  );
  return token || null;
}

function sendJson(res, status, payload, req = null) {
  const origin = req?.headers?.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? (origin || '*') : 'null';
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(sanitizePayload(raw ? JSON.parse(raw) : {}));
      } catch {
        resolve({});
      }
    });
  });
}

function adminSummary(db) {
  const revenue = db.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pending = db.orders.filter((order) => order.orderStatus !== 'Delivered').length;
  const paid = db.orders.filter((order) => order.paymentStatus === 'Paid').length;
  return {
    totalOrders: db.orders.length,
    pendingShipments: pending,
    paidOrders: paid,
    totalCustomers: db.users.length,
    revenue,
    corporateRequests: db.corporateRequests.length,
    customizationRequests: db.customizationRequests.length
  };
}

function parseNum(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function applyProductFilters(url, baseProducts) {
  let list = [...baseProducts];
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const categoryId = url.searchParams.get('category');
  const material = url.searchParams.get('material');
  const customizationType = url.searchParams.get('customizationType');
  const minPrice = parseNum(url.searchParams.get('minPrice'), 0);
  const maxPrice = parseNum(url.searchParams.get('maxPrice'), 999999);
  const minRating = parseNum(url.searchParams.get('minRating'), 0);
  const sort = url.searchParams.get('sort') || 'popular';
  const page = Math.max(1, parseNum(url.searchParams.get('page'), 1));
  const limit = Math.min(60, Math.max(1, parseNum(url.searchParams.get('limit'), 24)));

  if (q) {
    list = list.filter((item) => `${item.title} ${item.category} ${item.subcategory}`.toLowerCase().includes(q));
  }
  if (categoryId) list = list.filter((item) => item.categoryId === categoryId);
  if (material) list = list.filter((item) => item.material === material);
  if (customizationType) list = list.filter((item) => item.customizationType === customizationType);

  list = list.filter((item) => item.basePrice >= minPrice && item.basePrice <= maxPrice && item.rating >= minRating);

  switch (sort) {
    case 'price-low':
      list.sort((a, b) => a.basePrice - b.basePrice);
      break;
    case 'price-high':
      list.sort((a, b) => b.basePrice - a.basePrice);
      break;
    case 'rated':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      list.sort((a, b) => b.popularity - a.popularity);
  }

  const total = list.length;
  const start = (page - 1) * limit;
  return {
    products: list.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

function createSession(db, userId) {
  const token = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  db.sessions.push({ token, userId, createdAt: new Date().toISOString() });
  return token;
}

function findUserByToken(db, token) {
  if (!token) return null;
  const entry = db.sessions.find((session) => session.token === token);
  if (!entry) return null;
  return db.users.find((u) => u.id === entry.userId) || null;
}

function authUser(req, db) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return findUserByToken(db, token);
}

function addNotification(db, message, type = 'info') {
  db.notifications.unshift({
    id: `NTF-${Date.now()}`,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false
  });
  db.notifications = db.notifications.slice(0, 200);
}

function applyCoupon(db, code, subtotal) {
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === String(code || '').toUpperCase() && c.active);
  if (!coupon) return { valid: false, discount: 0, reason: 'Invalid coupon' };
  if (subtotal < coupon.minOrder) return { valid: false, discount: 0, reason: `Minimum order is ${coupon.minOrder}` };

  const discount = coupon.type === 'percent'
    ? Math.round((subtotal * coupon.value) / 100)
    : coupon.value;

  return { valid: true, discount, coupon };
}

function normalizeCoupon(payload, previous = null) {
  const code = String(payload.code || previous?.code || '').trim().toUpperCase();
  const typeRaw = String(payload.type || previous?.type || 'percent').trim().toLowerCase();
  const type = typeRaw === 'flat' ? 'flat' : 'percent';
  const value = Number(payload.value ?? previous?.value ?? 0);
  const minOrder = Number(payload.minOrder ?? previous?.minOrder ?? 0);
  const active = payload.active !== undefined ? Boolean(payload.active) : Boolean(previous ? previous.active : true);
  return { code, type, value, minOrder, active };
}

function nextProductId(products) {
  const max = (products || []).reduce((acc, item) => {
    const match = String(item.id || '').match(/^PPL-(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return value > acc ? value : acc;
  }, 0);
  return `PPL-${String(max + 1).padStart(4, '0')}`;
}

function nextPromoSlideId(slides) {
  const max = (slides || []).reduce((acc, item) => {
    const match = String(item.id || '').match(/^PRM-(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return value > acc ? value : acc;
  }, 0);
  return `PRM-${String(max + 1).padStart(4, '0')}`;
}

const server = http.createServer(async (req, res) => {
  const db = readDb();

  if (isRateLimited(req, db)) {
    sendJson(res, 429, { error: 'Too many requests. Please retry shortly.' }, req);
    return;
  }

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true }, req);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/security/csrf') {
    sendJson(res, 200, { token: db.csrfSecret }, req);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'piplani-printlab-api', version: '2.0.0' }, req);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const payload = await parseBody(req);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const phone = String(payload.phone || '').trim();

    if (!name || !email || !password) {
      sendJson(res, 400, { error: 'name, email, and password are required' });
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      sendJson(res, 409, { error: 'Email already exists' });
      return;
    }

    const user = {
      id: `USR-${Date.now()}`,
      name,
      email,
      phone,
      password,
      rewards: 0,
      wishlist: [],
      savedDesigns: [],
      addresses: [],
      paymentMethods: []
    };
    db.users.push(user);
    const token = createSession(db, user.id);
    writeDb(db);
    sendJson(res, 201, { token, user: { ...user, password: undefined } });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const payload = await parseBody(req);
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const user = db.users.find((u) => u.email === email && u.password === password);
    if (!user) {
      appendLog(db, 'login', { success: false, email, reason: 'Invalid credentials' });
      writeDb(db);
      sendJson(res, 401, { error: 'Invalid credentials' }, req);
      return;
    }
    const token = createSession(db, user.id);
    appendLog(db, 'login', { success: true, email: user.email, userId: user.id });
    writeDb(db);
    sendJson(res, 200, { token, user: { ...user, password: undefined } }, req);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/otp/send') {
    const payload = await parseBody(req);
    const channel = sanitizeText(payload.channel || 'phone').toLowerCase() === 'email' ? 'email' : 'phone';
    const phone = sanitizeText(payload.phone);
    const email = sanitizeText(payload.email || '').toLowerCase();
    const name = sanitizeText(payload.name || 'Customer');
    const recipient = channel === 'phone' ? phone : email;
    if (!recipient) {
      sendJson(res, 400, { error: channel === 'phone' ? 'phone is required' : 'email is required' }, req);
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpEntry = {
      id: `OTP-${Date.now()}`,
      channel,
      recipient,
      otp,
      name,
      purpose: 'order',
      verified: false,
      consumed: false,
      attempts: 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
    db.otpSessions.unshift(otpEntry);
    db.otpSessions = db.otpSessions.slice(0, 500);
    if (channel === 'phone') {
      const smsMessage = `Dear ${name}, your OTP for verification of Piplni's Print is ${otp}. Please do not share it with anyone.`;
      const verifyResult = await sendTwilioVerifyOtp(db, recipient, 'sms');
      const smsResult = verifyResult.ok ? verifyResult : await dispatchSms(db, recipient, smsMessage);
      db.smsQueue.unshift({
        id: `SMS-${Date.now()}`,
        to: recipient,
        template: 'otp',
        message: smsMessage,
        createdAt: new Date().toISOString(),
        status: smsResult.status,
        provider: smsResult.provider,
        providerId: smsResult.providerId || ''
      });
    } else {
      db.emailQueue.unshift({
        id: `EMAIL-${Date.now()}`,
        to: recipient,
        subject: "Your Piplni's Print OTP",
        body: `Dear ${name}, your OTP for verification of Piplni's Print is ${otp}. Please do not share it with anyone.`,
        createdAt: new Date().toISOString(),
        status: 'queued'
      });
    }
    appendLog(db, 'system', { event: 'otp_sent', channel, recipient });
    writeDb(db);
    sendJson(res, 200, { otpId: otpEntry.id, channel, recipient, expiresAt: otpEntry.expiresAt }, req);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/otp/verify') {
    const payload = await parseBody(req);
    const channel = sanitizeText(payload.channel || 'phone').toLowerCase() === 'email' ? 'email' : 'phone';
    const phone = sanitizeText(payload.phone);
    const email = sanitizeText(payload.email || '').toLowerCase();
    const recipient = channel === 'phone' ? phone : email;
    const code = sanitizeText(payload.otp);
    if (channel === 'phone') {
      const twilioResult = await verifyTwilioOtp(db, recipient, code);
      if (twilioResult.status !== 'not_configured') {
        if (!twilioResult.ok) {
          sendJson(res, 400, { error: twilioResult.error || 'Invalid OTP' }, req);
          return;
        }
        const twilioSession = {
          id: `OTP-${Date.now()}`,
          channel,
          recipient,
          otp: '',
          name: '',
          purpose: 'order',
          verified: true,
          consumed: false,
          attempts: 1,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
        };
        db.otpSessions.unshift(twilioSession);
        db.otpSessions = db.otpSessions.slice(0, 500);
        writeDb(db);
        sendJson(res, 200, { verified: true }, req);
        return;
      }
    }
    const now = Date.now();
    const otpEntry = db.otpSessions.find((entry) => entry.channel === channel && entry.recipient === recipient && !entry.consumed && now <= new Date(entry.expiresAt).getTime());
    if (!otpEntry) {
      sendJson(res, 400, { error: 'OTP expired or not found' }, req);
      return;
    }
    otpEntry.attempts = Number(otpEntry.attempts || 0) + 1;
    if (otpEntry.otp !== code) {
      appendLog(db, 'security', { event: 'otp_invalid', channel, recipient, attempts: otpEntry.attempts });
      writeDb(db);
      sendJson(res, 400, { error: 'Invalid OTP' }, req);
      return;
    }
    otpEntry.verified = true;
    writeDb(db);
    sendJson(res, 200, { verified: true }, req);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    sendJson(res, 200, applyProductFilters(url, db.products));
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/products/')) {
    const productId = decodeURIComponent(url.pathname.split('/').pop());
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      sendJson(res, 404, { error: 'Product not found' });
      return;
    }

    const productReviews = db.reviews.filter((r) => r.productId === productId);
    sendJson(res, 200, { product, reviews: productReviews });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/orders') {
    const email = (url.searchParams.get('email') || '').trim().toLowerCase();
    const userOrders = email ? db.orders.filter((order) => String(order.email || '').toLowerCase() === email) : db.orders;
    sendJson(res, 200, { orders: userOrders });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const payload = await parseBody(req);
    if (!Array.isArray(payload.items) || !payload.items.length) {
      sendJson(res, 400, { error: 'items are required' }, req);
      return;
    }
    const otpToken = hasValidOtp(db, payload.phone, payload.email);
    if (!otpToken) {
      sendJson(res, 401, { error: 'OTP verification required before placing order' }, req);
      return;
    }
    const subtotal = Number(payload.subtotal || 0);
    const shipping = Number(payload.shipping || 0);
    const couponResult = payload.couponCode ? applyCoupon(db, payload.couponCode, subtotal) : { valid: false, discount: 0 };
    const discount = couponResult.valid ? couponResult.discount : 0;
    const total = subtotal + shipping - discount;
    const computedSubtotal = payload.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
    const safeSubtotal = Number.isFinite(computedSubtotal) ? computedSubtotal : subtotal;

    for (const item of payload.items) {
      const product = db.products.find((p) => p.id === item.id);
      const qty = Math.max(1, Number(item.qty || 1));
      if (!product) {
        sendJson(res, 409, { error: `Product ${item.id} not found` }, req);
        return;
      }
      const stock = Number(product.stockQty ?? 50);
      if (stock < qty) {
        sendJson(res, 409, { error: `Insufficient stock for ${product.title}` }, req);
        return;
      }
    }

    const order = {
      ...payload,
      orderId: payload.orderId || `ORD-${Date.now()}`,
      subtotal: safeSubtotal,
      total: Math.max(0, safeSubtotal + shipping - discount),
      shipping,
      discount,
      couponCode: couponResult.valid ? payload.couponCode : null,
      createdAt: payload.createdAt || new Date().toISOString(),
      orderStatus: payload.orderStatus || 'Processing',
      paymentStatus: payload.paymentStatus || 'Pending'
    };

    for (const item of payload.items) {
      const product = db.products.find((p) => p.id === item.id);
      const qty = Math.max(1, Number(item.qty || 1));
      product.stockQty = Math.max(0, Number(product.stockQty ?? 50) - qty);
    }

    order.deliveryPartner = assignDeliveryPartner(order);
    order.invoice = generateInvoice(order);
    order.tracking = order.tracking || {
      courier: order.deliveryPartner,
      number: `TRK${Math.floor(Math.random() * 100000000)}`
    };

    db.orders.unshift(order);
    otpToken.consumed = true;

    const customer = db.users.find((u) => u.email === String(order.email || '').toLowerCase());
    if (customer) {
      customer.rewards = Number(customer.rewards || 0) + Number(order.rewards || 0);
      if (order.addressDetail) {
        customer.addresses = customer.addresses || [];
        customer.addresses.unshift(order.addressDetail);
        customer.addresses = customer.addresses.slice(0, 10);
      }
      if (order.location) {
        customer.location = order.location;
      }
    }

    db.emailQueue.unshift({
      id: `EMAIL-${Date.now()}`,
      to: order.email,
      subject: `Order Confirmation - ${order.orderId}`,
      body: `Dear ${order.customer}, thank you for shopping with Piplni's Print. Your order ${order.orderId} has been confirmed.`,
      createdAt: new Date().toISOString(),
      status: 'queued'
    });
    db.smsQueue.unshift({
      id: `SMS-${Date.now()}`,
      to: order.phone,
      template: 'order_confirmation',
      message: `Dear ${order.customer}, thank you for purchasing from Piplni's Print. Your order ID is ${order.orderId}. To track your order, please visit: ${FRONTEND_URL}/tracking.html. We sincerely appreciate your purchase.`,
      createdAt: new Date().toISOString(),
      status: 'queued'
    });
    db.pushQueue.unshift({
      id: `PUSH-${Date.now()}`,
      user: order.email,
      title: 'Order Confirmed',
      body: `Your order ${order.orderId} is confirmed and processing.`,
      createdAt: new Date().toISOString(),
      status: 'queued'
    });
    appendLog(db, 'order', { event: 'order_created', orderId: order.orderId, total: order.total, paymentStatus: order.paymentStatus });
    addNotification(db, `New order ${order.orderId} received (${order.paymentStatus})`, 'order');
    writeDb(db);
    sendJson(res, 201, { order, coupon: couponResult.valid ? couponResult.coupon : null }, req);
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/orders/')) {
    const orderId = decodeURIComponent(url.pathname.split('/').pop());
    const order = db.orders.find((entry) => entry.orderId === orderId);
    if (!order) {
      sendJson(res, 404, { error: 'Order not found' });
      return;
    }
    sendJson(res, 200, { order });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/orders/')) {
    const orderId = decodeURIComponent(url.pathname.split('/').pop());
    const payload = await parseBody(req);
    const target = db.orders.find((entry) => entry.orderId === orderId);
    if (!target) {
      sendJson(res, 404, { error: 'Order not found' });
      return;
    }

    target.orderStatus = payload.orderStatus || target.orderStatus;
    target.paymentStatus = payload.paymentStatus || target.paymentStatus;
    target.shippingStatus = payload.shippingStatus || target.shippingStatus;
    if (payload.tracking) target.tracking = payload.tracking;

    addNotification(db, `Order ${orderId} updated to ${target.orderStatus}`, 'order_update');
    writeDb(db);
    sendJson(res, 200, { order: target });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/tracking/')) {
    const trackingNo = decodeURIComponent(url.pathname.split('/').pop());
    const order = db.orders.find((entry) => entry.tracking && entry.tracking.number === trackingNo);
    if (!order) {
      sendJson(res, 404, { error: 'Tracking number not found' });
      return;
    }
    sendJson(res, 200, {
      tracking: {
        orderId: order.orderId,
        courier: order.tracking.courier,
        number: order.tracking.number,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/coupons/validate') {
    const payload = await parseBody(req);
    const subtotal = Number(payload.subtotal || 0);
    const result = applyCoupon(db, payload.code, subtotal);
    sendJson(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/coupons') {
    const coupons = (db.coupons || []).filter((coupon) => coupon.active);
    sendJson(res, 200, { coupons });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/promo-slides') {
    const slides = (db.promoSlides || [])
      .filter((slide) => slide.active)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    sendJson(res, 200, { slides });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/promo-slides') {
    const slides = (db.promoSlides || []).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    sendJson(res, 200, { slides });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/promo-slides') {
    const payload = await parseBody(req);
    if (!payload.imageData) {
      sendJson(res, 400, { error: 'imageData is required' });
      return;
    }
    const slide = {
      id: nextPromoSlideId(db.promoSlides),
      title: String(payload.title || 'Festival Offer').trim(),
      tag: String(payload.tag || 'New').trim(),
      imageData: String(payload.imageData),
      mediaType: String(payload.mediaType || 'image').trim() === 'video' ? 'video' : 'image',
      link: String(payload.link || '').trim(),
      active: payload.active !== undefined ? Boolean(payload.active) : true,
      order: Number.isFinite(Number(payload.order)) ? Number(payload.order) : db.promoSlides.length + 1,
      createdAt: new Date().toISOString()
    };
    db.promoSlides.push(slide);
    addNotification(db, `Promo slide added: ${slide.title}`, 'promo');
    writeDb(db);
    sendJson(res, 201, { slide });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/promo-slides/')) {
    const slideId = decodeURIComponent(url.pathname.split('/').pop());
    const payload = await parseBody(req);
    const slide = (db.promoSlides || []).find((item) => item.id === slideId);
    if (!slide) {
      sendJson(res, 404, { error: 'Promo slide not found' });
      return;
    }
    const fields = ['title', 'tag', 'imageData', 'link', 'active', 'order', 'mediaType'];
    fields.forEach((field) => {
      if (payload[field] !== undefined) slide[field] = payload[field];
    });
    if (slide.mediaType !== 'video') slide.mediaType = 'image';
    addNotification(db, `Promo slide updated: ${slide.title}`, 'promo');
    writeDb(db);
    sendJson(res, 200, { slide });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/promo-slides/')) {
    const slideId = decodeURIComponent(url.pathname.split('/').pop());
    const index = (db.promoSlides || []).findIndex((item) => item.id === slideId);
    if (index < 0) {
      sendJson(res, 404, { error: 'Promo slide not found' });
      return;
    }
    const [removed] = db.promoSlides.splice(index, 1);
    addNotification(db, `Promo slide removed: ${removed.title}`, 'promo');
    writeDb(db);
    sendJson(res, 200, { removed });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/coupons') {
    sendJson(res, 200, { coupons: db.coupons || [] });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/coupons') {
    const payload = await parseBody(req);
    const coupon = normalizeCoupon(payload);
    if (!coupon.code || !Number.isFinite(coupon.value) || coupon.value <= 0) {
      sendJson(res, 400, { error: 'Valid code and value are required' });
      return;
    }
    if (db.coupons.some((entry) => String(entry.code || '').toUpperCase() === coupon.code)) {
      sendJson(res, 409, { error: 'Coupon code already exists' });
      return;
    }
    db.coupons.unshift(coupon);
    addNotification(db, `Coupon ${coupon.code} ${coupon.active ? 'published' : 'saved as draft'}`, 'coupon');
    writeDb(db);
    sendJson(res, 201, { coupon });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/coupons/')) {
    const couponCode = decodeURIComponent(url.pathname.split('/').pop()).toUpperCase();
    const payload = await parseBody(req);
    const coupon = db.coupons.find((entry) => String(entry.code || '').toUpperCase() === couponCode);
    if (!coupon) {
      sendJson(res, 404, { error: 'Coupon not found' });
      return;
    }
    const normalized = normalizeCoupon(payload, coupon);
    if (!normalized.code || !Number.isFinite(normalized.value) || normalized.value <= 0) {
      sendJson(res, 400, { error: 'Valid code and value are required' });
      return;
    }
    coupon.code = normalized.code;
    coupon.type = normalized.type;
    coupon.value = normalized.value;
    coupon.minOrder = normalized.minOrder;
    coupon.active = normalized.active;
    addNotification(db, `Coupon ${coupon.code} updated`, 'coupon');
    writeDb(db);
    sendJson(res, 200, { coupon });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/coupons/')) {
    const couponCode = decodeURIComponent(url.pathname.split('/').pop()).toUpperCase();
    const index = db.coupons.findIndex((entry) => String(entry.code || '').toUpperCase() === couponCode);
    if (index < 0) {
      sendJson(res, 404, { error: 'Coupon not found' });
      return;
    }
    const [removed] = db.coupons.splice(index, 1);
    addNotification(db, `Coupon ${removed.code} deleted`, 'coupon');
    writeDb(db);
    sendJson(res, 200, { removed });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/reviews') {
    const productId = url.searchParams.get('productId');
    const list = productId ? db.reviews.filter((r) => r.productId === productId) : db.reviews;
    sendJson(res, 200, { reviews: list });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reviews') {
    const payload = await parseBody(req);
    if (!payload.productId || !payload.rating || !payload.author || !payload.comment) {
      sendJson(res, 400, { error: 'productId, rating, author, comment required' });
      return;
    }

    const review = {
      id: `REV-${Date.now()}`,
      productId: payload.productId,
      author: String(payload.author),
      rating: Number(payload.rating),
      comment: String(payload.comment),
      createdAt: new Date().toISOString()
    };
    db.reviews.unshift(review);
    writeDb(db);
    sendJson(res, 201, { review });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/summary') {
    sendJson(res, 200, { summary: adminSummary(db) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/notifications') {
    sendJson(res, 200, { notifications: db.notifications.slice(0, 30) });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/products') {
    sendJson(res, 200, { products: db.products });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/products') {
    const payload = await parseBody(req);
    if (!payload.title || !payload.category || !payload.basePrice) {
      sendJson(res, 400, { error: 'title, category, basePrice required' });
      return;
    }

    const product = {
      id: nextProductId(db.products),
      title: String(payload.title),
      category: String(payload.category),
      categoryId: String(payload.categoryId || 'custom'),
      subcategory: String(payload.subcategory || payload.category),
      description: String(payload.description || 'Custom catalog product.'),
      basePrice: Number(payload.basePrice),
      priceMax: Number(payload.priceMax || payload.basePrice),
      material: String(payload.material || 'Acrylic'),
      deliverySpeed: String(payload.deliverySpeed || 'Standard'),
      customizationType: String(payload.customizationType || 'ready'),
      rating: Number(payload.rating || 4.2),
      reviews: Number(payload.reviews || 0),
      popularity: Number(payload.popularity || 0),
      isBestSeller: Boolean(payload.isBestSeller),
      isFeatured: Boolean(payload.isFeatured),
      discountType: String(payload.discountType || 'none'),
      discountValue: Number(payload.discountValue || 0),
      discountActive: Boolean(payload.discountActive),
      customBasePrice: Number(payload.customBasePrice || 0),
      customizationDimensions: payload.customizationDimensions || { width: 1200, height: 800 },
      createdAt: new Date().toISOString(),
      imageData: payload.imageData || null,
      imagePlaceholder: payload.imagePlaceholder || 'Image Placeholder (Upload Product Photo)',
      customization: payload.customization || {
        allowText: true,
        allowPhoto: true,
        allowLogo: true,
        colors: ['Black', 'White'],
        sizes: ['S', 'M', 'L'],
        materials: ['Acrylic', 'Wood', 'Metal']
      }
    };

    db.products.push(product);
    addNotification(db, `Catalog product added: ${product.title}`, 'catalog');
    writeDb(db);
    sendJson(res, 201, { product });
    return;
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/api/admin/products/')) {
    const productId = decodeURIComponent(url.pathname.split('/').pop());
    const payload = await parseBody(req);
    const target = db.products.find((entry) => entry.id === productId);
    if (!target) {
      sendJson(res, 404, { error: 'Product not found' });
      return;
    }

    const fields = [
      'title', 'category', 'categoryId', 'subcategory', 'description', 'material',
      'deliverySpeed', 'customizationType', 'imageData', 'imagePlaceholder',
      'isBestSeller', 'isFeatured', 'discountType', 'discountValue', 'discountActive',
      'customBasePrice', 'customizationDimensions'
    ];
    fields.forEach((field) => {
      if (payload[field] !== undefined) target[field] = payload[field];
    });

    if (payload.basePrice !== undefined) target.basePrice = Number(payload.basePrice);
    if (payload.priceMax !== undefined) target.priceMax = Number(payload.priceMax);

    addNotification(db, `Catalog product updated: ${target.title}`, 'catalog');
    writeDb(db);
    sendJson(res, 200, { product: target });
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/admin/products/')) {
    const productId = decodeURIComponent(url.pathname.split('/').pop());
    const index = db.products.findIndex((entry) => entry.id === productId);
    if (index < 0) {
      sendJson(res, 404, { error: 'Product not found' });
      return;
    }
    const [removed] = db.products.splice(index, 1);
    addNotification(db, `Catalog product removed: ${removed.title}`, 'catalog');
    writeDb(db);
    sendJson(res, 200, { removed });
    return;
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/users/')) {
    const userId = decodeURIComponent(url.pathname.split('/')[3] || '');
    const mode = decodeURIComponent(url.pathname.split('/')[4] || '');
    if (mode !== 'dashboard') {
      sendJson(res, 404, { error: 'Route not found' });
      return;
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      sendJson(res, 404, { error: 'User not found' });
      return;
    }

    const orders = db.orders.filter((order) => String(order.email || '').toLowerCase() === String(user.email).toLowerCase());
    sendJson(res, 200, {
      dashboard: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          rewards: user.rewards
        },
        totals: {
          orders: orders.length,
          returns: 0,
          wishlist: user.wishlist.length,
          savedDesigns: user.savedDesigns.length
        },
        orders: orders.slice(0, 20)
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/profile') {
    const user = authUser(req, db);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    sendJson(res, 200, { user: { ...user, password: undefined } });
    return;
  }

  if (req.method === 'PATCH' && url.pathname === '/api/profile') {
    const user = authUser(req, db);
    if (!user) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }
    const payload = await parseBody(req);
    user.name = payload.name || user.name;
    user.phone = payload.phone || user.phone;
    if (payload.location) user.location = payload.location;
    if (payload.addressDetail) {
      user.addresses = user.addresses || [];
      user.addresses.unshift(payload.addressDetail);
      user.addresses = user.addresses.slice(0, 10);
    }
    writeDb(db);
    sendJson(res, 200, { user: { ...user, password: undefined } });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/corporate-requests') {
    const payload = await parseBody(req);
    if (!payload.company || !payload.name || !payload.email || !payload.requirement) {
      sendJson(res, 400, { error: 'company, name, email, requirement are required' });
      return;
    }
    const request = {
      id: `CORP-${Date.now()}`,
      company: payload.company,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || '',
      quantity: payload.quantity || '',
      requirement: payload.requirement,
      createdAt: new Date().toISOString(),
      status: 'New'
    };
    db.corporateRequests.unshift(request);
    addNotification(db, `Corporate request from ${request.company} (${request.name})`, 'corporate');
    writeDb(db);
    sendJson(res, 201, { request });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/corporate-requests') {
    sendJson(res, 200, { requests: db.corporateRequests || [] });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/customization-requests') {
    const payload = await parseBody(req);
    const requiredFields = ['name', 'phone', 'email', 'productName', 'customizationNeed'];
    const missing = requiredFields.find((field) => !String(payload[field] || '').trim());
    if (missing) {
      sendJson(res, 400, { error: `${missing} is required` });
      return;
    }
    const request = {
      id: `CUS-${Date.now()}`,
      name: String(payload.name).trim(),
      phone: String(payload.phone).trim(),
      email: String(payload.email).trim(),
      productName: String(payload.productName).trim(),
      customizationNeed: String(payload.customizationNeed).trim(),
      quantity: String(payload.quantity || '').trim(),
      notes: String(payload.notes || '').trim(),
      createdAt: new Date().toISOString(),
      status: 'New'
    };
    db.customizationRequests.unshift(request);
    addNotification(db, `Customization request from ${request.name} for ${request.productName}`, 'customization');
    writeDb(db);
    sendJson(res, 201, { request });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/returns') {
    const payload = await parseBody(req);
    const orderId = sanitizeText(payload.orderId || '');
    const reason = sanitizeText(payload.reason || '');
    const email = sanitizeText(payload.email || '').toLowerCase();
    if (!orderId || !reason) {
      sendJson(res, 400, { error: 'orderId and reason are required' }, req);
      return;
    }
    const order = db.orders.find((entry) => entry.orderId === orderId);
    if (!order) {
      sendJson(res, 404, { error: 'Order not found' }, req);
      return;
    }
    if (email && String(order.email || '').toLowerCase() !== email) {
      sendJson(res, 403, { error: 'This order does not belong to this account' }, req);
      return;
    }
    order.orderStatus = 'Return Requested';
    order.returnRequest = {
      reason,
      requestedAt: new Date().toISOString(),
      by: sanitizeText(payload.customer || order.customer || 'Customer')
    };
    appendLog(db, 'order', { event: 'return_requested', orderId, email: order.email });
    addNotification(db, `Return requested for ${orderId}`, 'return');
    writeDb(db);
    sendJson(res, 200, { order }, req);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/customization-requests') {
    sendJson(res, 200, { requests: db.customizationRequests || [] });
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Piplni's Print API running on port ${PORT}`);
});
