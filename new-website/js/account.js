import { mountFooter, updateHeaderCounts } from "./common.js";
import { getWishlist } from "./store.js";
import {
  clearAuthSession,
  createReturnRequest,
  fetchOrders,
  fetchProfile,
  getAuthUser,
  loginUser,
  registerUser,
  setAuthSession,
  updateProfile
} from "./api.js";

const authSection = document.getElementById("authSection");
const dashboardSection = document.getElementById("dashboardSection");
const authMessage = document.getElementById("authMessage");
const dashboardMessage = document.getElementById("dashboardMessage");

function showAuthMessage(text, isError = false) {
  authMessage.textContent = text;
  authMessage.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function showDashboardMessage(text, isError = false) {
  dashboardMessage.textContent = text;
  dashboardMessage.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function switchTab(mode) {
  const isLogin = mode === "login";
  document.getElementById("loginForm").style.display = isLogin ? "block" : "none";
  document.getElementById("registerForm").style.display = isLogin ? "none" : "block";
}

function renderSavedAddresses(user) {
  const root = document.getElementById("savedAddressList");
  const addresses = user.addresses || [];
  root.innerHTML = addresses.length
    ? addresses
        .map(
          (a) => `<div class="panel" style="margin-bottom:0.5rem">
              <strong>${a.fullName || user.name}</strong>
              <p>${a.addressLine1 || ""}, ${a.addressLine2 || ""}</p>
              <p>${a.city || ""}, ${a.state || ""}, ${a.postalCode || ""}, ${a.country || ""}</p>
            </div>`
        )
        .join("")
    : "<p>No saved address yet. Place an order to store address.</p>";
}

async function renderDashboard(user) {
  authSection.style.display = "none";
  dashboardSection.style.display = "grid";

  document.getElementById("nameField").value = user.name || "";
  document.getElementById("emailField").value = user.email || "";
  document.getElementById("phoneField").value = user.phone || "";
  document.getElementById("locationField").value = user.location || "";

  const locationText = user.location || "Location not saved yet.";
  document.getElementById("savedLocation").textContent = locationText;

  document.getElementById("wishlistCount").textContent = String(getWishlist().length);
  document.getElementById("savedDesigns").textContent = String((user.savedDesigns || []).length);
  document.getElementById("rewardPoints").textContent = `${user.rewards || 0} pts`;

  let orders = [];
  try {
    orders = await fetchOrders(user.email);
  } catch {
    showDashboardMessage("Could not fetch orders from backend.", true);
  }

  document.getElementById("orderCount").textContent = String(orders.length);
  document.getElementById("orderRows").innerHTML = orders.length
    ? orders
        .slice(0, 10)
        .map(
          (order) => `
        <tr>
          <td>${order.orderId}</td>
          <td>${order.orderStatus}</td>
          <td>${order.paymentStatus}</td>
          <td>₹${Math.round(order.total)}</td>
        </tr>
      `
        )
        .join("")
    : "<tr><td colspan='4'>No orders yet.</td></tr>";

  renderSavedAddresses(user);
}

async function loadSession() {
  const local = getAuthUser();
  if (!local) return;
  try {
    const response = await fetchProfile();
    await renderDashboard(response.user);
  } catch {
    clearAuthSession();
  }
}

document.getElementById("tabLogin").addEventListener("click", () => switchTab("login"));
document.getElementById("tabRegister").addEventListener("click", () => switchTab("register"));

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value.trim()
    };
    const res = await loginUser(payload);
    setAuthSession(res.token, res.user);

    showAuthMessage("Login successful.");
    await renderDashboard(res.user);
  } catch (error) {
    showAuthMessage(error.message || "Login failed.", true);
  }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      name: document.getElementById("regName").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      phone: document.getElementById("regPhone").value.trim(),
      password: document.getElementById("regPassword").value.trim()
    };
    const res = await registerUser(payload);
    setAuthSession(res.token, res.user);

    showAuthMessage("Registration successful.");
    await renderDashboard(res.user);
  } catch (error) {
    showAuthMessage(error.message || "Registration failed.", true);
  }
});

document.getElementById("saveAccountBtn").addEventListener("click", async () => {
  try {
    const updated = await updateProfile({
      name: document.getElementById("nameField").value.trim(),
      phone: document.getElementById("phoneField").value.trim(),
      location: document.getElementById("locationField").value.trim()
    });
    setAuthSession(localStorage.getItem("ppl_auth_token"), updated.user);
    showDashboardMessage("Account settings saved.");
  } catch (error) {
    showDashboardMessage(error.message || "Could not update profile.", true);
  }
});

document.getElementById("submitReturnBtn").addEventListener("click", async () => {
  const user = getAuthUser();
  if (!user) {
    showDashboardMessage("Please login to submit return request.", true);
    return;
  }
  const text = document.getElementById("returnReasonField").value.trim();
  if (!text) {
    showDashboardMessage("Enter order ID and return reason.", true);
    return;
  }
  const match = text.match(/ORD-\d+/i);
  if (!match) {
    showDashboardMessage("Please include valid order ID (e.g. ORD-123456).", true);
    return;
  }
  const orderId = match[0].toUpperCase();
  const reason = text.replace(match[0], "").trim() || "Return requested by customer.";
  try {
    await createReturnRequest({ orderId, reason, email: user.email, customer: user.name });
    showDashboardMessage(`Return request submitted for ${orderId}.`);
    document.getElementById("returnReasonField").value = "";
    await loadSession();
  } catch (error) {
    showDashboardMessage(error.message || "Could not submit return request.", true);
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearAuthSession();
  authSection.style.display = "block";
  dashboardSection.style.display = "none";
  showAuthMessage("Logged out.");
});

mountFooter();
updateHeaderCounts();
loadSession();
