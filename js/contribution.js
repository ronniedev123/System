const token = localStorage.getItem("token");
const donationsTable = document.getElementById("donationsTable");
const donationForm = document.getElementById("donationForm");
const totalContributedEl = document.getElementById("totalContributed");
const showDonateBtn = document.getElementById("showDonateBtn");
const cancelDonateBtn = document.getElementById("cancelDonateBtn");
const donateFormDiv = document.getElementById("donateFormDiv");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const mpesaPayBtn = document.getElementById("mpesaPayBtn");
const bankPayBtn = document.getElementById("bankPayBtn");
const manualRecordBtn = document.getElementById("manualRecordBtn");
const paymentStatusPanel = document.getElementById("paymentStatusPanel");

if (!token) window.location.href = "index.html";

const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
const role = payload ? payload.role : null;

const params = new URLSearchParams(window.location.search);
const contributionType = params.get("type");
const paymentIdFromUrl = params.get("paymentId");
const paymentStatusFromUrl = params.get("paymentStatus");

const TYPE_META = {
    "missions": {
        title: "Missions Contributions",
        bank: "Kingdom Missions Bank",
        accountName: "Ministry of Repentance and Holiness - Missions",
        accountNumber: "1002003001",
        paybill: "821001",
        reference: "MISSIONS"
    },
    "tithes-offerings": {
        title: "Tithes and Offerings Contributions",
        bank: "Diamond Trust Bank",
        accountName: "Ministry of Repentance and Holiness",
        accountNumber: "0055227001",
        paybill: "516600",
        reference: "TITHE"
    },
    "tabernacle-construction": {
        title: "Tabernacle Construction Contributions",
        bank: "Builders Trust Bank",
        accountName: "Ministry of Repentance and Holiness - Tabernacle Construction",
        accountNumber: "1002003003",
        paybill: "821003",
        reference: "TABERNACLE"
    }
};

if (!TYPE_META[contributionType]) {
    alert("Invalid contribution type selected");
    window.location.href = "donations.html";
}

let paymentPollTimer = null;

function setupTypeDetails() {
    const meta = TYPE_META[contributionType];
    document.getElementById("contribTitle").textContent = meta.title;
    document.getElementById("accBank").textContent = meta.bank;
    document.getElementById("accName").textContent = meta.accountName;
    document.getElementById("accNumber").textContent = meta.accountNumber;
    document.getElementById("accPaybill").textContent = meta.paybill;
    document.getElementById("accRef").textContent = meta.reference;

    const memberNameField = document.getElementById("member_name");
    if (memberNameField && payload?.name && !memberNameField.value) {
        memberNameField.value = payload.name;
    }

    if (manualRecordBtn && role !== "admin") {
        manualRecordBtn.style.display = "none";
    }
}

function showPaymentStatus(message, tone = "info") {
    if (!paymentStatusPanel) return;
    paymentStatusPanel.style.display = "block";
    paymentStatusPanel.textContent = message;
    paymentStatusPanel.className = `status-panel ${tone === "error" ? "status-error" : tone === "success" ? "status-success" : "status-info"}`;
}

function clearPaymentPolling() {
    if (paymentPollTimer) {
        clearInterval(paymentPollTimer);
        paymentPollTimer = null;
    }
}

async function fetchContributions() {
    const res = await fetch(`/api/donations?type=${encodeURIComponent(contributionType)}`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    const data = await res.json();
    let total = 0;
    donationsTable.innerHTML = "";

    data.forEach((d) => {
        const amountNum = Number(d.amount) || 0;
        total += amountNum;
        const tr = document.createElement("tr");
        const actions = (role === "admin")
            ? `<button class="small-btn btn-primary" onclick="editContribution(${d.id})">Edit</button> <button class="small-btn btn-danger" onclick="deleteContribution(${d.id})">Delete</button>`
            : '<span class="cell-muted">-</span>';
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.user_name || d.donor_name || ""}</td>
            <td>KSH ${amountNum.toLocaleString()}</td>
            <td>${d.payment_method || "manual"}</td>
            <td>${d.payment_reference || "-"}</td>
            <td>${d.description || ""}</td>
            <td>${d.date || ""}</td>
            <td>${actions}</td>
        `;
        donationsTable.appendChild(tr);
    });

    totalContributedEl.textContent = `KSH ${total.toLocaleString()}`;
}

function getContributionPayload() {
    const memberName = document.getElementById("member_name")?.value.trim() || null;
    const amount = document.getElementById("amount").value;
    const description = document.getElementById("description")?.value.trim() || null;
    const phone = document.getElementById("phone_number")?.value.trim() || null;

    if (!memberName) {
        throw new Error("Please enter a member name");
    }

    if (!amount || Number(amount) <= 0) {
        throw new Error("Please enter a valid amount");
    }

    return {
        memberName,
        amount,
        description,
        contributionType,
        phone
    };
}

async function startPaymentStatusPolling(paymentId) {
    clearPaymentPolling();
    let attempts = 0;

    const poll = async () => {
        attempts += 1;
        try {
            const res = await fetch(`/api/payments/${paymentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch payment status");
            }

            if (data.status === "completed") {
                showPaymentStatus(`Payment completed successfully. Reference: ${data.provider_reference || "Recorded"}`, "success");
                clearPaymentPolling();
                fetchContributions();
                return;
            }

            if (data.status === "failed" || data.status === "cancelled") {
                showPaymentStatus(data.response_message || "Payment was not completed.", "error");
                clearPaymentPolling();
                return;
            }

            showPaymentStatus(data.response_message || "Payment is still pending. Please complete it on your phone or payment page.", "info");
            if (attempts >= 24) {
                clearPaymentPolling();
            }
        } catch (err) {
            console.error(err);
            clearPaymentPolling();
        }
    };

    await poll();
    paymentPollTimer = setInterval(poll, 5000);
}

async function initiateMpesaPayment() {
    try {
        const payloadData = getContributionPayload();
        if (!payloadData.phone) {
            throw new Error("Please enter the M-Pesa phone number for STK push");
        }

        showPaymentStatus("Sending STK push request...");
        const res = await fetch("/api/payments/mpesa/stk", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payloadData)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || "Failed to start M-Pesa payment");
        }

        showPaymentStatus(data.message || "STK push sent. Check the donor's phone to complete payment.");
        if (data.paymentId) {
            await startPaymentStatusPolling(data.paymentId);
        }
    } catch (err) {
        console.error(err);
        showPaymentStatus(err.message || "Failed to start M-Pesa payment.", "error");
    }
}

async function initiateBankRedirect() {
    try {
        const payloadData = getContributionPayload();
        showPaymentStatus("Preparing bank redirect...");
        const res = await fetch("/api/payments/bank/redirect", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payloadData)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.error || "Failed to prepare bank redirect");
        }

        showPaymentStatus("Redirecting to bank payment provider...");
        if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
            return;
        }
        throw new Error("Bank redirect URL was not returned");
    } catch (err) {
        console.error(err);
        showPaymentStatus(err.message || "Failed to start bank payment.", "error");
    }
}

window.deleteContribution = async function(id) {
    if(!confirm("Delete this contribution?")) return;
    try {
        const res = await fetch(`/api/donations/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if(res.ok) fetchContributions();
        else { const data = await res.json(); alert(data.error || "Delete failed"); }
    } catch (err) { console.error(err); alert("Server error"); }
};

window.editContribution = async function(id) {
    try {
        const getRes = await fetch(`/api/donations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if(!getRes.ok){ const d = await getRes.json(); alert(d.error || "Not found"); return; }
        const row = await getRes.json();
        const newAmount = prompt("Amount", row.amount);
        if (newAmount === null) return;
        const newDescription = prompt("Description", row.description || "");
        if (newDescription === null) return;
        const newDate = prompt("Date (YYYY-MM-DD)", row.date ? row.date.split("T")[0] : "");
        if (newDate === null) return;

        const res = await fetch(`/api/donations/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                amount: newAmount,
                date: newDate,
                description: newDescription,
                contributionType,
                payment_method: row.payment_method,
                payment_reference: row.payment_reference
            })
        });
        if(res.ok) fetchContributions();
        else { const data = await res.json(); alert(data.error || "Update failed"); }
    } catch (err) { console.error(err); alert("Server error"); }
};

if (donationForm) {
    donationForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (role !== "admin") {
            showPaymentStatus("Use M-Pesa STK push or bank redirect to make a live payment.", "error");
            return;
        }

        try {
            const payloadData = getContributionPayload();
            const res = await fetch("/api/donations/add", {
                method: "POST",
                headers: { "Content-Type":"application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payloadData)
            });
            if(res.ok){
                showPaymentStatus("Manual contribution recorded successfully.", "success");
                donationForm.reset();
                donateFormDiv.classList.add("hidden");
                fetchContributions();
            } else {
                const data = await res.json();
                showPaymentStatus(data.error || "Failed to add contribution", "error");
            }
        } catch (err) {
            console.error(err);
            showPaymentStatus("Server error", "error");
        }
    });
}

showDonateBtn?.addEventListener("click", () => {
    donateFormDiv?.classList.remove("hidden");
    document.getElementById("member_name")?.focus();
});

cancelDonateBtn?.addEventListener("click", () => {
    donateFormDiv?.classList.add("hidden");
    clearPaymentPolling();
});

mpesaPayBtn?.addEventListener("click", initiateMpesaPayment);
bankPayBtn?.addEventListener("click", initiateBankRedirect);

refreshBtn?.addEventListener("click", fetchContributions);

logoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "index.html";
});

setupTypeDetails();
fetchContributions();

if (paymentIdFromUrl) {
    startPaymentStatusPolling(paymentIdFromUrl);
}

if (paymentStatusFromUrl === "completed") {
    showPaymentStatus("Payment completed and recorded successfully.", "success");
} else if (paymentStatusFromUrl === "failed" || paymentStatusFromUrl === "cancelled") {
    showPaymentStatus("Bank payment was not completed.", "error");
}
