import React from "react";
import CustomerPickerModal from "./CustomerPickerModal.jsx";
import { AlertModal } from "./Modal.jsx";
import { getCustomer } from "../api/customers.api.js";
import { getOutstandingInvoices } from "../api/receipts.api.js";
import { formatBaht } from "../utils.js";

export default function ReceiptForm({ onSubmit, submitting, initialData }) {
  const [receiptNo, setReceiptNo] = React.useState("");
  const [receiptDate, setReceiptDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [customerCode, setCustomerCode] = React.useState("");
  const [customerLabel, setCustomerLabel] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("Cash");
  const [notes, setNotes] = React.useState("");

  const [items, setItems] = React.useState([]);

  const [showCustomerLov, setShowCustomerLov] = React.useState(false);
  const [autoCode, setAutoCode] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    if (initialData) {
      setReceiptNo(initialData.receipt_no || "");
      const d = initialData.receipt_date ? new Date(initialData.receipt_date).toISOString().slice(0, 10) : "";
      setReceiptDate(d);
      setCustomerCode(initialData.customer_code || "");
      setCustomerLabel(initialData.customer_label || "");
      setPaymentMethod(initialData.payment_method || "Cash");
      setNotes(initialData.notes || "");
      setItems(initialData.line_items || []);
    }
  }, [initialData]);

  React.useEffect(() => {
    if (!customerCode) {
      if (!initialData) setItems([]);
      return;
    }
    
    // Fetch outstanding invoices whenever customer changes
    // But if we are editing (initialData exists) and customer hasn't changed, 
    // the backend outstanding invoices might be merged with initialData items.
    
    const excludeId = initialData?.receipt_id || 0;

    getOutstandingInvoices(customerCode, excludeId)
      .then(invoices => {
        // Merge with existing items (if editing, to keep the saved amount_received)
        const newItems = invoices.map(inv => {
          const expectedRemain = Number(inv.amount_due) - Number(inv.amount_already_received);
          
          // Check if this invoice is already in our `items` state (from initialData or active editing)
          const existing = items.find(it => it.invoice_no === inv.invoice_no);
          if (existing) {
             return {
                ...existing,
                amount_due: inv.amount_due,
                amount_already_received: Number(inv.amount_already_received),
                amount_remain: expectedRemain
             };
          }

          return {
            line_item_id: null,
            invoice_no: inv.invoice_no,
            amount_due: inv.amount_due,
            amount_already_received: Number(inv.amount_already_received),
            amount_remain: expectedRemain,
            amount_received: initialData ? 0 : expectedRemain, // edit mode → ไม่ตั้งค่าอัตโนมัติ
            selected: !initialData // edit mode → invoice ใหม่ที่ไม่เคยอยู่ใน receipt = ไม่ติ๊ก
          };
        });
        
        // Remove invoices that have <= 0 remain EXCEPT if we are actively paying them
        const filtered = newItems.filter(it => it.amount_remain > 0 || Number(it.amount_received) > 0);
        setItems(filtered);
      })
      .catch(e => {
        console.error("Failed to fetch outstanding invoices", e);
        setErr("Could not load outstanding invoices for this customer.");
      });
      // eslint-disable-next-line
  }, [customerCode, initialData]);

  const loadCustomer = async (code) => {
    if (!code) {
      setCustomerLabel("");
      return;
    }
    try {
      const c = await getCustomer(code);
      setCustomerLabel(`${c.name}`);
      setErr("");
    } catch {
      setCustomerLabel("");
      setErr("Customer not found.");
    }
  };

  const handleCustomerCodeBlur = (e) => {
    loadCustomer(e.target.value);
  };

  const selectCustomer = (c) => {
    setCustomerCode(c.code);
    setCustomerLabel(c.name);
    setShowCustomerLov(false);
    setErr("");
  };

  const updateItem = (index, patch) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    setItems(next);
  };

  // toggle checkbox: ถ้า uncheck → reset amount_received = 0
  const toggleSelected = (index) => {
    const next = [...items];
    const wasSelected = next[index].selected !== false; // default true
    next[index] = {
      ...next[index],
      selected: !wasSelected,
      amount_received: wasSelected ? 0 : next[index].amount_remain,
    };
    setItems(next);
  };

  // คิด total เฉพาะ row ที่ selected
  const totalReceived = items
    .filter(it => it.selected !== false)
    .reduce((sum, it) => sum + Number(it.amount_received || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerCode) return setErr("Please select a customer.");
    if (items.length === 0) return setErr("No outstanding invoices to pay.");

    // เอาเฉพาะ row ที่ selected และมีจำนวนเงิน > 0
    const activeItems = items.filter(it => it.selected !== false && Number(it.amount_received) > 0);
    if (activeItems.length === 0) return setErr("Please enter the received amount for at least one invoice.");

    // Validate no negative or excessive amounts
    for (const it of activeItems) {
       if (Number(it.amount_received) < 0) return setErr(`Amount received for ${it.invoice_no} cannot be negative`);
       if (Number(it.amount_received) > Number(it.amount_remain)) {
           return setErr(`Amount received for ${it.invoice_no} exceeds the remaining balance!`);
       }
    }

    const payload = {
      receipt_no: initialData ? receiptNo.trim() : (autoCode ? "" : receiptNo.trim()),
      receipt_date: receiptDate,
      customer_code: customerCode,
      payment_method: paymentMethod,
      notes: notes,
      line_items: activeItems.map(it => {
        const line = {
          invoice_no: it.invoice_no,
          amount_received: Number(it.amount_received)
        };
        if (it.line_item_id) line.id = Number(it.line_item_id);
        return line;
      })
    };

    onSubmit(payload);
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <AlertModal isOpen={!!err} onClose={() => setErr("")} title="Validation Error" message={err} />
      {showCustomerLov && (
        <CustomerPickerModal 
          isOpen={showCustomerLov} 
          onClose={() => setShowCustomerLov(false)}
          initialSearch={customerCode}
          onSelect={(code, name) => selectCustomer({ code, name })} 
        />
      )}

      <div className="grid font-sm" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <div className="form-group">
            <label className="form-label">Customer Code <span className="required-marker">*</span></label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                onBlur={handleCustomerCodeBlur}
                placeholder="e.g. C001"
                required
              />
              <button 
                type="button" 
                className="btn btn-primary" 
                title="List of Values"
                onClick={() => setShowCustomerLov(true)}
              >
                LoV
              </button>
              {customerCode && (
                <button
                  type="button"
                  onClick={() => { setCustomerCode(""); setCustomerLabel(""); }}
                  title="Clear"
                  style={{
                    padding: "0 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-body)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input className="form-control" disabled value={customerLabel} readOnly placeholder="—" />
          </div>
          <div className="form-group">
            <label>Payment Method <span className="required-marker">*</span></label>
            <select 
               className="form-control" 
               value={paymentMethod} 
               onChange={(e) => setPaymentMethod(e.target.value)} 
               style={{ maxWidth: '250px' }}
            >
               <option value="Cash">Cash</option>
               <option value="Bank transfer">Bank transfer</option>
               <option value="Check">Check</option>
            </select>
          </div>
          <div className="form-group">
            <label>Payment Notes</label>
            <textarea
                className="form-control"
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Check No. / Bank Ref / Remarks"
            />
          </div>
        </div>

        <div>
          <div className="form-group">
            <label className="form-label">{(!initialData && autoCode) ? "Receipt No." : <>Receipt No. <span className="required-marker">*</span></>}</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="form-control"
                required={!autoCode}
                disabled={autoCode && !initialData}
                readOnly={!!initialData}
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder={initialData ? "" : "e.g. RCT26-00001"}
                style={{ maxWidth: '200px' }}
              />
              {!initialData && (
                <div className="form-inline-option whitespace-nowrap pt-2">
                  <input type="checkbox" checked={autoCode} onChange={e => setAutoCode(e.target.checked)} id="rct_auto" />
                  <label htmlFor="rct_auto" className="ml-1 text-sm text-muted">Auto</label>
                </div>
              )}
            </div>
          </div>
          <div className="form-group">
            <label>Receipt Date <span className="required-marker">*</span></label>
            <input
              type="date"
              className="form-control"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              required
              style={{ maxWidth: '200px' }}
            />
          </div>
        </div>
      </div>

      <h4 className="mb-4">Outstanding Invoices Selection</h4>
      <div className="table-container mb-4">
        {items.length === 0 ? (
           <div className="p-4 text-center text-muted bg-body" style={{ borderRadius: 8 }}>
               {customerCode ? "No outstanding invoices for this customer." : "Please select a customer first."}
           </div>
        ) : (
        <table className="modern-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>{/* checkbox column */}
              <th>Invoice No</th>
              <th className="text-right">Full Amount Due</th>
              <th className="text-right">Amount Already Received</th>
              <th className="text-right">Amount Remaining</th>
              <th className="text-right" style={{ width: 140 }}>Amount Received Here</th>
              <th className="text-right">Amount Still Remaining</th>
            </tr>
          </thead>
          <tbody>
             {items.map((it, idx) => {
                 const isSelected = it.selected !== false;
                 const stillRemain = isSelected
                   ? Number(it.amount_remain) - Number(it.amount_received || 0)
                   : Number(it.amount_remain);
                 const overpaid = stillRemain < 0;

                 return (
                 <tr key={idx} style={{ opacity: isSelected ? 1 : 0.45 }}>
                     {/* ✅ Checkbox เลือก/ยกเลิก invoice นี้ */}
                     <td style={{ textAlign: 'center' }}>
                         <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={() => toggleSelected(idx)}
                             style={{ width: 16, height: 16, cursor: 'pointer' }}
                         />
                     </td>
                     <td>{it.invoice_no}</td>
                     <td className="text-right">{formatBaht(it.amount_due)}</td>
                     <td className="text-right">{formatBaht(it.amount_already_received)}</td>
                     <td className="text-right font-bold text-primary">{formatBaht(it.amount_remain)}</td>
                     <td className="text-right">
                         <input 
                             type="number"
                             min="0"
                             max={it.amount_remain}
                             step="0.01"
                             className="form-control text-right"
                             value={it.amount_received ?? ""}
                             onChange={(e) => updateItem(idx, { amount_received: e.target.value })}
                             style={{ padding: '4px 8px' }}
                             disabled={!isSelected}
                         />
                     </td>
                     <td className="text-right font-bold" style={{ color: overpaid ? '#ef4444' : 'var(--text-main)' }}>
                         {formatBaht(stillRemain)}
                     </td>
                 </tr>
                 );
             })}
          </tbody>
        </table>
        )}
      </div>

      <div className="flex justify-between items-center bg-body p-4 mb-4" style={{ borderRadius: 8 }}>
          <div className="text-muted" style={{ fontSize: '0.8rem', maxWidth: 400 }}>
             Tip: Blank or zero "Amount Received Here" will ignore the invoice line during save.
          </div>
          <div className="flex justify-between" style={{ minWidth: 250, fontSize: '1.2rem' }}>
              <span className="font-bold">Total Received:</span>
              <span className="font-bold text-primary">{formatBaht(totalReceived)}</span>
          </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : (initialData ? "Save Changes" : "Create Receipt")}
        </button>
      </div>
    </form>
  );
}
