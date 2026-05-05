import { pool } from "../db/pool.js";

export async function getConfig(key) {
  // Use the user's table structure
  if (key === "vat_percent") {
    const result = await pool.query("SELECT vat_percent FROM configuration LIMIT 1");
    return result.rowCount > 0 ? result.rows[0].vat_percent : null;
  }
  return null;
}
