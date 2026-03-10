export const categories = [
  {
    id: "phone-electronics",
    name: "Phone and Electronics Accessories",
    subcategories: ["Phone Cases", "Chargers", "Skins", "Earbud Covers"]
  },
  {
    id: "corporate-office",
    name: "Corporate and Office Products",
    subcategories: ["Notebooks", "Planners", "Mugs", "Desk Sets"]
  },
  {
    id: "home-decor",
    name: "Home Decor",
    subcategories: ["Photo Frames", "Wall Art", "Cushions", "Lighting"]
  },
  {
    id: "kitchen",
    name: "Kitchen Products",
    subcategories: ["Bottle", "Jars", "Coasters", "Aprons"]
  },
  {
    id: "fashion",
    name: "Fashion Accessories",
    subcategories: ["Totes", "Wallets", "Caps", "Scarves"]
  },
  {
    id: "car-bike",
    name: "Car and Bike Accessories",
    subcategories: ["Car Tags", "Seat Covers", "Helmet Skins", "Keychains"]
  },
  {
    id: "religious",
    name: "Religious Products",
    subcategories: ["Pooja Kits", "Plaques", "Idol Bases", "Prayer Cards"]
  },
  {
    id: "kids",
    name: "Kids Products",
    subcategories: ["School Kits", "Sippers", "Name Stickers", "Puzzles"]
  },
  {
    id: "promotional",
    name: "Promotional Products",
    subcategories: ["Pens", "Lanyards", "Badges", "Gift Kits"]
  },
  {
    id: "industrial",
    name: "Industrial Printing Products",
    subcategories: ["Labels", "Safety Signs", "Panels", "Barcode Tags"]
  },
  {
    id: "festival",
    name: "Festival Products",
    subcategories: ["Diwali Gifts", "Rakhi Hampers", "Christmas Decor", "New Year Kits"]
  },
  {
    id: "luxury",
    name: "Luxury and Premium Products",
    subcategories: ["Leather Sets", "Metal Cards", "Premium Boxes", "Executive Gifts"]
  }
];

const materials = ["Acrylic", "Wood", "Metal", "Fabric", "Ceramic", "Leather", "Glass", "PVC"];
const customizationTypes = ["ready", "name", "photo", "logo"];
const deliverySpeeds = ["Standard", "Express", "Priority"];
const phoneCaseDesigns = ["Matte Black", "Carbon Black", "Midnight Black", "Customize Your Own"];

function createProduct(category, indexInCategory, globalIndex) {
  const sub = category.subcategories[(indexInCategory - 1) % category.subcategories.length];
  const basePrice = 199 + (globalIndex % 10) * 120 + indexInCategory * 15;
  const rating = Number((3.6 + (globalIndex % 14) * 0.1).toFixed(1));
  const reviews = 18 + (globalIndex % 120);
  const isPhoneCaseSkin =
    category.id === "phone-electronics" && (sub === "Phone Cases" || sub === "Skins");
  const designName = isPhoneCaseSkin
    ? phoneCaseDesigns[(indexInCategory - 1) % phoneCaseDesigns.length]
    : "";
  const title = isPhoneCaseSkin
    ? `${sub} - ${designName}`
    : sub;
  const visualOptions = isPhoneCaseSkin
    ? [
        { name: "Matte Black", tone: "black" },
        { name: "Gloss Black", tone: "black" },
        { name: "Textured Black", tone: "black" },
        { name: "Customize Your Own", tone: "custom" }
      ]
    : [
        { name: "Classic", tone: "light" },
        { name: "Premium", tone: "neutral" },
        { name: "Signature", tone: "dark" },
        { name: "Customize Your Own", tone: "custom" }
      ];

  return {
    id: `PPL-${String(globalIndex + 1).padStart(4, "0")}`,
    slug: `piplani-printlab-${category.id}-${indexInCategory + 1}`,
    title,
    category: category.name,
    categoryId: category.id,
    subcategory: sub,
    description:
      "Premium printable product with precise finish, vivid colors, and durable materials. Suitable for gifting, branding, and personal use.",
    basePrice,
    priceMax: basePrice + 500,
    rating,
    reviews,
    material: materials[(globalIndex + 2) % materials.length],
    customizationType: customizationTypes[globalIndex % customizationTypes.length],
    deliverySpeed: deliverySpeeds[globalIndex % deliverySpeeds.length],
    popularity: 1000 - globalIndex * 3,
    isFeatured: globalIndex % 5 === 0,
    isBestSeller: globalIndex % 4 === 0,
    isFestival: category.id === "festival" || globalIndex % 11 === 0,
    isCorporate: category.id === "corporate-office" || category.id === "promotional",
    imagePlaceholder: isPhoneCaseSkin
      ? `Black Design Preview (${designName})`
      : "Image Placeholder (Upload Product Photo)",
    imageStyle: isPhoneCaseSkin ? "dark" : "default",
    designOptions: isPhoneCaseSkin ? phoneCaseDesigns : [],
    visualOptions,
    customization: {
      allowText: true,
      allowPhoto: isPhoneCaseSkin ? designName === "Customize Your Own" : true,
      allowLogo: true,
      colors: ["Black", "White", "Navy", "Crimson", "Champagne"],
      sizes: ["S", "M", "L", "XL"],
      materials: materials.slice(0, 6)
    },
    deliveryInfo: "Ships in 2-5 business days in India. International shipping available with additional charges.",
    tags: [category.name, sub, "Customizable", "Premium"]
  };
}

export function buildCatalog(targetCount = 192) {
  const products = [];
  let globalIndex = 0;

  while (products.length < targetCount) {
    for (const category of categories) {
      if (products.length >= targetCount) break;
      const indexInCategory = Math.floor(products.length / categories.length) + 1;
      products.push(createProduct(category, indexInCategory, globalIndex));
      globalIndex += 1;
    }
  }

  return products;
}

export const products = buildCatalog(192);

export const paymentMethods = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "International Card"
];

export const couriers = [
  { name: "Blue Dart", url: "https://www.bluedart.com/tracking" },
  { name: "Delhivery", url: "https://www.delhivery.com/tracking" },
  { name: "DTDC", url: "https://www.dtdc.in/trace.asp" }
];
