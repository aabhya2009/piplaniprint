import { categories } from "./data.js";
import { fetchCatalogProducts } from "./api.js";
import { mountFooter, productCard, updateHeaderCounts, wireMobileMenu } from "./common.js";

const state = {
  q: "",
  minPrice: 100,
  maxPrice: 100000,
  selectedCategories: new Set(),
  selectedMaterials: new Set(),
  selectedCustomization: new Set(),
  selectedDelivery: new Set(),
  minRating: 0,
  sort: "popular",
  onlyWishlist: false,
  segment: ""
};

let allProducts = [];

const searchInput = document.getElementById("searchInput");
const minPrice = document.getElementById("minPrice");
const maxPrice = document.getElementById("maxPrice");
const minPriceValue = document.getElementById("minPriceValue");
const maxPriceValue = document.getElementById("maxPriceValue");

function uniqueFromList(list, field) {
  return [...new Set(list.map((p) => p[field]).filter(Boolean))].sort();
}

function mountCheckboxes(rootId, values, key) {
  const root = document.getElementById(rootId);
  root.insertAdjacentHTML(
    "beforeend",
    values.map((item) => `<label><input type="checkbox" data-key="${key}" value="${item}"> ${item}</label>`).join("")
  );
}

function fromQuery() {
  const params = new URLSearchParams(window.location.search);
  state.q = params.get("q") || "";
  state.onlyWishlist = params.get("wishlist") === "1";
  state.segment = params.get("segment") || "";
  const category = params.get("category");
  if (category) state.selectedCategories.add(category);
}

function readWishlist() {
  try {
    return JSON.parse(localStorage.getItem("ppl_wishlist") || "[]");
  } catch {
    return [];
  }
}

function applyFilters() {
  let list = [...allProducts];
  const wishlist = readWishlist();

  if (state.onlyWishlist) list = list.filter((item) => wishlist.includes(item.id));

  list = list.filter((item) => Number(item.basePrice) >= state.minPrice && Number(item.basePrice) <= state.maxPrice);

  if (state.q) {
    const query = state.q.toLowerCase();
    list = list.filter((item) => `${item.title} ${item.category} ${item.subcategory} ${item.material}`.toLowerCase().includes(query));
  }

  if (state.selectedCategories.size) list = list.filter((item) => state.selectedCategories.has(item.categoryId));
  if (state.selectedMaterials.size) list = list.filter((item) => state.selectedMaterials.has(item.material));
  if (state.selectedCustomization.size) list = list.filter((item) => state.selectedCustomization.has(item.customizationType));
  if (state.selectedDelivery.size) list = list.filter((item) => state.selectedDelivery.has(item.deliverySpeed));
  list = list.filter((item) => Number(item.rating || 0) >= state.minRating);

  switch (state.sort) {
    case "price-low":
      list.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
      break;
    case "price-high":
      list.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
      break;
    case "rated":
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      break;
    case "newest":
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    default:
      list.sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0));
  }

  document.getElementById("catalogGrid").innerHTML = list.map(productCard).join("");
  document.getElementById("catalogCount").textContent = `${list.length} results from ${allProducts.length} products`;
}

function bind() {
  document.getElementById("catalogSearch").addEventListener("submit", (event) => {
    event.preventDefault();
    state.q = searchInput.value.trim();
    applyFilters();
  });

  searchInput.value = state.q;

  [minPrice, maxPrice].forEach((input) => {
    input.addEventListener("input", () => {
      const low = Number(minPrice.value);
      const high = Number(maxPrice.value);
      state.minPrice = Math.min(low, high);
      state.maxPrice = Math.max(low, high);
      minPriceValue.textContent = state.minPrice;
      maxPriceValue.textContent = state.maxPrice;
      applyFilters();
    });
  });

  document.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.addEventListener("change", () => {
      const setMap = {
        category: state.selectedCategories,
        material: state.selectedMaterials,
        customization: state.selectedCustomization,
        delivery: state.selectedDelivery
      };
      const set = setMap[box.dataset.key];
      if (box.checked) set.add(box.value);
      else set.delete(box.value);
      applyFilters();
    });
  });

  document.querySelectorAll("input[name='rating']").forEach((radio) => {
    radio.addEventListener("change", () => {
      state.minRating = Number(radio.value);
      applyFilters();
    });
  });

  document.getElementById("sortSelect").addEventListener("change", (event) => {
    state.sort = event.target.value;
    applyFilters();
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    window.location.href = "catalog.html";
  });
}

async function init() {
  fromQuery();

  try {
    const first = await fetchCatalogProducts({ limit: 60, page: 1, sort: "popular" });
    const totalPages = Number(first.pagination?.totalPages || 1);
    allProducts = [...(first.products || [])];
    if (totalPages > 1) {
      const pages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => fetchCatalogProducts({ limit: 60, page: i + 2, sort: "popular" }))
      );
      pages.forEach((pageData) => {
        allProducts.push(...(pageData.products || []));
      });
    }
  } catch {
    allProducts = [];
  }

  const catRoot = document.getElementById("categoryFilters");
  catRoot.innerHTML += categories
    .map((c) => `<label><input type="checkbox" data-key="category" value="${c.id}"> ${c.name}</label>`)
    .join("");

  mountCheckboxes("materialFilters", uniqueFromList(allProducts, "material"), "material");
  mountCheckboxes("customizationFilters", uniqueFromList(allProducts, "customizationType"), "customization");
  mountCheckboxes("deliveryFilters", uniqueFromList(allProducts, "deliverySpeed"), "delivery");

  if (state.selectedCategories.size) {
    document.querySelectorAll("input[data-key='category']").forEach((input) => {
      input.checked = state.selectedCategories.has(input.value);
    });
  }

  minPriceValue.textContent = String(state.minPrice);
  maxPriceValue.textContent = String(state.maxPrice);

  bind();
  applyFilters();
  mountFooter();
  updateHeaderCounts();
  wireMobileMenu();
}

init();
