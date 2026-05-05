import { pool } from "../db/pool.js";

export async function listSalesPersons({
  search = "",
  page = 1,
  limit = 10,
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*) as total FROM sales_person
      WHERE name ILIKE $1 OR COALESCE(code, 'S' || LPAD(id::text, 3, '0')) ILIKE $1
    `,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `
      SELECT id, COALESCE(code, 'S' || LPAD(id::text, 3, '0')) as code, name, start_work_date
      FROM sales_person
      WHERE name ILIKE $1 OR COALESCE(code, 'S' || LPAD(id::text, 3, '0')) ILIKE $1
      ORDER BY id ASC
      LIMIT $2 OFFSET $3
    `,
    [searchParam, Number(limit), offset],
  );

  return {
    data: rows,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  };
}

export async function getSalesPersonByCode(code) {
  const { rows } = await pool.query(
    `SELECT id, COALESCE(code, 'S' || LPAD(id::text, 3, '0')) as code, name, start_work_date 
     FROM sales_person 
     WHERE COALESCE(code, 'S' || LPAD(id::text, 3, '0')) = $1`,
    [code]
  );
  return rows[0] ?? null;
}

export async function createSalesPerson({ code, name, start_work_date }) {
  let finalCode = code && code.trim() ? code.trim() : null;
  const res = await pool.query(
    `INSERT INTO sales_person (id, code, name, start_work_date)
     VALUES ((select coalesce(max(id),0)+1 from sales_person), $1, $2, $3) 
     RETURNING id, COALESCE(code, 'S' || LPAD(id::text, 3, '0')) as code`,
    [finalCode, name, start_work_date || null]
  );
  return res.rows[0];
}

export async function updateSalesPerson(codeParam, { code, name, start_work_date }) {
  let finalCode = code && code.trim() ? code.trim() : null;
  const res = await pool.query(
    `UPDATE sales_person 
     SET code = $1, name = $2, start_work_date = $3
     WHERE COALESCE(code, 'S' || LPAD(id::text, 3, '0')) = $4
     RETURNING id, COALESCE(code, 'S' || LPAD(id::text, 3, '0')) as code`,
    [finalCode, name, start_work_date || null, codeParam]
  );
  return res.rows[0];
}

export async function deleteSalesPerson(codeParam) {
  await pool.query(
    `DELETE FROM sales_person WHERE COALESCE(code, 'S' || LPAD(id::text, 3, '0')) = $1`,
    [codeParam]
  );
  return { ok: true };
}
