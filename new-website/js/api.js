function resolveApiBase() {
  const runtimeOverride = window.PPL_API_BASE;
  if (runtimeOverride && String(runtimeOverride).trim()) {
    return String(runtimeOverride).replace(/\/$/, "");
  }

  const storedOverride = localStorage.getItem("ppl_api_base");
  if (storedOverride && String(storedOverride).trim()) {
    return String(storedOverride).replace(/\/$/, "");
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:8081/api";
  }

  return "https://api.piplanisprint.com/api";
}

const API_BASE = resolveApiBase();

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `API error: ${response.status}`);
  }
  return data;
}

export function getAuthToken() {
  return localStorage.getItem('ppl_auth_token') || '';
}

export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('ppl_auth_user') || 'null');
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem('ppl_auth_token', token);
  localStorage.setItem('ppl_auth_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('ppl_auth_token');
  localStorage.removeItem('ppl_auth_user');
}

export async function apiHealth() {
  return api('/health');
}

export async function registerUser(payload) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function loginUser(payload) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchProfile() {
  return api('/profile', {
    headers: { Authorization: `Bearer ${getAuthToken()}` }
  });
}

export async function updateProfile(payload) {
  return api('/profile', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: JSON.stringify(payload)
  });
}

export async function fetchOrders(email = '') {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  const data = await api(`/orders${query}`);
  return data.orders || [];
}

export async function createOrder(order) {
  const data = await api('/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  });
  return data.order;
}

export async function fetchOrderByTracking(trackingNo) {
  return api(`/tracking/${encodeURIComponent(trackingNo)}`);
}

export async function fetchAdminSummary() {
  const data = await api('/admin/summary');
  return data.summary;
}

export async function fetchAdminNotifications() {
  const data = await api('/admin/notifications');
  return data.notifications || [];
}

export async function patchOrderStatus(orderId, payload) {
  const data = await api(`/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.order;
}

export async function fetchReviews(productId) {
  const data = await api(`/reviews?productId=${encodeURIComponent(productId)}`);
  return data.reviews || [];
}

export async function createReview(payload) {
  const data = await api('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.review;
}

export async function createCorporateRequest(payload) {
  return api('/corporate-requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function createReturnRequest(payload) {
  return api('/returns', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchCoupons() {
  const data = await api('/coupons');
  return data.coupons || [];
}

export async function fetchPromoSlides() {
  const data = await api('/promo-slides');
  return data.slides || [];
}

export async function validateCoupon(code, subtotal) {
  return api('/coupons/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal })
  });
}

export async function sendOrderOtp(payload) {
  return api('/otp/send', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function verifyOrderOtp(payload) {
  return api('/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchCatalogProducts(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const qs = query.toString();
  return api(`/products${qs ? `?${qs}` : ""}`);
}

export async function fetchProductById(productId) {
  return api(`/products/${encodeURIComponent(productId)}`);
}

export async function fetchAdminProducts() {
  const data = await api('/admin/products');
  return data.products || [];
}

export async function createAdminProduct(payload) {
  const data = await api('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.product;
}

export async function updateAdminProduct(productId, payload) {
  const data = await api(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.product;
}

export async function deleteAdminProduct(productId) {
  return api(`/admin/products/${encodeURIComponent(productId)}`, {
    method: 'DELETE'
  });
}

export async function createCustomizationRequest(payload) {
  const data = await api('/customization-requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.request;
}

export async function fetchAdminCorporateRequests() {
  const data = await api('/admin/corporate-requests');
  return data.requests || [];
}

export async function fetchAdminCustomizationRequests() {
  const data = await api('/admin/customization-requests');
  return data.requests || [];
}

export async function fetchAdminCoupons() {
  const data = await api('/admin/coupons');
  return data.coupons || [];
}

export async function createAdminCoupon(payload) {
  const data = await api('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.coupon;
}

export async function updateAdminCoupon(code, payload) {
  const data = await api(`/admin/coupons/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.coupon;
}

export async function deleteAdminCoupon(code) {
  return api(`/admin/coupons/${encodeURIComponent(code)}`, {
    method: 'DELETE'
  });
}

export async function fetchAdminPromoSlides() {
  const data = await api('/admin/promo-slides');
  return data.slides || [];
}

export async function createAdminPromoSlide(payload) {
  const data = await api('/admin/promo-slides', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return data.slide;
}

export async function updateAdminPromoSlide(id, payload) {
  const data = await api(`/admin/promo-slides/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  return data.slide;
}

export async function deleteAdminPromoSlide(id) {
  return api(`/admin/promo-slides/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}
