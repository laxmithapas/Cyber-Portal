// === Helper Functions ===
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });
  document.getElementById(pageId).classList.add("active");
}

function showAlert(containerId, message, type = "error") {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { container.innerHTML = ""; }, 3000);
}

// === Global state ===
let currentEmail = "";

// === Registration ===
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const confirm = document.getElementById("register-confirm").value;

  if (password !== confirm) {
    showAlert("register-alert", "Passwords do not match", "error");
    return;
  }

  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  if (data.success) {
    showAlert("register-alert", "Registration successful! Please login.", "success");
    setTimeout(() => showPage("login-page"), 2000);
  } else {
    showAlert("register-alert", data.message || "Registration failed", "error");
  }
});

// === Login ===
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (data.success) {
    currentEmail = email;
    if (data.twoFAEnabled) {
      showPage("twofa-verify-page");
    } else {
      // start 2FA setup
      const setupRes = await fetch("/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const setupData = await setupRes.json();
      if (setupData.success) {
        document.getElementById("qrcode-image").src = setupData.qrCode;
        document.getElementById("secret-key").textContent = setupData.secret;
        showPage("twofa-setup-page");
      }
    }
  } else {
    showAlert("login-alert", data.message || "Login failed", "error");
  }
});

// === 2FA Setup Verification ===
async function verify2FASetup() {
  const code = document.getElementById("twofa-code").value;

  const res = await fetch("/verify-2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, token: code })
  });

  const data = await res.json();
  if (data.success) {
    alert("2FA setup complete! Please login again.");
    showPage("login-page");
  } else {
    alert(data.message || "Verification failed");
  }
}

// === 2FA Login Verification ===
async function verify2FA() {
  const code = document.getElementById("twofa-verify-code").value;

  const res = await fetch("/verify-login-2fa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, token: code })
  });

  const data = await res.json();
  if (data.success) {
    showPage("security-page");
  } else {
    alert(data.message || "Invalid verification code");
  }
}
