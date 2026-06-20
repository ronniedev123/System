const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

let authPayload = null;
try {
    authPayload = JSON.parse(atob(token.split(".")[1]));
} catch (err) {
    localStorage.removeItem("token");
    window.location.href = "index.html";
}

const canManageAlbum = ["admin", "user"].includes(String(authPayload?.role || "").toLowerCase());
const normalizedRole = String(authPayload?.role || "").toLowerCase();
const albumGrid = document.getElementById("albumGrid");
const albumEmptyState = document.getElementById("albumEmptyState");
const albumManageCard = document.getElementById("albumManageCard");
const albumForm = document.getElementById("albumForm");
const albumStatus = document.getElementById("albumStatus");
const refreshAlbumBtn = document.getElementById("refreshAlbumBtn");
const albumIntro = document.getElementById("albumIntro");
const albumRolePill = document.getElementById("albumRolePill");
const albumRoleNote = document.getElementById("albumRoleNote");

if (canManageAlbum && albumManageCard) {
    albumManageCard.style.display = "block";
}

if (albumIntro) {
    albumIntro.textContent = canManageAlbum
        ? "Browse church images in a clean photo wall and manage uploads without changing member access."
        : "Browse church images in a clean photo wall and download the photos you want to keep.";
}

if (albumRolePill) {
    const roleLabels = {
        admin: "Admin access",
        user: "Team access",
        normaluser: "Member access"
    };
    albumRolePill.textContent = roleLabels[normalizedRole] || "Album access";
    albumRolePill.style.display = "inline-flex";
}

if (albumRoleNote) {
    albumRoleNote.textContent = canManageAlbum
        ? "Your role can upload and delete album images. Members remain in view-and-download mode only."
        : "Your role is view-only here. You can open and download photos, but uploads and deletes stay with admins and team users.";
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
});

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showAlbumStatus(message, tone = "info") {
    if (!albumStatus) return;
    albumStatus.style.display = "block";
    albumStatus.textContent = message;
    albumStatus.className = `status-panel ${tone === "error" ? "status-error" : tone === "success" ? "status-success" : "status-info"}`;
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function buildImageTitleFromFile(fileName) {
    return String(fileName || "")
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "Church photo";
}

function formatAlbumDateLabel(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return "Recent uploads";
    }

    const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today - itemDay) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";

    const sameYear = date.getFullYear() === now.getFullYear();
    return new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        ...(sameYear ? {} : { year: "numeric" })
    }).format(date);
}

function formatAlbumTimestamp(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
        return "Recently added";
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(date);
}

function buildAlbumGroups(items) {
    const groups = [];
    const groupMap = new Map();

    items.forEach((item) => {
        const label = formatAlbumDateLabel(item.created_at);
        if (!groupMap.has(label)) {
            const group = { label, items: [] };
            groupMap.set(label, group);
            groups.push(group);
        }
        groupMap.get(label).items.push(item);
    });

    return groups;
}

function renderAlbum(items) {
    if (!albumGrid || !albumEmptyState) return;

    albumGrid.innerHTML = "";
    albumEmptyState.style.display = items.length ? "none" : "block";
    albumEmptyState.textContent = "No church album images have been added yet.";

    buildAlbumGroups(items).forEach((group) => {
        const section = document.createElement("section");
        section.className = "album-group";

        const header = document.createElement("div");
        header.className = "album-group-header";

        const heading = document.createElement("h3");
        heading.textContent = group.label;

        const count = document.createElement("span");
        count.className = "album-group-count";
        count.textContent = `${group.items.length} ${group.items.length === 1 ? "photo" : "photos"}`;

        header.appendChild(heading);
        header.appendChild(count);

        const masonry = document.createElement("div");
        masonry.className = "album-masonry";

        group.items.forEach((item) => {
            const card = document.createElement("article");
            card.className = "album-tile";

            const imageLink = document.createElement("a");
            imageLink.className = "album-photo-link";
            imageLink.href = item.image_data;
            imageLink.target = "_blank";
            imageLink.rel = "noopener noreferrer";
            imageLink.setAttribute("aria-label", `Open ${item.title || "church photo"}`);

            const image = document.createElement("img");
            image.className = "album-image";
            image.src = item.image_data;
            image.alt = item.title || "Church album image";
            image.loading = "lazy";
            image.decoding = "async";
            imageLink.appendChild(image);

            const body = document.createElement("div");
            body.className = "album-tile-body";

            const copy = document.createElement("div");
            copy.className = "album-tile-copy";

            const title = document.createElement("h4");
            title.textContent = item.title || "Church photo";
            copy.appendChild(title);

            if (item.description) {
                const description = document.createElement("p");
                description.textContent = item.description;
                copy.appendChild(description);
            }

            const meta = document.createElement("div");
            meta.className = "album-tile-meta";
            meta.innerHTML = `<span>${escapeHtml(formatAlbumTimestamp(item.created_at))}</span><span>${escapeHtml(item.image_name || "Image file")}</span>`;

            const actions = document.createElement("div");
            actions.className = "album-tile-actions";

            const openLink = document.createElement("a");
            openLink.className = "download-link album-action-link";
            openLink.href = item.image_data;
            openLink.target = "_blank";
            openLink.rel = "noopener noreferrer";
            openLink.textContent = "Open";
            actions.appendChild(openLink);

            const downloadLink = document.createElement("a");
            downloadLink.className = "download-link album-action-link";
            downloadLink.href = item.image_data;
            downloadLink.download = item.image_name || `${item.title || "church-image"}.jpg`;
            downloadLink.textContent = "Download";
            actions.appendChild(downloadLink);

            if (canManageAlbum) {
                const deleteBtn = document.createElement("button");
                deleteBtn.className = "small-btn btn-danger album-delete-btn";
                deleteBtn.textContent = "Delete";
                deleteBtn.addEventListener("click", () => deleteImage(item.id, item.title));
                actions.appendChild(deleteBtn);
            }

            body.appendChild(copy);
            body.appendChild(meta);
            body.appendChild(actions);

            card.appendChild(imageLink);
            card.appendChild(body);
            masonry.appendChild(card);
        });

        section.appendChild(header);
        section.appendChild(masonry);
        albumGrid.appendChild(section);
    });
}

async function loadAlbum() {
    try {
        const res = await fetch("/api/church-album", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Failed to load album");
        }
        renderAlbum(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error(err);
        if (albumEmptyState) {
            albumEmptyState.style.display = "block";
            albumEmptyState.textContent = "Unable to load church album images right now.";
        }
    }
}

async function deleteImage(id, title) {
    if (!canManageAlbum) return;
    if (!confirm(`Delete "${title || "this image"}" from the church album?`)) return;

    try {
        const res = await fetch(`/api/church-album/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.error || "Failed to delete image");
            return;
        }
        loadAlbum();
    } catch (err) {
        console.error(err);
        alert("Server error while deleting image");
    }
}

albumForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canManageAlbum) return;

    const file = document.getElementById("imageFile").files[0];
    const title = buildImageTitleFromFile(file?.name);
    const description = "";

    if (!file) {
        showAlbumStatus("Image file is required.", "error");
        return;
    }

    if (!file.type.startsWith("image/")) {
        showAlbumStatus("Please choose a valid image file.", "error");
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showAlbumStatus("Image file is too large. Please keep it under 10 MB.", "error");
        return;
    }

    try {
        showAlbumStatus("Uploading church album image...");
        const imageData = await fileToDataUrl(file);
        const res = await fetch("/api/church-album", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                title,
                description,
                image_name: file.name,
                image_data: imageData,
                mime_type: file.type
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            showAlbumStatus(data.error || "Failed to upload image.", "error");
            return;
        }

        albumForm.reset();
        showAlbumStatus("Church album image uploaded successfully.", "success");
        loadAlbum();
    } catch (err) {
        console.error(err);
        showAlbumStatus("Server error while uploading image.", "error");
    }
});

refreshAlbumBtn?.addEventListener("click", loadAlbum);

loadAlbum();
