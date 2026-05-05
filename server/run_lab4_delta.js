import fs from "fs";
import { pool } from "./src/db/pool.js";

async function runDelta() {
    try {
        const sql = fs.readFileSync("../invoice_lab4_delta.sql", "utf8");
        await pool.query(sql);
        console.log("Successfully ran invoice_lab4_delta.sql");
    } catch (err) {
        console.error("Error running SQL:", err);
    } finally {
        pool.end();
    }
}

runDelta();
