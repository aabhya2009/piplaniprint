import { products as seedProducts } from "./data.js";
import { currency, mountFooter, renderStars, updateHeaderCounts } from "./common.js";
import { addToCart, toggleWishlist } from "./store.js";
import { createReview, fetchCatalogProducts, fetchProductById, fetchReviews, getAuthUser } from "./api.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id") || seedProducts[0].id;

function defaultCustomization() {
  return {
    allowText: true,
    allowPhoto: true,
    allowLogo: true,
    colors: ["Black", "White", "Navy", "Crimson", "Champagne"],
    sizes: ["S", "M", "L", "XL"],
    materials: ["Acrylic", "Wood", "Metal", "Fabric", "Ceramic", "Leather"]
  };
}

function normalizeProduct(product) {
  return {
    ...product,
    imagePlaceholder: product.imagePlaceholder || "Image Placeholder (Upload Product Photo)",
    customization: product.customization || defaultCustomization(),
    visualOptions: product.visualOptions || [
      { name: "Classic", tone: "light" },
      { name: "Premium", tone: "neutral" },
      { name: "Signature", tone: "dark" },
      { name: "Customize Your Own", tone: "custom" }
    ],
    designOptions: product.designOptions || [],
    discountType: product.discountType || "none",
    discountValue: Number(product.discountValue || 0),
    discountActive: Boolean(product.discountActive),
    customBasePrice: Number(product.customBasePrice || 0),
    customizationDimensions: {
      width: Number(product.customizationDimensions?.width || 1200),
      height: Number(product.customizationDimensions?.height || 800)
    }
  };
}

async function loadProduct() {
  try {
    const data = await fetchProductById(productId);
    return normalizeProduct(data.product);
  } catch {
    try {
      const list = await fetchCatalogProducts({ limit: 1 });
      return normalizeProduct((list.products || [seedProducts[0]])[0]);
    } catch {
      return normalizeProduct(seedProducts[0]);
    }
  }
}

function render(product) {
  const PHOTO_KEY = `ppl_product_photo_${product.id}`;
  const root = document.getElementById("productRoot");

  root.innerHTML = `
    <div class="product-layout">
      <section class="gallery ${product.imageStyle === "dark" ? "dark-preview" : ""}" id="galleryPreview">
        <div id="galleryMedia">${
          product.imageData
            ? `<img class="gallery-img" src="${product.imageData}" alt="${product.title}" />`
            : product.imagePlaceholder
        }</div>
      </section>
      <section class="detail">
        <p class="meta">${product.category} • ${product.subcategory}</p>
        <h1>${product.title}</h1>
        <p>${product.description || "Premium catalog product."}</p>
        <div class="badge-row">
          <span class="badge">${product.material || "Acrylic"}</span>
          <span class="badge">${product.deliverySpeed || "Standard"}</span>
          <span class="badge">Customization: ${product.customizationType || "ready"}</span>
          ${product.isBestSeller ? '<span class="badge">Best Seller</span>' : ''}
          ${product.discountActive ? `<span class="badge">${product.discountType === "percent" ? `${product.discountValue}% OFF` : `${currency(product.discountValue)} OFF`}</span>` : ''}
        </div>
        <p class="rating">${renderStars(Number(product.rating || 4.2))} <span>${Number(product.rating || 4.2)} (${Number(product.reviews || 0)} reviews)</span></p>

        <h3>Visual Options</h3>
        <div class="visual-options" id="visualOptions">
          ${(product.visualOptions || [])
            .map(
              (option, index) => `
              <button class="visual-chip ${option.tone}" data-visual="${option.name}" type="button" ${index === 0 ? 'aria-pressed="true"' : 'aria-pressed="false"'}>
                <span>${option.name}</span>
              </button>
            `
            )
            .join("")}
        </div>

        <h3>Customization Options</h3>
        <div class="option-grid">
          ${
            product.designOptions?.length
              ? `<label><span class="label">Design</span><select id="designSelect" class="field">${product.designOptions
                  .map((d) => `<option>${d}</option>`)
                  .join("")}</select><p class="hint">Last option is "Customize Your Own" for photo uploads.</p></label>`
              : ""
          }
          <label><span class="label">Custom Text</span><input id="customText" type="text" placeholder="Name / message" /></label>
          <label><span class="label">Upload Photo</span><input id="photoFile" type="file" /></label>
          <label><span class="label">Upload Logo</span><input id="logoFile" type="file" /></label>
          <label><span class="label">Color</span><select id="color" class="field">${product.customization.colors.map((c) => `<option>${c}</option>`).join("")}</select></label>
          <label><span class="label">Size</span><select id="size" class="field">${product.customization.sizes.map((s) => `<option>${s}</option>`).join("")}</select></label>
          <label><span class="label">Material</span><select id="material" class="field">${product.customization.materials.map((m) => `<option>${m}</option>`).join("")}</select></label>
        </div>
        <p class="hint" id="customOwnHint"></p>
        <p class="hint">Print Fit Area: ${product.customizationDimensions.width} x ${product.customizationDimensions.height}</p>

        <div class="price-box">
          <p>Live Price</p>
          <strong id="livePrice">${currency(Number(product.basePrice || 0))}</strong>
        </div>

        <div class="dual-btn">
          <button class="btn btn-primary" id="addCartBtn" type="button">Add to Cart</button>
          <button class="btn btn-secondary" id="wishlistBtn" type="button">Wishlist</button>
        </div>
        <div class="notice" id="productMessage">Customize and choose options before adding to cart.</div>

        <h3>Delivery Information</h3>
        <p>${product.deliveryInfo || "Ships in 2-5 business days. International shipping available."}</p>

        <h3>Customer Reviews</h3>
        <div id="reviewList"></div>
        <h4>Write a Review</h4>
        <div class="option-grid">
          <label><span class="label">Your Name</span><input id="reviewAuthor" type="text" placeholder="Your name" /></label>
          <label><span class="label">Rating</span><select id="reviewRating" class="field"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label>
        </div>
        <label><span class="label">Review</span><textarea id="reviewComment" class="field" rows="3" placeholder="Write your review"></textarea></label>
        <button class="btn btn-secondary" id="submitReviewBtn" type="button">Submit Review</button>
      </section>
    </div>
  `;

  function showProductMessage(text, isError = false) {
    const node = document.getElementById("productMessage");
    node.textContent = text;
    node.style.borderColor = isError ? "#E63946" : "#3A86FF";
  }

  function calculatePrice() {
    const designSelect = document.getElementById("designSelect");
    const selectedDesign = designSelect ? designSelect.value : "";
    const selectedVisual = document.querySelector(".visual-chip[aria-pressed='true']")?.dataset.visual || "";
    const isCustomOwn = selectedDesign === "Customize Your Own" || selectedVisual === "Customize Your Own";

    let total = isCustomOwn && Number(product.customBasePrice || 0) > 0
      ? Number(product.customBasePrice || 0)
      : Number(product.basePrice || 0);
    if (product.discountActive) {
      const discount = product.discountType === "percent"
        ? Math.round((total * Number(product.discountValue || 0)) / 100)
        : Number(product.discountValue || 0);
      total = Math.max(0, total - discount);
    }

    if (designSelect && selectedDesign.includes("Black")) total += 40;
    if (selectedVisual.includes("Black")) total += 60;
    if (selectedVisual === "Premium" || selectedVisual === "Signature") total += 80;
    if (isCustomOwn && Number(product.customBasePrice || 0) <= 0) total += 120;
    const textLen = document.getElementById("customText").value.trim().length;
    if (textLen) total += 40 + Math.min(160, textLen * 4);
    if (document.getElementById("photoFile").files.length) total += isCustomOwn ? 0 : 120;
    if (document.getElementById("logoFile").files.length) total += 150;
    if (document.getElementById("size").value === "L") total += 60;
    if (document.getElementById("size").value === "XL") total += 120;
    if (document.getElementById("material").value === "Metal") total += 180;
    if (document.getElementById("material").value === "Leather") total += 240;

    document.getElementById("livePrice").textContent = currency(total);
    return total;
  }

  function setGalleryPreview(src) {
    const media = document.getElementById("galleryMedia");
    if (!media) return;
    if (!src) {
      media.innerHTML = product.imagePlaceholder;
      return;
    }
    media.innerHTML = `
      <div class="print-fit" style="--fit-w:${product.customizationDimensions.width};--fit-h:${product.customizationDimensions.height}">
        <img class="gallery-img print-fit-img" src="${src}" alt="Customer upload preview" />
      </div>
    `;
  }

  function loadSavedPhoto() {
    const saved = localStorage.getItem(PHOTO_KEY);
    if (saved) setGalleryPreview(saved);
  }

  function syncDesignMode() {
    const designSelect = document.getElementById("designSelect");
    const photoFile = document.getElementById("photoFile");
    const logoFile = document.getElementById("logoFile");
    const hint = document.getElementById("customOwnHint");
    if (!photoFile || !logoFile || !hint) return;
    const visualCustom = document.querySelector(".visual-chip[aria-pressed='true']")?.dataset.visual === "Customize Your Own";
    const designCustom = designSelect ? designSelect.value === "Customize Your Own" : false;
    const isCustomOwn = visualCustom || designCustom;
    photoFile.disabled = !isCustomOwn;
    logoFile.disabled = !isCustomOwn;
    if (!isCustomOwn) {
      photoFile.value = "";
      logoFile.value = "";
      localStorage.removeItem(PHOTO_KEY);
      if (!product.imageData) setGalleryPreview("");
      hint.textContent = "Select 'Customize Your Own' to upload customer photos/logos.";
    } else {
      hint.textContent = "You can now upload customer photo/logo for this custom design.";
    }
  }

  ["customText", "photoFile", "logoFile", "color", "size", "material", "designSelect"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      syncDesignMode();
      calculatePrice();
    });
    el.addEventListener("input", calculatePrice);
  });

  document.querySelectorAll(".visual-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".visual-chip").forEach((node) => node.setAttribute("aria-pressed", "false"));
      chip.setAttribute("aria-pressed", "true");
      const saved = localStorage.getItem(PHOTO_KEY);
      if (!saved && !product.imageData) {
        const media = document.getElementById("galleryMedia");
        if (media) media.textContent = `${product.imagePlaceholder} • ${chip.dataset.visual}`;
      }
      syncDesignMode();
      calculatePrice();
    });
  });

  document.getElementById("photoFile").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      localStorage.removeItem(PHOTO_KEY);
      if (!product.imageData) setGalleryPreview("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) {
        localStorage.setItem(PHOTO_KEY, result);
        setGalleryPreview(result);
      }
    };
    reader.readAsDataURL(file);
  });

  function getVariant() {
    return {
      visualOption: document.querySelector(".visual-chip[aria-pressed='true']")?.dataset.visual || "Classic",
      design: document.getElementById("designSelect")?.value || "Default",
      color: document.getElementById("color").value,
      size: document.getElementById("size").value,
      material: document.getElementById("material").value,
      text: document.getElementById("customText").value.trim(),
      photo: document.getElementById("photoFile").files.length ? "uploaded" : "none",
      logo: document.getElementById("logoFile").files.length ? "uploaded" : "none",
      printArea: `${product.customizationDimensions.width}x${product.customizationDimensions.height}`,
      customBasePrice: Number(product.customBasePrice || 0)
    };
  }

  document.getElementById("addCartBtn").addEventListener("click", () => {
    const variant = getVariant();
    const price = calculatePrice();
    addToCart({
      id: product.id,
      title: product.title,
      qty: 1,
      price,
      variant,
      variantKey: JSON.stringify(variant)
    });
    updateHeaderCounts();
    showProductMessage("Added to cart.");
  });

  document.getElementById("wishlistBtn").addEventListener("click", () => {
    toggleWishlist(product.id);
    updateHeaderCounts();
    showProductMessage("Wishlist updated.");
  });

  async function renderReviews() {
    const rootNode = document.getElementById("reviewList");
    try {
      const reviews = await fetchReviews(product.id);
      rootNode.innerHTML = reviews.length
        ? reviews
            .slice(0, 10)
            .map(
              (r) => `<div class="panel" style="margin-bottom:0.5rem"><strong>${r.author}</strong><p>${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</p><p>${r.comment}</p></div>`
            )
            .join("")
        : "<p>No reviews yet. Be the first to review.</p>";
    } catch {
      rootNode.innerHTML = "<p>Could not load reviews right now.</p>";
    }
  }

  document.getElementById("submitReviewBtn").addEventListener("click", async () => {
    const user = getAuthUser();
    const author = document.getElementById("reviewAuthor").value.trim() || user?.name || "Customer";
    const rating = Number(document.getElementById("reviewRating").value);
    const comment = document.getElementById("reviewComment").value.trim();

    if (!comment) {
      showProductMessage("Please write a review comment.", true);
      return;
    }

    try {
      await createReview({ productId: product.id, author, rating, comment });
      document.getElementById("reviewComment").value = "";
      showProductMessage("Review submitted.");
      renderReviews();
    } catch (error) {
      showProductMessage(error.message || "Could not submit review.", true);
    }
  });

  syncDesignMode();
  loadSavedPhoto();
  calculatePrice();
  renderReviews();
  mountFooter();
  updateHeaderCounts();
}

loadProduct().then(render);
