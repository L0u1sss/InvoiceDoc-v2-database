import React from "react";
import { getReportData } from "../../api/reports.api.js";
import { formatBaht, formatDate } from "../../utils.js";
import CustomerFilter from "./filters/CustomerFilter.jsx";
import DateRangeFilter from "./filters/DateRangeFilter.jsx";

export default function ReceiptInvoicesReport() {
  const [filters, setFilters] = React.useState({});
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [hasApplied, setHasApplied] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(true);

  const handleChange = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const handleApply = () => {
    setLoading(true);
    setErr("");
    setHasApplied(true);
    getReportData("receipt-invoices", {
      customer_code: filters.customerCode || undefined,
      date_from: filters.dateFrom || undefined,
      date_to: filters.dateTo || undefined,
    })
      .then((res) => setData(res.data || []))
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  };

  const handleReset = () => {
    setFilters({});
    setData([]);
    setHasApplied(false);
  };

  // Group flat rows by invoice_no
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const row of data) {
      if (!map.has(row.invoice_no)) {
        map.set(row.invoice_no, {
          invoice_no: row.invoice_no,
          invoice_date: row.invoice_date,
          customer_code: row.customer_code,
          customer_name: row.customer_name,
          amount_due: row.amount_due,
          invoice_total_received: row.invoice_total_received,
          amount_remain: row.amount_remain,
          receipts: [],
        });
      }
      // Add receipt sub-row if there's a receipt
      if (row.receipt_no) {
        map.get(row.invoice_no).receipts.push({
          receipt_no: row.receipt_no,
          receipt_date: row.receipt_date,
          receipt_amount: row.receipt_amount,
        });
      }
    }
    return [...map.values()];
  }, [data]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 className="page-title">Invoices vs Receipts</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Invoice payment details with receipt sub-rows
          </p>
        </div>
        <button
          className={`btn ${showFilters ? "btn-primary" : "btn-outline"}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          Filters {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
        </button>
      </div>

      {err && <div className="alert alert-error">{err}</div>}

      {showFilters && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="report-filters">
            <div className="filters-grid">
              <CustomerFilter
                value={filters.customerCode || ""}
                displayLabel={filters.customerLabel}
                onChange={handleChange}
              />
              <DateRangeFilter
                dateFrom={filters.dateFrom || ""}
                dateTo={filters.dateTo || ""}
                onChange={handleChange}
              />
            </div>
            <div className="filters-actions">
              <button type="button" className="btn btn-outline" onClick={handleReset}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={handleApply}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {!hasApplied ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <h4>Select your filters</h4>
            <p>Choose filter options above and click "Apply Filters" to generate the report.</p>
          </div>
        ) : (
          <>
            <div className="report-header">
              <span className="stat-item"><strong>{groups.length}</strong> invoices</span>
            </div>
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer Code</th>
                    <th>Customer Name</th>
                    <th className="text-right">Invoice Amount Due</th>
                    <th className="text-right">Invoice Amount Received</th>
                    <th className="text-right">Invoice Amount Still Remaining</th>
                    <th>Receipt No.</th>
                    <th>Receipt Date</th>
                    <th className="text-right">Receipt Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="text-center p-4">Loading...</td></tr>
                  ) : groups.length === 0 ? (
                    <tr><td colSpan={10} className="text-center p-4" style={{ color: "var(--text-muted)" }}>No data found.</td></tr>
                  ) : (
                    groups.map((inv) => {
                      const remainVal = Number(inv.amount_remain);
                      const hasReceipts = inv.receipts.length > 0;
                      const rowCount = hasReceipts ? inv.receipts.length : 1;

                      if (!hasReceipts) {
                        return (
                          <tr key={inv.invoice_no}>
                            <td className="font-bold">{inv.invoice_no}</td>
                            <td>{formatDate(inv.invoice_date)}</td>
                            <td>{inv.customer_code}</td>
                            <td>{inv.customer_name}</td>
                            <td className="text-right">{formatBaht(inv.amount_due)}</td>
                            <td className="text-right">{formatBaht(inv.invoice_total_received)}</td>
                            <td className="text-right font-bold" style={{ color: remainVal > 0 ? "var(--danger, #ef4444)" : "var(--success, #22c55e)" }}>
                              {formatBaht(remainVal)}
                            </td>
                            <td colSpan={3} className="text-center" style={{ color: "var(--text-muted)" }}>—</td>
                          </tr>
                        );
                      }

                      return inv.receipts.map((rct, rIdx) => (
                        <tr key={`${inv.invoice_no}-${rIdx}`} style={rIdx > 0 ? { borderTop: "1px dashed var(--border)" } : {}}>
                          {/* Invoice master columns — only on first receipt row */}
                          {rIdx === 0 ? (
                            <>
                              <td className="font-bold" rowSpan={rowCount}>{inv.invoice_no}</td>
                              <td rowSpan={rowCount}>{formatDate(inv.invoice_date)}</td>
                              <td rowSpan={rowCount}>{inv.customer_code}</td>
                              <td rowSpan={rowCount}>{inv.customer_name}</td>
                              <td className="text-right" rowSpan={rowCount}>{formatBaht(inv.amount_due)}</td>
                              <td className="text-right" rowSpan={rowCount}>{formatBaht(inv.invoice_total_received)}</td>
                              <td className="text-right font-bold" rowSpan={rowCount} style={{ color: remainVal > 0 ? "var(--danger, #ef4444)" : "var(--success, #22c55e)" }}>
                                {formatBaht(remainVal)}
                              </td>
                            </>
                          ) : null}
                          {/* Receipt sub-row columns */}
                          <td>{rct.receipt_no}</td>
                          <td>{formatDate(rct.receipt_date)}</td>
                          <td className="text-right">{formatBaht(rct.receipt_amount)}</td>
                        </tr>
                      ));
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
