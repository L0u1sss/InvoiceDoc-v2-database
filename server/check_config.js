import { pool } from "./src/db/pool.js";

async function run() {
  try {
    const res = await pool.query("SELECT * FROM configuration");
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
