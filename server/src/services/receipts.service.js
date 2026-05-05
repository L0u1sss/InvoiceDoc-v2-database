import { pool } from "../db/pool.js";

export async function listReceipts({
  search = "",
  page = 1,
  limit = 10,
  sortBy = "receipt_date",
  sortDir = "desc",
} = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const allowedSort = ["receipt_no", "customer_name", "receipt_date", "total_received"];
  const sortColumn = allowedSort.includes(sortBy) ? sortBy : "receipt_date";
  const sortDirection = sortDir === "asc" ? "ASC" : "DESC";

  const searchParam = `%${search}%`;

  const countResult = await pool.query(
    `
      SELECT COUNT(*) as total
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      WHERE r.receipt_no ILIKE $1 OR c.name ILIKE $1 OR r.payment_method ILIKE $1
    `,
    [searchParam],
  );
  const total = Number(countResult.rows[0].total);

  const { rows } = await pool.query(
    `
      SELECT r.id, r.receipt_no, r.receipt_date, r.payment_method, r.total_received,
             c.name as customer_name, c.code as customer_code
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      WHERE r.receipt_no ILIKE $1 OR c.name ILIKE $1 OR r.payment_method ILIKE $1
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST, r.id DESC
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

// Generate receipt number like RCT26-00001
async function generateReceiptNo(client, date) {
  const year2Digits = new Date(date).getFullYear().toString().slice(-2);
  const prefix = `RCT${year2Digits}-`;
  
  const res = await client.query(
    `SELECT receipt_no FROM receipt WHERE receipt_no LIKE $1 ORDER BY receipt_no DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (res.rowCount > 0) {
    const lastNumStr = res.rows[0].receipt_no.substring(prefix.length);
    const lastNum = parseInt(lastNumStr, 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(5, '0')}`;
}

export async function getOutstandingInvoices(customerCode, excludeReceiptId = 0) {
  const result = await pool.query(
    `
    SELECT 
        i.id as invoice_id, 
        i.invoice_no, 
        i.invoice_date,
        i.amount_due,
        (
            SELECT COALESCE(SUM(rli.amount_received), 0)
            FROM receipt_line_item rli
            JOIN receipt r ON r.id = rli.receipt_id
            WHERE rli.invoice_id = i.id
            AND r.id != $2
        ) as amount_already_received
    FROM invoice i
    JOIN customer c ON c.id = i.customer_id
    WHERE c.code = $1
    AND i.amount_due > (
            SELECT COALESCE(SUM(rli.amount_received), 0)
            FROM receipt_line_item rli
            JOIN receipt r ON r.id = rli.receipt_id
            WHERE rli.invoice_id = i.id
            AND r.id != $2
    )
    ORDER BY i.invoice_date ASC
    `,
    [customerCode, excludeReceiptId]
  );
  return result.rows;
}

export async function getReceipt(receiptNo) {
  const header = await pool.query(
    `
      SELECT r.id, r.receipt_no, r.receipt_date, r.payment_method, r.notes, r.total_received,
             c.code as customer_code, c.name as customer_name,
             c.address_line1, c.address_line2, co.name as country_name
      FROM receipt r
      JOIN customer c ON c.id = r.customer_id
      LEFT JOIN country co ON co.id = c.country_id
      WHERE r.receipt_no = $1
    `,
    [receiptNo]
  );

  if (header.rowCount === 0) return null;
  const receiptId = header.rows[0].id;

  const lines = await pool.query(
    `
      SELECT rli.id, rli.amount_received, i.invoice_no, i.amount_due,
      (
          SELECT COALESCE(SUM(inner_rli.amount_received), 0)
          FROM receipt_line_item inner_rli
          JOIN receipt inner_r ON inner_r.id = inner_rli.receipt_id
          WHERE inner_rli.invoice_id = i.id
          AND inner_r.id != $1
      ) as amount_already_received
      FROM receipt_line_item rli
      JOIN invoice i ON i.id = rli.invoice_id
      WHERE rli.receipt_id = $1
      ORDER BY rli.id
    `,
    [receiptId]
  );

  return { header: header.rows[0], line_items: lines.rows };
}

export async function createReceipt({ receipt_no, receipt_date, customer_code, payment_method, notes, line_items }) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const code = customer_code != null ? String(customer_code).trim() : "";
    const cust = await client.query("SELECT id FROM customer WHERE code = $1", [code]);
    if (cust.rowCount === 0) throw new Error(`Customer not found: ${code}`);
    const customer_id = cust.rows[0].id;

    let finalReceiptNo = receipt_no;
    if (!finalReceiptNo || String(finalReceiptNo).trim() === "") {
        finalReceiptNo = await generateReceiptNo(client, receipt_date);
    }

    const total_received = line_items.reduce((s, li) => s + Number(li.amount_received || 0), 0);

    const rct = await client.query(
      `
        INSERT INTO receipt (receipt_no, receipt_date, customer_id, payment_method, notes, total_received)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, receipt_no
      `,
      [finalReceiptNo, receipt_date, customer_id, payment_method, notes, total_received]
    );

    const receipt_id = rct.rows[0].id;

    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.invoice_no]);
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.invoice_no}`);
      const invoice_id = inv.rows[0].id;

      await client.query(
        `
          INSERT INTO receipt_line_item (receipt_id, invoice_id, amount_received)
          VALUES ($1, $2, $3)
        `,
        [receipt_id, invoice_id, li.amount_received]
      );
    }

    await client.query("commit");
    return { receipt_no: rct.rows[0].receipt_no };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteReceipt(receiptNo) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    // หา receipt id จาก receipt_no
    const cur = await client.query("SELECT id FROM receipt WHERE receipt_no = $1", [receiptNo]);
    if (cur.rowCount === 0) throw new Error(`Receipt not found: ${receiptNo}`);
    const receipt_id = cur.rows[0].id;

    // ลบ line items ก่อน (เพราะมี foreign key ชี้มาที่ receipt)
    await client.query("DELETE FROM receipt_line_item WHERE receipt_id = $1", [receipt_id]);

    // ลบ receipt header
    await client.query("DELETE FROM receipt WHERE id = $1", [receipt_id]);

    await client.query("commit");
    return { receipt_no: receiptNo };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateReceipt(receiptNo, { receipt_date, customer_code, payment_method, notes, line_items }) {
  const client = await pool.connect();
  try {
    await client.query("begin");

    const cur = await client.query("SELECT id FROM receipt WHERE receipt_no = $1", [receiptNo]);
    if (cur.rowCount === 0) throw new Error(`Receipt not found: ${receiptNo}`);
    const receipt_id = cur.rows[0].id;

    const code = customer_code != null ? String(customer_code).trim() : "";
    const cust = await client.query("SELECT id FROM customer WHERE code = $1", [code]);
    if (cust.rowCount === 0) throw new Error(`Customer not found: ${code}`);
    const customer_id = cust.rows[0].id;

    const total_received = line_items.reduce((s, li) => s + Number(li.amount_received || 0), 0);

    await client.query(
      `
        UPDATE receipt 
        SET receipt_date=$1, customer_id=$2, payment_method=$3, notes=$4, total_received=$5
        WHERE id=$6
      `,
      [receipt_date, customer_id, payment_method, notes, total_received, receipt_id]
    );

    const keptLineIds = line_items.filter((li) => li.id != null && Number(li.id) > 0).map((li) => Number(li.id));

    if (keptLineIds.length > 0) {
      await client.query(
        "DELETE FROM receipt_line_item WHERE receipt_id = $1 AND id != ALL($2::int[])",
        [receipt_id, keptLineIds],
      );
    } else {
      await client.query("DELETE FROM receipt_line_item WHERE receipt_id = $1", [receipt_id]);
    }

    for (const li of line_items) {
      const inv = await client.query("SELECT id FROM invoice WHERE invoice_no = $1", [li.invoice_no]);
      if (inv.rowCount === 0) throw new Error(`Invoice not found: ${li.invoice_no}`);
      const invoice_id = inv.rows[0].id;

      const lineId = li.id != null && Number(li.id) > 0 ? Number(li.id) : null;
      if (lineId) {
        await client.query(
          `
            UPDATE receipt_line_item
            SET invoice_id=$1, amount_received=$2
            WHERE id=$3 AND receipt_id=$4
          `,
          [invoice_id, li.amount_received, lineId, receipt_id]
        );
      } else {
        await client.query(
          `
            INSERT INTO receipt_line_item (receipt_id, invoice_id, amount_received)
            VALUES ($1, $2, $3)
          `,
          [receipt_id, invoice_id, li.amount_received]
        );
      }
    }

    await client.query("commit");
    return { receipt_no: receiptNo };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}
