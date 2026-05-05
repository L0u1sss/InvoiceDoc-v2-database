import fs from "fs";
import { pool } from "./src/db/pool.js";

async function runSQL() {
  const sql = fs.readFileSync("../invoice_lab3_delta.sql", "utf-8");
  try {
    await pool.query(sql);
    console.log("SQL successfully executed!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    pool.end();
  }
}

runSQL();
