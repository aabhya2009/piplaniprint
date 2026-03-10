const KEYS = {
  cart: "ppl_cart",
  wishlist: "ppl_wishlist",
  orders: "ppl_orders",
  rewards: "ppl_rewards",
  user: "ppl_user"
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCart() {
  return read(KEYS.cart, []);
}

export function saveCart(cart) {
  write(KEYS.cart, cart);
}

export function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((entry) => entry.id === item.id && entry.variantKey === item.variantKey);
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({ ...item, qty: item.qty || 1 });
  }
  saveCart(cart);
}

export function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

export function getWishlist() {
  return read(KEYS.wishlist, []);
}

export function toggleWishlist(productId) {
  const wishlist = getWishlist();
  const index = wishlist.indexOf(productId);
  if (index >= 0) {
    wishlist.splice(index, 1);
  } else {
    wishlist.push(productId);
  }
  write(KEYS.wishlist, wishlist);
  return wishlist;
}

export function getOrders() {
  return read(KEYS.orders, []);
}

export function addOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  write(KEYS.orders, orders);
}

export function getRewards() {
  return read(KEYS.rewards, 0);
}

export function addRewards(points) {
  const next = getRewards() + points;
  write(KEYS.rewards, next);
  return next;
}

export function getUser() {
  return read(KEYS.user, {
    name: "Guest Customer",
    email: "customer@piplaniprintlab.com",
    phone: "+91-99999-99999"
  });
}

export function setUser(user) {
  write(KEYS.user, user);
}
