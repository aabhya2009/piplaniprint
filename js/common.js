import { getCart, getWishlist } from "./store.js";

export function currency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function updateHeaderCounts() {
  const cartCount = getCart().reduce((sum, item) => sum + item.qty, 0);
  const wishCount = getWishlist().length;
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = cartCount;
  });
  document.querySelectorAll("[data-wishlist-count]").forEach((node) => {
    node.textContent = wishCount;
  });
}

export function wireMobileMenu() {
  const btn = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-mobile-nav]");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(nav.classList.contains("open")));
  });
}

export function mountFooter() {
  const footer = document.querySelector("[data-footer]");
  if (!footer) return;
  footer.innerHTML = `
    <div class="footer-grid">
      <div>
        <h4>Piplni's Print</h4>
        <p>Premium customizable printing products and accessories across India and global markets.</p>
      </div>
      <div>
        <h4>Policies</h4>
        <a href="shipping-policy.html">Shipping Policy</a>
        <a href="returns-refunds.html">Returns & Refunds</a>
        <a href="privacy-policy.html">Privacy Policy</a>
        <a href="terms-of-service.html">Terms of Service</a>
      </div>
      <div>
        <h4>Support</h4>
        <a href="tel:+919876543210">+91 98765 43210</a>
        <a href="mailto:support@piplaniprintlab.com">support@piplaniprintlab.com</a>
        <a href="#faq">Help Center / FAQ</a>
      </div>
      <div>
        <h4>Global Shipping</h4>
        <p>Domestic India delivery with international shipping available at additional courier rates.</p>
      </div>
    </div>
    <p class="copyright">© 2026 Piplni's Print. All rights reserved.</p>
  `;
}

export function renderStars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function productCard(product) {
  const imageClass = product.imageStyle === "dark" ? "product-image dark-preview" : "product-image";
  const imageBody = product.imageData
    ? `<img src="${product.imageData}" alt="${product.title}" style="width:100%;height:180px;object-fit:cover" />`
    : product.imagePlaceholder;
  const discountAmount = product.discountActive
    ? product.discountType === "percent"
      ? Math.round((Number(product.basePrice || 0) * Number(product.discountValue || 0)) / 100)
      : Number(product.discountValue || 0)
    : 0;
  const effectiveBase = Math.max(0, Number(product.basePrice || 0) - discountAmount);
  const priceText = product.discountActive
    ? `${currency(effectiveBase)} - ${currency(Math.max(effectiveBase, Number(product.priceMax || 0) - discountAmount))}`
    : `${currency(product.basePrice)} - ${currency(product.priceMax)}`;
  const badge = product.isBestSeller ? `<span class="badge" style="margin-right:0.4rem">Best Seller</span>` : "";
  return `
    <article class="product-card">
      <a class="${imageClass}" href="product.html?id=${product.id}">${imageBody}</a>
      <div class="product-copy">
        <p class="meta">${product.category}</p>
        <h3><a href="product.html?id=${product.id}">${product.title}</a></h3>
        <p>${badge}${product.discountActive ? `<span class="badge">${product.discountType === "percent" ? `${product.discountValue}% OFF` : `${currency(product.discountValue)} OFF`}</span>` : ""}</p>
        <p class="price">${priceText}</p>
        <p class="rating">${renderStars(product.rating)} <span>${product.rating} (${product.reviews})</span></p>
      </div>
    </article>
  `;
}
