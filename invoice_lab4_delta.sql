-- Lab 4 Delta: Receipt system and views

-- 1. Receipt Header Table
CREATE TABLE IF NOT EXISTS receipt (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(20) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    customer_id INT REFERENCES customer(id) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    notes TEXT,
    total_received NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Receipt Line Item Table
CREATE TABLE IF NOT EXISTS receipt_line_item (
    id SERIAL PRIMARY KEY,
    receipt_id INT REFERENCES receipt(id) ON DELETE CASCADE,
    invoice_id INT REFERENCES invoice(id) ON DELETE CASCADE,
    amount_received NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. View to calculate total received per invoice
CREATE OR REPLACE VIEW invoice_received AS
SELECT 
    i.customer_id,
    i.id AS invoice_id,
    i.invoice_no,
    i.amount_due,
    COALESCE(SUM(rli.amount_received), 0) AS amount_received,
    i.amount_due - COALESCE(SUM(rli.amount_received), 0) AS amount_remain
FROM 
    invoice i
LEFT JOIN 
    receipt_line_item rli ON i.id = rli.invoice_id
GROUP BY 
    i.id, i.customer_id, i.invoice_no, i.amount_due;
