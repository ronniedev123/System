const db = require("../utils/db");
const donationsModel = require("./donationsModel");

exports.createPayment = async ({
    member_id,
    donor_name,
    phone_number,
    amount,
    contribution_type,
    description,
    payment_method,
    status,
    created_by,
    provider_request_id,
    provider_checkout_id,
    provider_reference,
    redirect_url,
    external_reference,
    provider_payload
}) => {
    const [result] = await db.execute(
        `INSERT INTO payment_transactions (
            member_id, donor_name, phone_number, amount, contribution_type, description, payment_method,
            status, created_by, provider_request_id, provider_checkout_id, provider_reference, redirect_url,
            external_reference, provider_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            member_id,
            donor_name,
            phone_number || null,
            amount,
            contribution_type,
            description || null,
            payment_method,
            status,
            created_by || null,
            provider_request_id || null,
            provider_checkout_id || null,
            provider_reference || null,
            redirect_url || null,
            external_reference || null,
            provider_payload || null
        ]
    );

    return result.insertId;
};

exports.getPaymentById = async (id) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM payment_transactions
         WHERE id = ?`,
        [id]
    );
    return rows[0];
};

exports.getPaymentByCheckoutId = async (checkoutId) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM payment_transactions
         WHERE provider_checkout_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [checkoutId]
    );
    return rows[0];
};

exports.getPaymentByExternalReference = async (reference) => {
    const [rows] = await db.execute(
        `SELECT *
         FROM payment_transactions
         WHERE external_reference = ?
         ORDER BY id DESC
         LIMIT 1`,
        [reference]
    );
    return rows[0];
};

exports.updatePayment = async (id, fields) => {
    const allowed = [
        "status",
        "provider_request_id",
        "provider_checkout_id",
        "provider_reference",
        "redirect_url",
        "provider_payload",
        "response_message",
        "paid_at",
        "donation_id"
    ];

    const updates = [];
    const values = [];

    allowed.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
            updates.push(`${key} = ?`);
            values.push(fields[key]);
        }
    });

    if (!updates.length) return 0;

    values.push(id);
    const [result] = await db.execute(
        `UPDATE payment_transactions
         SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        values
    );
    return result.affectedRows;
};

exports.listPaymentsByType = async (contributionType) => {
    const [rows] = await db.execute(
        `SELECT id, donor_name, amount, contribution_type, payment_method, status, provider_reference, created_at, paid_at
         FROM payment_transactions
         WHERE contribution_type = ?
         ORDER BY created_at DESC, id DESC`,
        [contributionType]
    );
    return rows;
};

exports.finalizeSuccessfulPayment = async (payment, reference, paidAt) => {
    const existing = await exports.getPaymentById(payment.id);
    if (existing && existing.donation_id) {
        return existing.donation_id;
    }

    const donation = await donationsModel.addDonation({
        donor_name: payment.donor_name,
        amount: payment.amount,
        donation_date: paidAt || new Date(),
        contribution_type: payment.contribution_type,
        createdBy: payment.created_by,
        description: payment.description,
        payment_method: payment.payment_method,
        payment_reference: reference || payment.provider_reference || payment.external_reference || null
    });

    await exports.updatePayment(payment.id, {
        donation_id: donation.insertId,
        status: "completed",
        provider_reference: reference || payment.provider_reference || null,
        paid_at: paidAt || new Date()
    });

    return donation.insertId;
};
