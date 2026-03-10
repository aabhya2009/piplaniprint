import { couriers } from "./data.js";
import { mountFooter, updateHeaderCounts } from "./common.js";
import { fetchOrderByTracking } from "./api.js";

const courierSelect = document.getElementById("courierSelect");
const courierLink = document.getElementById("courierLink");

courierSelect.innerHTML = couriers.map((courier) => `<option value="${courier.url}">${courier.name}</option>`).join("");

function updateLink() {
  courierLink.href = courierSelect.value;
}

updateLink();
courierSelect.addEventListener("change", updateLink);

document.getElementById("trackBtn").addEventListener("click", async () => {
  const trackingNo = document.getElementById("trackingNo").value.trim();
  if (!trackingNo) {
    document.getElementById("trackingResult").textContent = "Enter a valid tracking number.";
    return;
  }
  const courier = courierSelect.options[courierSelect.selectedIndex].text;
  try {
    const data = await fetchOrderByTracking(trackingNo);
    const found = data.tracking;
    document.getElementById("trackingResult").textContent = `Order ${found.orderId}: ${found.status} (${found.paymentStatus}). Courier: ${found.courier}.`;
    return;
  } catch {
    // Continue with generic response.
  }
  document.getElementById("trackingResult").textContent = `Tracking request submitted: ${trackingNo} via ${courier}. Click 'Open Courier Portal' for live tracking.`;
});

mountFooter();
updateHeaderCounts();
