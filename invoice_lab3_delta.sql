-- 1. Create configuration table to store vat_percent
CREATE TABLE IF NOT EXISTS configuration (
    id SERIAL PRIMARY KEY,
    vat_percent NUMERIC(5,2) DEFAULT 7.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default VAT 7% if the table is empty
INSERT INTO configuration (id, vat_percent) 
VALUES (1, 7.00)
ON CONFLICT (id) DO NOTHING;

-- 2. Add discount and price columns to invoice_line_item
ALTER TABLE invoice_line_item
ADD COLUMN IF NOT EXISTS line_discount_percent NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS line_net_price NUMERIC(15,2) DEFAULT 0.00;

-- 3. Add summary calculation columns to invoice header
ALTER TABLE invoice
ADD COLUMN IF NOT EXISTS total_discount NUMERIC(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_price NUMERIC(15,2) DEFAULT 0.00;

-- 4. Create sales_person table
CREATE TABLE IF NOT EXISTS sales_person (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_work_date DATE
);

-- 5. Link invoice to sales_person
ALTER TABLE invoice
ADD COLUMN IF NOT EXISTS sales_person_id INT REFERENCES sales_person(id);
