const db = require("../utils/db");

exports.addDonation = async ({ donor_name, amount, donation_date, createdBy, description }) => {
  const [result] = await db.execute(
    "INSERT INTO donations (donor_name, amount, donation_date, created_by, description) VALUES (?, ?, ?, ?, ?)",
    [donor_name, amount, donation_date, createdBy, description]
  );
  return { insertId: result.insertId, donor_name, amount, donation_date, description };
};

exports.getAll = async (user) => {
  // Allow all authenticated users to view donations (read-only)
  const [rows] = await db.execute(
    `SELECT d.id, d.donor_name as user_name, d.amount, d.donation_date as date, d.description, d.created_by
     FROM donations d
     ORDER BY d.donation_date DESC`
  );
  return rows;
};

exports.getById = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, donor_name as user_name, amount, donation_date as date, description, created_by FROM donations WHERE id = ?`,
    [id]
  );
  return rows[0];
};

exports.updateById = async (id, { donor_name, amount, donation_date, description }) => {
  const [result] = await db.execute(
    `UPDATE donations SET donor_name = ?, amount = ?, donation_date = ?, description = ? WHERE id = ?`,
    [donor_name, amount, donation_date, description, id]
  );
  return result.affectedRows;
};

exports.deleteById = async (id) => {
  const [result] = await db.execute(`DELETE FROM donations WHERE id = ?`, [id]);
  return result.affectedRows;
};
