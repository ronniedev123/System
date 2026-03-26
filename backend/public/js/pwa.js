let deferredInstallPrompt = null;

function isPreviewHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /\.ngrok-free\.app$/i.test(hostname) ||
    /\.ngrok\.app$/i.test(hostname) ||
    /\.ngrok\.io$/i.test(hostname)
  );
}

async function unregisterPreviewCaches() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }
}

function ensureInstallButton() {
  let button = document.getElementById("installAppBtn");
  if (button) return button;

  button = document.createElement("button");
  button.id = "installAppBtn";
  button.type = "button";
  button.textContent = "Install App";
  button.style.cssText = [
    "position:fixed",
    "right:18px",
    "bottom:18px",
    "z-index:1200",
    "display:none",
    "padding:12px 18px",
    "border:none",
    "border-radius:999px",
    "font-weight:700",
    "cursor:pointer",
    "box-shadow:0 16px 28px rgba(15,110,207,0.2)",
    "background:linear-gradient(135deg,#0f6ecf,#0a57a4)",
    "color:#ffffff"
  ].join(";");

  button.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    button.style.display = "none";
  });

  document.body.appendChild(button);
  return button;
}

function showInstallButton() {
  const button = ensureInstallButton();
  button.style.display = "inline-flex";
}

if ("serviceWorker" in navigator && !isPreviewHost(window.location.hostname)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
} else if (isPreviewHost(window.location.hostname)) {
  window.addEventListener("load", () => {
    unregisterPreviewCaches().catch((err) => {
      console.error("Preview cache cleanup failed:", err);
    });

    const previewRefreshKey = "preview-cache-busted";
    if (!sessionStorage.getItem(previewRefreshKey)) {
      sessionStorage.setItem(previewRefreshKey, "1");
      window.location.reload();
    }
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  const button = document.getElementById("installAppBtn");
  if (button) {
    button.style.display = "none";
  }
});
