import { paymentMethods } from "./data.js";
import { currency, mountFooter, updateHeaderCounts } from "./common.js";
import { addOrder, addRewards, getCart, removeFromCart, saveCart } from "./store.js";
import { createOrder, getAuthUser, sendOrderOtp, updateProfile, validateCoupon, verifyOrderOtp } from "./api.js";

const cartSummary = document.getElementById("cartSummary");
const paymentMethod = document.getElementById("paymentMethod");
const paymentFields = document.getElementById("paymentFields");
const country = document.getElementById("country");
const shippingNotice = document.getElementById("shippingNotice");
const checkoutMessage = document.getElementById("checkoutMessage");
const couponMessage = document.getElementById("couponMessage");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const otpMessage = document.getElementById("otpMessage");

const couponState = {
  code: "",
  discount: 0
};

const otpState = {
  verified: false,
  channel: "phone"
};

function showMessage(text, isError = false) {
  checkoutMessage.textContent = text;
  checkoutMessage.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function showCouponMessage(text, isError = false) {
  couponMessage.textContent = text;
  couponMessage.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function showOtpMessage(text, isError = false) {
  otpMessage.textContent = text;
  otpMessage.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function getAddressDetail() {
  return {
    fullName: document.getElementById("fullName").value.trim(),
    addressLine1: document.getElementById("address1").value.trim(),
    addressLine2: document.getElementById("address2").value.trim(),
    city: document.getElementById("city").value.trim(),
    state: document.getElementById("state").value.trim(),
    postalCode: document.getElementById("postal").value.trim(),
    country: document.getElementById("country").value.trim(),
    locationText: document.getElementById("locationText").value.trim()
  };
}

function required(value) {
  return String(value || "").trim().length > 0;
}

function loadUserDefaults() {
  const user = getAuthUser();
  const saved = user ? JSON.parse(localStorage.getItem(`ppl_last_address_${user.email}`) || "null") : null;
  if (user) {
    document.getElementById("fullName").value = user.name || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("phone").value = user.phone || "";
  }
  if (saved) {
    document.getElementById("address1").value = saved.addressLine1 || "";
    document.getElementById("address2").value = saved.addressLine2 || "";
    document.getElementById("city").value = saved.city || "";
    document.getElementById("state").value = saved.state || "";
    document.getElementById("postal").value = saved.postalCode || "";
    document.getElementById("country").value = saved.country || "India";
    document.getElementById("locationText").value = saved.locationText || "";
  }
  otpState.verified = false;
  showOtpMessage("Verify OTP before placing order.");
}

function requireLoginForCheckout() {
  const user = getAuthUser();
  if (user) return true;
  showMessage("Login is required before placing order. Redirecting to login page...", true);
  if (placeOrderBtn) placeOrderBtn.disabled = true;
  setTimeout(() => {
    window.location.href = "account.html";
  }, 900);
  return false;
}

function getOtpContact() {
  return {
    name: document.getElementById("fullName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim()
  };
}

function setPaymentOptions(total) {
  const methods = [...paymentMethods];
  if (total <= 1200) methods.push("Cash on Delivery (COD)");

  const prev = paymentMethod.value;
  paymentMethod.innerHTML = methods.map((method) => `<option>${method}</option>`).join("");
  if (methods.includes(prev)) paymentMethod.value = prev;

  if (total > 1200 && prev === "Cash on Delivery (COD)") {
    showMessage("COD is available only for orders up to ₹1200.", true);
  }

  renderPaymentFields();
}

function renderPaymentFields() {
  const selected = paymentMethod.value;
  if (selected === "UPI") {
    paymentFields.innerHTML = `
      <div class="option-grid">
        <label><span class="label">UPI ID</span><input type="text" id="payUpiId" placeholder="name@bank" /></label>
        <label><span class="label">UPI App</span>
          <select id="payUpiApp" class="field">
            <option>Google Pay</option>
            <option>PhonePe</option>
            <option>Paytm</option>
            <option>BHIM</option>
          </select>
        </label>
      </div>
    `;
    return;
  }

  if (["Credit Card", "Debit Card", "International Card"].includes(selected)) {
    paymentFields.innerHTML = `
      <div class="option-grid">
        <label><span class="label">Card Number</span><input type="text" id="payCardNumber" placeholder="1234 5678 9012 3456" /></label>
        <label><span class="label">Card Holder</span><input type="text" id="payCardHolder" placeholder="Name on card" /></label>
        <label><span class="label">Expiry (MM/YY)</span><input type="text" id="payCardExpiry" placeholder="MM/YY" /></label>
        <label><span class="label">CVV</span><input type="text" id="payCardCvv" placeholder="123" /></label>
      </div>
    `;
    return;
  }

  if (selected === "Net Banking") {
    paymentFields.innerHTML = `
      <div class="option-grid">
        <label><span class="label">Bank</span>
          <select id="payBankName" class="field">
            <option>State Bank of India</option>
            <option>HDFC Bank</option>
            <option>ICICI Bank</option>
            <option>Axis Bank</option>
            <option>Kotak Mahindra Bank</option>
          </select>
        </label>
        <label><span class="label">Account Holder Name</span><input type="text" id="payBankHolder" placeholder="Account holder name" /></label>
      </div>
    `;
    return;
  }

  paymentFields.innerHTML = `<p class="hint">Cash on Delivery will be collected at delivery.</p>`;
}

function validatePaymentDetails(method) {
  if (method === "Cash on Delivery (COD)") {
    return { ok: true, reference: "COD" };
  }

  if (method === "UPI") {
    const upi = document.getElementById("payUpiId")?.value.trim();
    const app = document.getElementById("payUpiApp")?.value.trim();
    if (!required(upi)) return { ok: false, error: "Please enter UPI ID." };
    return { ok: true, reference: `UPI-${app}-${Date.now()}` };
  }

  if (["Credit Card", "Debit Card", "International Card"].includes(method)) {
    const cardNo = (document.getElementById("payCardNumber")?.value || "").replace(/\s+/g, "");
    const holder = document.getElementById("payCardHolder")?.value.trim();
    const expiry = document.getElementById("payCardExpiry")?.value.trim();
    const cvv = document.getElementById("payCardCvv")?.value.trim();
    if (cardNo.length < 12 || !required(holder) || !required(expiry) || cvv.length < 3) {
      return { ok: false, error: "Please enter valid card details." };
    }
    return { ok: true, reference: `CARD-${cardNo.slice(-4)}-${Date.now()}` };
  }

  if (method === "Net Banking") {
    const bank = document.getElementById("payBankName")?.value.trim();
    const holder = document.getElementById("payBankHolder")?.value.trim();
    if (!required(holder)) return { ok: false, error: "Please enter account holder name for net banking." };
    return { ok: true, reference: `NB-${bank}-${Date.now()}` };
  }

  return { ok: false, error: "Please select a valid payment method." };
}

function renderCart() {
  const cart = getCart();

  if (!cart.length) {
    cartSummary.innerHTML = "<p>Your cart is empty. <a href='catalog.html'>Go to catalog</a></p>";
    document.getElementById("subtotal").textContent = currency(0);
    document.getElementById("shipping").textContent = currency(0);
    document.getElementById("discount").textContent = currency(0);
    document.getElementById("total").textContent = currency(0);
    document.getElementById("rewards").textContent = "0";
    setPaymentOptions(0);
    updateHeaderCounts();
    return;
  }

  cartSummary.innerHTML = cart
    .map(
      (item, index) => `
      <div class="panel" style="margin-bottom:0.6rem">
        <strong>${item.title}</strong>
        <p>Qty: ${item.qty} • ${currency(item.price)}</p>
        <p>Customization: ${item.variant.text || "None"} / ${item.variant.color} / ${item.variant.size} / ${item.variant.material}</p>
        <button class="btn btn-secondary" data-remove="${index}" type="button">Remove</button>
      </div>
    `
    )
    .join("");

  cartSummary.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.remove));
      renderCart();
    });
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isInternational = country.value.trim().toLowerCase() !== "india";
  const shipping = isInternational ? 1800 : 120;
  const discount = Math.min(Number(couponState.discount || 0), subtotal);
  const total = subtotal + shipping - discount;
  const rewards = Math.round(total * 0.02);

  document.getElementById("subtotal").textContent = currency(subtotal);
  document.getElementById("shipping").textContent = currency(shipping);
  document.getElementById("discount").textContent = currency(discount);
  document.getElementById("total").textContent = currency(total);
  document.getElementById("rewards").textContent = String(rewards);

  setPaymentOptions(total);

  shippingNotice.textContent = isInternational
    ? "International shipping charges are applied for this destination."
    : "Domestic shipping applied for India orders.";

  updateHeaderCounts();

  return { cart, subtotal, shipping, discount, total, rewards };
}

country.addEventListener("input", renderCart);
paymentMethod.addEventListener("change", renderPaymentFields);
document.getElementById("otpChannel").addEventListener("change", (event) => {
  otpState.channel = event.target.value;
  otpState.verified = false;
  showOtpMessage("OTP channel changed. Please verify again.");
});

document.getElementById("sendOtpBtn").addEventListener("click", async () => {
  if (!requireLoginForCheckout()) return;
  const contact = getOtpContact();
  const channel = document.getElementById("otpChannel").value;
  if (channel === "phone" && !required(contact.phone)) {
    showOtpMessage("Enter phone number before sending OTP.", true);
    return;
  }
  if (channel === "email" && !required(contact.email)) {
    showOtpMessage("Enter email before sending OTP.", true);
    return;
  }
  try {
    const response = await sendOrderOtp({ channel, phone: contact.phone, email: contact.email, name: contact.name || "Customer" });
    otpState.verified = false;
    showOtpMessage(`OTP sent successfully to ${response.recipient}. Please enter it to continue.`);
  } catch (error) {
    showOtpMessage(error.message || "Could not send OTP.", true);
  }
});

document.getElementById("verifyOtpBtn").addEventListener("click", async () => {
  const contact = getOtpContact();
  const channel = document.getElementById("otpChannel").value;
  const otp = document.getElementById("otpCode").value.trim();
  if (!otp) {
    showOtpMessage("Enter OTP to verify.", true);
    return;
  }
  try {
    await verifyOrderOtp({ channel, phone: contact.phone, email: contact.email, otp });
    otpState.verified = true;
    showOtpMessage("OTP verified successfully.");
  } catch (error) {
    otpState.verified = false;
    showOtpMessage(error.message || "OTP verification failed.", true);
  }
});

document.getElementById("applyCouponBtn").addEventListener("click", async () => {
  const payload = renderCart();
  const code = document.getElementById("couponCode").value.trim().toUpperCase();
  if (!payload || !payload.cart.length) {
    showCouponMessage("Add products to cart before applying coupon.", true);
    return;
  }
  if (!code) {
    couponState.code = "";
    couponState.discount = 0;
    renderCart();
    showCouponMessage("Enter a coupon code.");
    return;
  }
  try {
    const result = await validateCoupon(code, payload.subtotal);
    if (!result.valid) {
      couponState.code = "";
      couponState.discount = 0;
      renderCart();
      showCouponMessage(result.reason || "Invalid coupon.", true);
      return;
    }
    couponState.code = code;
    couponState.discount = Number(result.discount || 0);
    renderCart();
    showCouponMessage(`Coupon ${code} applied. Discount ${currency(couponState.discount)}.`);
  } catch (error) {
    couponState.code = "";
    couponState.discount = 0;
    renderCart();
    showCouponMessage(error.message || "Could not apply coupon.", true);
  }
});

document.getElementById("placeOrderBtn").addEventListener("click", async () => {
  if (!requireLoginForCheckout()) return;
  if (!otpState.verified) {
    showMessage("OTP verification is required before placing order.", true);
    return;
  }

  const payload = renderCart();
  if (!payload || !payload.cart.length) {
    showMessage("Cart is empty.", true);
    return;
  }

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const addressDetail = getAddressDetail();

  if (![fullName, email, phone, addressDetail.addressLine1, addressDetail.city, addressDetail.state, addressDetail.postalCode, addressDetail.country].every(required)) {
    showMessage("Please fill complete address and contact details.", true);
    return;
  }

  const selectedPayment = paymentMethod.value;
  if (selectedPayment === "Cash on Delivery (COD)" && payload.total > 1200) {
    showMessage("COD is allowed only for totals up to ₹1200.", true);
    return;
  }

  const paymentValidation = validatePaymentDetails(selectedPayment);
  if (!paymentValidation.ok) {
    showMessage(paymentValidation.error, true);
    return;
  }

  const orderId = `ORD-${Date.now()}`;
  const location = addressDetail.locationText || `${addressDetail.city}, ${addressDetail.state}, ${addressDetail.country}`;

  const orderPayload = {
    orderId,
    customer: fullName,
    email,
    phone,
    address: `${addressDetail.addressLine1}, ${addressDetail.addressLine2}, ${addressDetail.city}, ${addressDetail.state}, ${addressDetail.postalCode}, ${addressDetail.country}`,
    addressDetail,
    location,
    country: country.value,
    paymentStatus: selectedPayment === "Cash on Delivery (COD)" ? "Pending" : "Paid",
    orderStatus: "Processing",
    shippingStatus: "Preparing",
    paymentMethod: selectedPayment,
    paymentReference: paymentValidation.reference,
    subtotal: payload.subtotal,
    shipping: payload.shipping,
    discount: payload.discount,
    total: payload.total,
    couponCode: couponState.code || null,
    rewards: payload.rewards,
    items: payload.cart,
    createdAt: new Date().toISOString(),
    tracking: {
      courier: "Delhivery",
      number: `TRK${Math.floor(Math.random() * 100000000)}`
    }
  };

  addOrder(orderPayload);
  try {
    await createOrder(orderPayload);
  } catch (error) {
    showMessage(error.message || "Could not place order.", true);
    return;
  }

  const user = getAuthUser();
  if (user) {
    localStorage.setItem(`ppl_last_address_${user.email}`, JSON.stringify(addressDetail));
    try {
      await updateProfile({ addressDetail, location });
    } catch {
      // Keep order flow uninterrupted.
    }
  }

  addRewards(payload.rewards);
  saveCart([]);
  renderCart();

  const paymentText = selectedPayment === "Cash on Delivery (COD)" ? "COD confirmed" : "Payment confirmed";
  couponState.code = "";
  couponState.discount = 0;
  otpState.verified = false;
  document.getElementById("couponCode").value = "";
  document.getElementById("otpCode").value = "";
  showCouponMessage("Enter coupon if you have one.");
  showOtpMessage("Verify OTP before placing next order.");
  showMessage(`Order ${orderId} placed successfully. ${paymentText}.`);
});

loadUserDefaults();
renderCart();
mountFooter();
updateHeaderCounts();
requireLoginForCheckout();
