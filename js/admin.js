import { mountFooter, currency } from "./common.js";
import { categories } from "./data.js";
import {
  createAdminCoupon,
  createAdminPromoSlide,
  createAdminProduct,
  deleteAdminCoupon,
  deleteAdminPromoSlide,
  deleteAdminProduct,
  fetchAdminCorporateRequests,
  fetchAdminCoupons,
  fetchAdminCustomizationRequests,
  fetchAdminNotifications,
  fetchAdminPromoSlides,
  fetchAdminProducts,
  fetchAdminSummary,
  fetchOrders,
  patchOrderStatus,
  updateAdminCoupon,
  updateAdminPromoSlide,
  updateAdminProduct
} from "./api.js";

const ADMIN_USERNAME = "piplanisprintadmin";
const ADMIN_PASSWORD = "aabhyaric#1";
const ADMIN_SESSION_KEY = "ppl_admin_authenticated";

let currentProducts = [];
let currentCoupons = [];
let currentSlides = [];
let uploadedImageData = "";
let uploadedSlideImageData = "";

function wireCategoryPresets() {
  const categoryPreset = document.getElementById("adminProductCategoryPreset");
  const subcategoryPreset = document.getElementById("adminProductSubcategoryPreset");
  const categoryInput = document.getElementById("adminProductCategory");
  const categoryIdInput = document.getElementById("adminProductCategoryId");
  const subcategoryInput = document.getElementById("adminProductSubcategory");

  if (!categoryPreset || !subcategoryPreset || !categoryInput || !categoryIdInput || !subcategoryInput) return;

  categoryPreset.innerHTML = [
    '<option value="">Select category preset</option>',
    ...categories.map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
  ].join("");

  const refreshSubcategories = (categoryId) => {
    const match = categories.find((cat) => cat.id === categoryId);
    subcategoryPreset.innerHTML = [
      '<option value="">Select subcategory preset</option>',
      ...(match ? match.subcategories.map((sub) => `<option value="${sub}">${sub}</option>`) : [])
    ].join("");
  };

  categoryPreset.addEventListener("change", () => {
    const match = categories.find((cat) => cat.id === categoryPreset.value);
    if (!match) return;
    categoryInput.value = match.name;
    categoryIdInput.value = match.id;
    refreshSubcategories(match.id);
    if (!subcategoryInput.value && match.subcategories[0]) subcategoryInput.value = match.subcategories[0];
  });

  subcategoryPreset.addEventListener("change", () => {
    if (subcategoryPreset.value) subcategoryInput.value = subcategoryPreset.value;
  });
}

function setActionMessage(text, isError = false) {
  const node = document.getElementById("adminActionMessage");
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function setProductMessage(text, isError = false) {
  const node = document.getElementById("adminProductMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function setLoginMessage(text, isError = false) {
  const node = document.getElementById("adminLoginMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function setCouponMessage(text, isError = false) {
  const node = document.getElementById("adminCouponMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function setSlideMessage(text, isError = false) {
  const node = document.getElementById("adminSlideMessage");
  if (!node) return;
  node.textContent = text;
  node.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function wireAdminTabs() {
  const tabs = [...document.querySelectorAll("[data-admin-tab]")];
  const panels = [...document.querySelectorAll("[data-admin-panel]")];
  if (!tabs.length || !panels.length) return;

  const activate = (key) => {
    panels.forEach((panel) => {
      panel.style.display = panel.dataset.adminPanel === key ? "block" : "none";
    });
    tabs.forEach((tab) => {
      tab.style.background = tab.dataset.adminTab === key ? "#d4af37" : "#ffffff";
      tab.style.color = tab.dataset.adminTab === key ? "#ffffff" : "#2c2c2c";
      tab.style.borderColor = tab.dataset.adminTab === key ? "#d4af37" : "#e0e0e0";
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab.dataset.adminTab));
  });

  activate("orders");
}

function showDashboard() {
  const loginSection = document.getElementById("adminLoginSection");
  const content = document.getElementById("adminContent");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (loginSection) loginSection.style.display = "none";
  if (content) content.style.display = "grid";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
}

function showLogin() {
  const loginSection = document.getElementById("adminLoginSection");
  const content = document.getElementById("adminContent");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (loginSection) loginSection.style.display = "block";
  if (content) content.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "none";
}

function deriveOrderMetrics(orders) {
  const byProduct = new Map();
  let delivering = 0;
  let returns = 0;

  orders.forEach((order) => {
    if (["Shipped", "Out for Delivery", "Delivering"].includes(order.orderStatus)) delivering += 1;
    if (["Returned", "Return Requested", "Refund Requested"].includes(order.orderStatus)) returns += 1;

    (order.items || []).forEach((item) => {
      byProduct.set(item.title, (byProduct.get(item.title) || 0) + Number(item.qty || 1));
    });
  });

  const mostOrdered = [...byProduct.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    mostOrdered: mostOrdered ? `${mostOrdered[0]} (${mostOrdered[1]})` : "-",
    delivering,
    returns
  };
}

function parseCsvList(value, fallback) {
  const list = String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function clearCatalogForm() {
  [
    "adminProductId",
    "adminProductTitle",
    "adminProductCategory",
    "adminProductCategoryId",
    "adminProductSubcategory",
    "adminProductMaterial",
    "adminProductCustomizationType",
    "adminProductColors",
    "adminProductPrice",
    "adminProductPriceMax",
    "adminProductCustomPrice",
    "adminProductPrintWidth",
    "adminProductPrintHeight",
    "adminProductBestSeller",
    "adminProductFeatured",
    "adminProductDiscountType",
    "adminProductDiscountValue",
    "adminProductDiscountActive",
    "adminProductDescription",
    "adminProductPhoto"
  ].forEach((id) => {
    const node = document.getElementById(id);
    if (!node) return;
    if (node.tagName === "SELECT") {
      node.selectedIndex = 0;
    } else {
      node.value = "";
    }
  });
  const categoryPreset = document.getElementById("adminProductCategoryPreset");
  const subcategoryPreset = document.getElementById("adminProductSubcategoryPreset");
  if (categoryPreset) categoryPreset.value = "";
  if (subcategoryPreset) subcategoryPreset.innerHTML = '<option value="">Select subcategory preset</option>';
  uploadedImageData = "";
}

function fillCatalogForm(product) {
  document.getElementById("adminProductId").value = product.id || "";
  document.getElementById("adminProductTitle").value = product.title || "";
  document.getElementById("adminProductCategory").value = product.category || "";
  document.getElementById("adminProductCategoryId").value = product.categoryId || "custom";
  document.getElementById("adminProductSubcategory").value = product.subcategory || "";
  document.getElementById("adminProductMaterial").value = product.material || "";
  document.getElementById("adminProductCustomizationType").value = product.customizationType || "ready";
  document.getElementById("adminProductColors").value = (product.customization?.colors || []).join(",");
  document.getElementById("adminProductPrice").value = String(product.basePrice || "");
  document.getElementById("adminProductPriceMax").value = String(product.priceMax || "");
  document.getElementById("adminProductCustomPrice").value = String(product.customBasePrice || 0);
  document.getElementById("adminProductPrintWidth").value = String(product.customizationDimensions?.width || 1200);
  document.getElementById("adminProductPrintHeight").value = String(product.customizationDimensions?.height || 800);
  document.getElementById("adminProductBestSeller").value = product.isBestSeller ? "1" : "0";
  document.getElementById("adminProductFeatured").value = product.isFeatured ? "1" : "0";
  document.getElementById("adminProductDiscountType").value = product.discountType || "none";
  document.getElementById("adminProductDiscountValue").value = String(product.discountValue || 0);
  document.getElementById("adminProductDiscountActive").value = product.discountActive ? "1" : "0";
  document.getElementById("adminProductDescription").value = product.description || "";
  uploadedImageData = product.imageData || "";

  const categoryPreset = document.getElementById("adminProductCategoryPreset");
  const subcategoryPreset = document.getElementById("adminProductSubcategoryPreset");
  const categoryMatch = categories.find((cat) => cat.id === (product.categoryId || ""));
  if (categoryPreset) categoryPreset.value = categoryMatch ? categoryMatch.id : "";
  if (subcategoryPreset) {
    const options = categoryMatch
      ? categoryMatch.subcategories.map((sub) => `<option value="${sub}">${sub}</option>`)
      : [];
    subcategoryPreset.innerHTML = ['<option value="">Select subcategory preset</option>', ...options].join("");
    if (product.subcategory && options.length) subcategoryPreset.value = product.subcategory;
  }
}

function collectCatalogPayload() {
  const title = document.getElementById("adminProductTitle").value.trim();
  const category = document.getElementById("adminProductCategory").value.trim();
  const categoryId = document.getElementById("adminProductCategoryId").value.trim() || "custom";
  const subcategory = document.getElementById("adminProductSubcategory").value.trim() || category;
  const material = document.getElementById("adminProductMaterial").value.trim() || "Acrylic";
  const customizationType = document.getElementById("adminProductCustomizationType").value.trim() || "ready";
  const basePrice = Number(document.getElementById("adminProductPrice").value);
  const priceMax = Number(document.getElementById("adminProductPriceMax").value || basePrice);
  const customBasePrice = Number(document.getElementById("adminProductCustomPrice").value || 0);
  const printWidth = Number(document.getElementById("adminProductPrintWidth").value || 1200);
  const printHeight = Number(document.getElementById("adminProductPrintHeight").value || 800);
  const isBestSeller = document.getElementById("adminProductBestSeller").value === "1";
  const isFeatured = document.getElementById("adminProductFeatured").value === "1";
  const discountType = document.getElementById("adminProductDiscountType").value || "none";
  const discountValue = Number(document.getElementById("adminProductDiscountValue").value || 0);
  const discountActive = document.getElementById("adminProductDiscountActive").value === "1";
  const description = document.getElementById("adminProductDescription").value.trim() || "Custom catalog product.";

  if (!title || !category || !Number.isFinite(basePrice) || basePrice <= 0) {
    return { error: "Enter valid title, category, and base price." };
  }

  const colors = parseCsvList(document.getElementById("adminProductColors").value, ["Black", "White"]);

  return {
    payload: {
      title,
      category,
      categoryId,
      subcategory,
      material,
      customizationType,
      basePrice,
      priceMax,
      customBasePrice,
      customizationDimensions: {
        width: Number.isFinite(printWidth) && printWidth > 0 ? printWidth : 1200,
        height: Number.isFinite(printHeight) && printHeight > 0 ? printHeight : 800
      },
      isBestSeller,
      isFeatured,
      discountType,
      discountValue,
      discountActive,
      description,
      imageData: uploadedImageData || null,
      customization: {
        allowText: true,
        allowPhoto: true,
        allowLogo: true,
        colors,
        sizes: ["S", "M", "L", "XL"],
        materials: ["Acrylic", "Wood", "Metal", "Fabric", "Ceramic", "Leather"]
      }
    }
  };
}

function renderCatalogRows() {
  const rows = document.getElementById("adminCustomProductRows");
  rows.innerHTML = currentProducts.length
    ? currentProducts
        .map(
          (item) => `
          <tr>
            <td>${item.id}</td>
            <td>${item.title}</td>
            <td>${item.category}</td>
            <td>${item.subcategory || "-"}</td>
            <td>${currency(Number(item.basePrice || 0))}</td>
            <td>
              <button class="btn btn-secondary" data-edit-id="${item.id}" type="button">Edit</button>
              <button class="btn btn-secondary" data-delete-id="${item.id}" type="button">Remove</button>
            </td>
          </tr>
        `
        )
        .join("")
    : "<tr><td colspan='6'>No products found.</td></tr>";

  rows.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const product = currentProducts.find((p) => p.id === btn.dataset.editId);
      if (!product) return;
      fillCatalogForm(product);
      setProductMessage(`Loaded ${product.id} for editing.`);
    });
  });

  rows.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteAdminProduct(btn.dataset.deleteId);
        setProductMessage("Product removed.");
        await loadCatalog();
      } catch (error) {
        setProductMessage(error.message || "Could not remove product.", true);
      }
    });
  });
}

async function loadCatalog() {
  try {
    currentProducts = await fetchAdminProducts();
    renderCatalogRows();
    document.getElementById("adminProducts").textContent = String(currentProducts.length);
  } catch {
    currentProducts = [];
    renderCatalogRows();
    setProductMessage("Could not load catalog list.", true);
  }
}

function renderRequests(corporate, customization) {
  const corporateRows = document.getElementById("adminCorporateRequestRows");
  const customizationRows = document.getElementById("adminCustomizationRequestRows");
  if (corporateRows) {
    corporateRows.innerHTML = corporate.length
      ? corporate
          .slice(0, 50)
          .map(
            (item) => `
            <tr>
              <td>${item.id || "-"}</td>
              <td>${item.company || "-"}</td>
              <td>${item.name || "-"}</td>
              <td>${item.email || "-"}</td>
              <td>${item.phone || "-"}</td>
              <td>${item.quantity || "-"}</td>
              <td>${item.requirement || "-"}</td>
            </tr>
          `
          )
          .join("")
      : "<tr><td colspan='7'>No corporate bulk requests yet.</td></tr>";
  }
  if (customizationRows) {
    customizationRows.innerHTML = customization.length
      ? customization
          .slice(0, 50)
          .map(
            (item) => `
            <tr>
              <td>${item.id || "-"}</td>
              <td>${item.name || "-"}</td>
              <td>${item.phone || "-"}<br/>${item.email || "-"}</td>
              <td>${item.productName || "-"}</td>
              <td>${item.customizationNeed || "-"}</td>
              <td>${item.quantity || "-"}</td>
              <td>${new Date(item.createdAt || Date.now()).toLocaleDateString()}</td>
            </tr>
          `
          )
          .join("")
      : "<tr><td colspan='7'>No customization requests yet.</td></tr>";
  }
}

function collectCouponPayload() {
  const code = document.getElementById("adminCouponCode")?.value.trim().toUpperCase();
  const type = document.getElementById("adminCouponType")?.value || "percent";
  const value = Number(document.getElementById("adminCouponValue")?.value || 0);
  const minOrder = Number(document.getElementById("adminCouponMinOrder")?.value || 0);
  const active = (document.getElementById("adminCouponActive")?.value || "1") === "1";
  if (!code || !Number.isFinite(value) || value <= 0) return { error: "Enter valid coupon code and value." };
  return { payload: { code, type, value, minOrder, active } };
}

function fillCouponForm(coupon) {
  document.getElementById("adminCouponCode").value = coupon.code || "";
  document.getElementById("adminCouponType").value = coupon.type || "percent";
  document.getElementById("adminCouponValue").value = String(coupon.value || 0);
  document.getElementById("adminCouponMinOrder").value = String(coupon.minOrder || 0);
  document.getElementById("adminCouponActive").value = coupon.active ? "1" : "0";
}

function renderCouponRows() {
  const rows = document.getElementById("adminCouponRows");
  if (!rows) return;
  rows.innerHTML = currentCoupons.length
    ? currentCoupons
        .map(
          (coupon) => `
          <tr>
            <td>${coupon.code}</td>
            <td>${coupon.type === "percent" ? "Percent" : "Flat"}</td>
            <td>${coupon.type === "percent" ? `${coupon.value}%` : currency(coupon.value)}</td>
            <td>${currency(coupon.minOrder || 0)}</td>
            <td>${coupon.active ? "Yes" : "No"}</td>
            <td>
              <button class="btn btn-secondary" type="button" data-coupon-edit="${coupon.code}">Edit</button>
              <button class="btn btn-secondary" type="button" data-coupon-delete="${coupon.code}">Delete</button>
            </td>
          </tr>
        `
        )
        .join("")
    : "<tr><td colspan='6'>No coupons created.</td></tr>";

  rows.querySelectorAll("[data-coupon-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const coupon = currentCoupons.find((item) => item.code === btn.dataset.couponEdit);
      if (!coupon) return;
      fillCouponForm(coupon);
      setCouponMessage(`Loaded ${coupon.code} for editing.`);
    });
  });
  rows.querySelectorAll("[data-coupon-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteAdminCoupon(btn.dataset.couponDelete);
        setCouponMessage(`Coupon ${btn.dataset.couponDelete} deleted.`);
        await loadAdminTables();
      } catch (error) {
        setCouponMessage(error.message || "Could not delete coupon.", true);
      }
    });
  });
}

function collectSlidePayload() {
  const title = document.getElementById("adminSlideTitle")?.value.trim() || "Festival Offer";
  const tag = document.getElementById("adminSlideTag")?.value.trim() || "New";
  const link = document.getElementById("adminSlideLink")?.value.trim() || "";
  const order = Number(document.getElementById("adminSlideOrder")?.value || 0);
  const active = (document.getElementById("adminSlideActive")?.value || "1") === "1";
  return {
    payload: {
      title,
      tag,
      link,
      order,
      active,
      imageData: uploadedSlideImageData || undefined
    }
  };
}

function fillSlideForm(slide) {
  document.getElementById("adminSlideId").value = slide.id || "";
  document.getElementById("adminSlideTag").value = slide.tag || "";
  document.getElementById("adminSlideTitle").value = slide.title || "";
  document.getElementById("adminSlideLink").value = slide.link || "";
  document.getElementById("adminSlideOrder").value = String(slide.order || 0);
  document.getElementById("adminSlideActive").value = slide.active ? "1" : "0";
  uploadedSlideImageData = slide.imageData || "";
}

function renderSlideRows() {
  const rows = document.getElementById("adminSlideRows");
  if (!rows) return;
  rows.innerHTML = currentSlides.length
    ? currentSlides
        .map(
          (slide) => `
          <tr>
            <td>${slide.id}</td>
            <td>${slide.imageData ? `<img src="${slide.imageData}" alt="${slide.title}" style="width:72px;height:50px;object-fit:cover;border-radius:8px" />` : "-"}</td>
            <td>${slide.tag || "-"}</td>
            <td>${slide.title || "-"}</td>
            <td>${slide.order || 0}</td>
            <td>${slide.active ? "Yes" : "No"}</td>
            <td>
              <button class="btn btn-secondary" type="button" data-slide-edit="${slide.id}">Edit</button>
              <button class="btn btn-secondary" type="button" data-slide-delete="${slide.id}">Delete</button>
            </td>
          </tr>
        `
        )
        .join("")
    : "<tr><td colspan='7'>No slider photos yet.</td></tr>";

  rows.querySelectorAll("[data-slide-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const slide = currentSlides.find((item) => item.id === btn.dataset.slideEdit);
      if (!slide) return;
      fillSlideForm(slide);
      setSlideMessage(`Loaded ${slide.id} for editing.`);
    });
  });

  rows.querySelectorAll("[data-slide-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await deleteAdminPromoSlide(btn.dataset.slideDelete);
        setSlideMessage("Slider photo removed.");
        await loadAdminTables();
      } catch (error) {
        setSlideMessage(error.message || "Could not remove slider photo.", true);
      }
    });
  });
}

async function loadAdminTables() {
  try {
    const [corporate, customization, coupons, slides] = await Promise.all([
      fetchAdminCorporateRequests(),
      fetchAdminCustomizationRequests(),
      fetchAdminCoupons(),
      fetchAdminPromoSlides()
    ]);
    currentCoupons = coupons;
    currentSlides = slides;
    renderRequests(corporate, customization);
    renderCouponRows();
    renderSlideRows();
  } catch {
    renderRequests([], []);
    currentCoupons = [];
    currentSlides = [];
    renderCouponRows();
    renderSlideRows();
  }
}

function wireCatalogManager() {
  const addBtn = document.getElementById("adminAddProductBtn");
  const updateBtn = document.getElementById("adminUpdateProductBtn");
  const deleteBtn = document.getElementById("adminDeleteProductBtn");
  const imageInput = document.getElementById("adminProductPhoto");

  imageInput?.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (!file) {
      uploadedImageData = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadedImageData = String(reader.result || "");
      setProductMessage("Photo attached.");
    };
    reader.readAsDataURL(file);
  });

  addBtn?.addEventListener("click", async () => {
    const { payload, error } = collectCatalogPayload();
    if (error) {
      setProductMessage(error, true);
      return;
    }
    try {
      await createAdminProduct(payload);
      clearCatalogForm();
      setProductMessage("New product added to catalog.");
      await loadCatalog();
    } catch (e) {
      setProductMessage(e.message || "Could not add product.", true);
    }
  });

  updateBtn?.addEventListener("click", async () => {
    const id = document.getElementById("adminProductId").value.trim();
    if (!id) {
      setProductMessage("Enter Product ID to update.", true);
      return;
    }

    const { payload, error } = collectCatalogPayload();
    if (error) {
      setProductMessage(error, true);
      return;
    }

    try {
      await updateAdminProduct(id, payload);
      setProductMessage(`Product ${id} updated.`);
      await loadCatalog();
    } catch (e) {
      setProductMessage(e.message || "Could not update product.", true);
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const id = document.getElementById("adminProductId").value.trim();
    if (!id) {
      setProductMessage("Enter Product ID to remove.", true);
      return;
    }
    try {
      await deleteAdminProduct(id);
      clearCatalogForm();
      setProductMessage(`Product ${id} removed.`);
      await loadCatalog();
    } catch (e) {
      setProductMessage(e.message || "Could not remove product.", true);
    }
  });

  wireCategoryPresets();
  loadCatalog();
}

function wireCouponManager() {
  const addBtn = document.getElementById("adminAddCouponBtn");
  const updateBtn = document.getElementById("adminUpdateCouponBtn");
  const deleteBtn = document.getElementById("adminDeleteCouponBtn");

  addBtn?.addEventListener("click", async () => {
    const { payload, error } = collectCouponPayload();
    if (error) {
      setCouponMessage(error, true);
      return;
    }
    try {
      await createAdminCoupon(payload);
      setCouponMessage(`Coupon ${payload.code} created (${payload.active ? "published" : "draft"}).`);
      await loadAdminTables();
    } catch (e) {
      setCouponMessage(e.message || "Could not create coupon.", true);
    }
  });

  updateBtn?.addEventListener("click", async () => {
    const { payload, error } = collectCouponPayload();
    if (error) {
      setCouponMessage(error, true);
      return;
    }
    try {
      await updateAdminCoupon(payload.code, payload);
      setCouponMessage(`Coupon ${payload.code} updated.`);
      await loadAdminTables();
    } catch (e) {
      setCouponMessage(e.message || "Could not update coupon.", true);
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const code = document.getElementById("adminCouponCode")?.value.trim().toUpperCase();
    if (!code) {
      setCouponMessage("Enter coupon code to delete.", true);
      return;
    }
    try {
      await deleteAdminCoupon(code);
      setCouponMessage(`Coupon ${code} deleted.`);
      await loadAdminTables();
    } catch (e) {
      setCouponMessage(e.message || "Could not delete coupon.", true);
    }
  });
}

function wireSlideManager() {
  const addBtn = document.getElementById("adminAddSlideBtn");
  const updateBtn = document.getElementById("adminUpdateSlideBtn");
  const deleteBtn = document.getElementById("adminDeleteSlideBtn");
  const photoInput = document.getElementById("adminSlidePhoto");

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files?.[0];
    if (!file) {
      uploadedSlideImageData = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      uploadedSlideImageData = String(reader.result || "");
      setSlideMessage("Slider photo attached.");
    };
    reader.readAsDataURL(file);
  });

  addBtn?.addEventListener("click", async () => {
    const { payload } = collectSlidePayload();
    if (!payload.imageData) {
      setSlideMessage("Upload image before adding slide.", true);
      return;
    }
    try {
      await createAdminPromoSlide(payload);
      setSlideMessage("Slider photo added.");
      await loadAdminTables();
    } catch (e) {
      setSlideMessage(e.message || "Could not add slide.", true);
    }
  });

  updateBtn?.addEventListener("click", async () => {
    const id = document.getElementById("adminSlideId")?.value.trim();
    if (!id) {
      setSlideMessage("Enter Slide ID to update.", true);
      return;
    }
    const { payload } = collectSlidePayload();
    try {
      await updateAdminPromoSlide(id, payload);
      setSlideMessage(`Slide ${id} updated.`);
      await loadAdminTables();
    } catch (e) {
      setSlideMessage(e.message || "Could not update slide.", true);
    }
  });

  deleteBtn?.addEventListener("click", async () => {
    const id = document.getElementById("adminSlideId")?.value.trim();
    if (!id) {
      setSlideMessage("Enter Slide ID to delete.", true);
      return;
    }
    try {
      await deleteAdminPromoSlide(id);
      setSlideMessage(`Slide ${id} deleted.`);
      await loadAdminTables();
    } catch (e) {
      setSlideMessage(e.message || "Could not delete slide.", true);
    }
  });
}

async function initAdmin() {
  let orders = [];
  let summary = { pendingShipments: 0, revenue: 0 };

  try {
    orders = await fetchOrders();
    summary = await fetchAdminSummary();
  } catch {
    setActionMessage("Backend not reachable. Showing limited data.", true);
  }

  const metrics = deriveOrderMetrics(orders);

  document.getElementById("adminOrders").textContent = String(orders.length);
  document.getElementById("adminPending").textContent = String(summary.pendingShipments || 0);
  document.getElementById("adminRevenue").textContent = currency(summary.revenue || 0);
  document.getElementById("adminMostOrdered").textContent = metrics.mostOrdered;
  document.getElementById("adminDelivering").textContent = String(metrics.delivering);
  document.getElementById("adminReturns").textContent = String(metrics.returns);

  document.getElementById("adminOrderRows").innerHTML = orders.length
    ? orders
        .slice(0, 20)
        .map((order) => {
          const itemsBought = (order.items || []).map((item) => `${item.title} x${item.qty || 1}`).join(", ") || "N/A";
          const deliveryAddress = order.addressDetail
            ? `${order.addressDetail.addressLine1 || ""}, ${order.addressDetail.addressLine2 || ""}, ${order.addressDetail.city || ""}, ${order.addressDetail.state || ""}, ${order.addressDetail.postalCode || ""}, ${order.addressDetail.country || ""}`
            : order.address || "N/A";
          const sharedLocation = order.location
            ? typeof order.location === "object"
              ? JSON.stringify(order.location)
              : String(order.location)
            : order.addressDetail?.locationText || "Not shared";

          return `
          <tr>
            <td>${order.orderId}</td>
            <td>${order.customer}</td>
            <td>${itemsBought}</td>
            <td>${deliveryAddress}</td>
            <td>${sharedLocation}</td>
            <td>${order.orderStatus}</td>
            <td>${order.paymentStatus}</td>
            <td>${order.paymentMethod || "N/A"}</td>
            <td>${currency(order.total)}</td>
          </tr>
        `;
        })
        .join("")
    : "<tr><td colspan='9'>No orders yet.</td></tr>";

  const returnOrders = orders.filter((order) =>
    ["Returned", "Return Requested", "Refund Requested"].includes(String(order.orderStatus || ""))
  );
  document.getElementById("adminReturnRows").innerHTML = returnOrders.length
    ? returnOrders
        .map((order) => {
          const deliveryAddress = order.addressDetail
            ? `${order.addressDetail.addressLine1 || ""}, ${order.addressDetail.addressLine2 || ""}, ${order.addressDetail.city || ""}, ${order.addressDetail.state || ""}, ${order.addressDetail.postalCode || ""}, ${order.addressDetail.country || ""}`
            : order.address || "N/A";
          const sharedLocation = order.location
            ? typeof order.location === "object"
              ? JSON.stringify(order.location)
              : String(order.location)
            : order.addressDetail?.locationText || "Not shared";
          return `
            <tr>
              <td>${order.orderId}</td>
              <td>${currency(order.total || 0)}</td>
              <td>${deliveryAddress}</td>
              <td>${sharedLocation}</td>
              <td>${order.orderStatus || "-"}</td>
            </tr>
          `;
        })
        .join("")
    : "<tr><td colspan='5'>No return/refund orders.</td></tr>";

  let notifications = [];
  try {
    notifications = await fetchAdminNotifications();
  } catch {
    notifications = [];
  }

  if (!notifications.length) notifications = [{ message: "No new notifications." }];

  document.getElementById("adminNotifications").innerHTML = notifications
    .map((note) => `<div class="notice" style="margin-bottom:0.5rem">${note.message}</div>`)
    .join("");

  const firstProcessButton = document.getElementById("markFirstShipped");
  if (firstProcessButton && orders[0]) {
    firstProcessButton.onclick = async () => {
      try {
        await patchOrderStatus(orders[0].orderId, { orderStatus: "Shipped", shippingStatus: "In Transit" });
        setActionMessage(`Updated ${orders[0].orderId} to Shipped.`);
        initAdmin();
      } catch {
        setActionMessage("Could not update order status.", true);
      }
    };
  }

  await loadAdminTables();
}

function wireAdminAuth() {
  const form = document.getElementById("adminLoginForm");
  const usernameInput = document.getElementById("adminUsernameInput");
  const input = document.getElementById("adminPasswordInput");
  const logoutBtn = document.getElementById("adminLogoutBtn");

  if (localStorage.getItem(ADMIN_SESSION_KEY) === "1") {
    showDashboard();
    wireAdminTabs();
    initAdmin();
    wireCatalogManager();
    wireCouponManager();
    wireSlideManager();
  } else {
    showLogin();
  }

  if (form && input && usernameInput) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = usernameInput.value.trim().toLowerCase();
      const value = input.value;
      if (username === ADMIN_USERNAME && value === ADMIN_PASSWORD) {
        localStorage.setItem(ADMIN_SESSION_KEY, "1");
        setLoginMessage("Login successful.");
        showDashboard();
        wireAdminTabs();
        initAdmin();
        wireCatalogManager();
        wireCouponManager();
        wireSlideManager();
      } else {
        setLoginMessage("Incorrect username or password.", true);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(ADMIN_SESSION_KEY);
      showLogin();
      setLoginMessage("Logged out.");
    });
  }
}

mountFooter();
wireAdminAuth();
