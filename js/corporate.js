import { mountFooter } from "./common.js";
import { createCorporateRequest } from "./api.js";

const message = document.getElementById("corpMessage");

function setMessage(text, isError = false) {
  message.textContent = text;
  message.style.borderColor = isError ? "#E63946" : "#3A86FF";
}

function required(value) {
  return String(value || "").trim().length > 0;
}

document.getElementById("corpSubmitBtn").addEventListener("click", async () => {
  const payload = {
    company: document.getElementById("corpCompany").value.trim(),
    name: document.getElementById("corpName").value.trim(),
    email: document.getElementById("corpEmail").value.trim(),
    phone: document.getElementById("corpPhone").value.trim(),
    quantity: document.getElementById("corpQty").value.trim(),
    requirement: document.getElementById("corpRequirement").value.trim()
  };

  if (![payload.company, payload.name, payload.email, payload.requirement].every(required)) {
    setMessage("Please fill company, contact name, email, and requirement.", true);
    return;
  }

  try {
    await createCorporateRequest(payload);
    setMessage("Corporate request submitted successfully.");
    document.getElementById("corpRequirement").value = "";
  } catch (error) {
    setMessage(error.message || "Could not submit request.", true);
  }
});

mountFooter();
