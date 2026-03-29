import { categories } from "./data.js";
import { mountFooter, productCard, updateHeaderCounts, wireMobileMenu } from "./common.js";
import { createCustomizationRequest, createReview, fetchCatalogProducts, fetchCoupons, fetchPromoSlides } from "./api.js";

let cachedProducts = [];
let promoIndex = 0;
let promoTimer = null;

document.body.classList.add("page-home");
requestAnimationFrame(() => {
  document.body.classList.add("home-ready");
});

function renderCategories() {
  const root = document.getElementById("categoryGrid");
  root.innerHTML = categories
    .map(
      (category) => `
      <a class="card" href="catalog.html?category=${category.id}">
        <h3>${category.name}</h3>
        <p>${category.subcategories.slice(0, 3).join(" • ")}</p>
      </a>
    `
    )
    .join("");
}

async function renderProducts() {
  try {
    const data = await fetchCatalogProducts({ limit: 120, sort: "popular" });
    const list = data.products || [];
    cachedProducts = list;
    const featuredFlag = list.filter((item) => item.isFeatured);
    const bestFlag = list.filter((item) => item.isBestSeller);
    const featured = (featuredFlag.length ? featuredFlag : list).slice(0, 8);
    const best = (bestFlag.length ? bestFlag : [...list].sort((a, b) => Number(b.reviews || 0) - Number(a.reviews || 0))).slice(0, 8);
    document.getElementById("featuredGrid").innerHTML = featured.map(productCard).join("");
    document.getElementById("bestGrid").innerHTML = best.map(productCard).join("");
    mountReviewProducts();
  } catch {
    document.getElementById("featuredGrid").innerHTML = "<p>Could not load products.</p>";
    document.getElementById("bestGrid").innerHTML = "<p>Could not load products.</p>";
  }
}

function setReqMessage(text, isError = false) {
  const node = document.getElementById("customReqMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function setReviewMessage(text, isError = false) {
  const node = document.getElementById("homeReviewMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function mountReviewProducts() {
  const select = document.getElementById("homeReviewProduct");
  if (!select) return;
  if (!cachedProducts.length) {
    select.innerHTML = '<option value="">No products loaded</option>';
    return;
  }
  select.innerHTML = cachedProducts
    .slice(0, 120)
    .map((product) => `<option value="${product.id}">${product.title} (${product.id})</option>`)
    .join("");
}

function wireCustomizationRequest() {
  const button = document.getElementById("customReqSubmitBtn");
  if (!button) return;
  button.addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("customReqName").value.trim(),
      phone: document.getElementById("customReqPhone").value.trim(),
      email: document.getElementById("customReqEmail").value.trim(),
      productName: document.getElementById("customReqProduct").value.trim(),
      customizationNeed: document.getElementById("customReqType").value.trim(),
      quantity: document.getElementById("customReqQty").value.trim(),
      notes: document.getElementById("customReqNotes").value.trim()
    };
    if (!payload.name || !payload.phone || !payload.email || !payload.productName || !payload.customizationNeed) {
      setReqMessage("Please fill name, phone, email, product, and customization type.", true);
      return;
    }
    try {
      await createCustomizationRequest(payload);
      setReqMessage("Customization request submitted. Team will contact you.");
      document.getElementById("customReqNotes").value = "";
    } catch (error) {
      setReqMessage(error.message || "Could not submit request.", true);
    }
  });
}

function wireReviewForm() {
  const button = document.getElementById("homeReviewSubmitBtn");
  if (!button) return;
  button.addEventListener("click", async () => {
    const productId = document.getElementById("homeReviewProduct").value;
    const author = document.getElementById("homeReviewAuthor").value.trim() || "Customer";
    const rating = Number(document.getElementById("homeReviewRating").value);
    const comment = document.getElementById("homeReviewComment").value.trim();
    if (!productId || !comment) {
      setReviewMessage("Please select product and write review.", true);
      return;
    }
    try {
      await createReview({ productId, author, rating, comment });
      setReviewMessage("Review submitted successfully.");
      document.getElementById("homeReviewComment").value = "";
    } catch (error) {
      setReviewMessage(error.message || "Could not submit review.", true);
    }
  });
}

function wireChat() {
  const toggle = document.getElementById("chatToggle");
  const panel = document.getElementById("chatPanel");
  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
  });
}

async function renderDiscountBar() {
  const node = document.getElementById("discountBar");
  if (!node) return;

  try {
    const coupons = await fetchCoupons();
    if (!coupons.length) {
      node.textContent = "No active discounts right now.";
      return;
    }
    node.textContent = coupons
      .map((coupon) => {
        const value = coupon.type === "percent" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`;
        return `${coupon.code}: ${value} on minimum ₹${coupon.minOrder}`;
      })
      .join("  |  ");
  } catch {
    node.textContent = "WELCOME10: 10% OFF on minimum ₹1000  |  BULK500: ₹500 OFF on minimum ₹5000";
  }
}

function renderPromoSlides(slides) {
  const track = document.getElementById("promoTrack");
  const prev = document.getElementById("promoPrev");
  const next = document.getElementById("promoNext");
  if (!track || !prev || !next) return;

  if (!slides.length) {
    track.innerHTML = `
      <article class="promo-slide">
        <div style="width:100%;height:100%;min-height:inherit;background:#f5ede3"></div>
      </article>
    `;
    prev.style.display = "none";
    next.style.display = "none";
    return;
  }

  track.innerHTML = slides
    .map(
      (slide) => `
      <article class="promo-slide">
        ${slide.link ? `<a href="${slide.link}">` : ""}
          <img src="${slide.imageData}" alt="${slide.title || "Festival visual"}" />
        ${slide.link ? "</a>" : ""}
      </article>
    `
    )
    .join("");

  const move = (index) => {
    promoIndex = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${promoIndex * 100}%)`;
  };

  prev.onclick = () => move(promoIndex - 1);
  next.onclick = () => move(promoIndex + 1);
  move(0);

  if (promoTimer) clearInterval(promoTimer);
  promoTimer = setInterval(() => move(promoIndex + 1), 3200);
}

async function renderPromoSlider() {
  try {
    const slides = await fetchPromoSlides();
    renderPromoSlides(slides);
  } catch {
    renderPromoSlides([]);
  }
}

renderCategories();
renderProducts();
renderPromoSlider();
wireChat();
renderDiscountBar();
wireCustomizationRequest();
wireReviewForm();
mountFooter();
updateHeaderCounts();
wireMobileMenu();
