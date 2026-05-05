import React from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { getReceipt, createReceipt, updateReceipt } from "../../api/receipts.api.js";
import { toast } from "react-toastify";
import { formatBaht, formatDate } from "../../utils.js";
import ReceiptForm from "../../components/ReceiptForm.jsx";
import Loading from "../../components/Loading.jsx";

export default function ReceiptPage({ mode: propMode }) {
    const { id } = useParams();
    const mode = propMode || (id ? "view" : "create");
    const nav = useNavigate();
    
    const [receiptData, setReceiptData] = React.useState(null);
    const [initialData, setInitialData] = React.useState(null);
    const [err, setErr] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (mode === "create") {
            setLoading(false);
        } else if (mode === "view") {
            getReceipt(id)
                .then((data) => {
                    setReceiptData(data);
                    setLoading(false);
                })
                .catch((e) => {
                    setErr(String(e.message || e));
                    setLoading(false);
                });
        } else {
            getReceipt(id)
                .then((rct) => {
                    setReceiptData(rct);
                    const h = rct.header;
                    setInitialData({
                        receipt_id: h.id,
                        receipt_no: h.receipt_no,
                        customer_code: h.customer_code,
                        customer_label: `${h.customer_code || ''} - ${h.customer_name}`.replace(/^ - /, ''),
                        receipt_date: h.receipt_date,
                        payment_method: h.payment_method,
                        notes: h.notes,
                        line_items: rct.line_items.map(li => ({
                            line_item_id: li.id,
                            invoice_no: li.invoice_no,
                            amount_due: li.amount_due,
                            amount_already_received: Number(li.amount_already_received || 0),
                            amount_remain: Number(li.amount_due) - Number(li.amount_already_received || 0),
                            amount_received: Number(li.amount_received || 0),
                        }))
                    });
                    setLoading(false);
                })
                .catch((e) => {
                    setErr(String(e.message || e));
                    setLoading(false);
                });
        }
    }, [id, mode]);

    async function onSubmit(payload) {
        setErr("");
        setSubmitting(true);
        try {
            if (mode === "create") {
                const res = await createReceipt(payload);
                toast.success("Receipt created.");
                nav(`/receipts/${encodeURIComponent(res.receipt_no)}`);
            } else {
                await updateReceipt(id, payload);
                toast.success("Receipt updated.");
                nav(`/receipts/${encodeURIComponent(id)}`);
            }
        } catch (e) {
            const msg = String(e.message || e);
            setErr(msg);
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    const handlePrint = () => window.print();

    if (loading) return <Loading size="large" />;

    const isView = mode === "view";
    const isCreate = mode === "create";

    // View Mode - Receipt Preview with Print
    if (isView && receiptData) {
        const h = receiptData.header;
        const lines = receiptData.line_items || [];

        return (
            <div className="invoice-preview">
                <div className="page-header no-print">
                    <h3 className="page-title">Receipt {h.receipt_no}</h3>
                    <div className="flex gap-4">
                        <Link to="/receipts" className="btn btn-outline">← Back</Link>
                        <Link to={`/receipts/${id}/edit`} className="btn btn-outline">Edit</Link>
                        <button onClick={handlePrint} className="btn btn-primary">
                            <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print PDF
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="flex justify-between mb-4">
                        <div>
                            <div className="brand mb-4">InvoiceDoc v2</div>
                            <div className="font-bold">Received From</div>
                            <div>{h.customer_name}</div>
                            <div className="text-muted">{h.address_line1 || "-"}</div>
                            <div className="text-muted">{h.address_line2 || ""}</div>
                        </div>
                        <div className="text-right">
                            <h2 className="mb-4">OFFICIAL RECEIPT</h2>
                            <div><span className="font-bold">Date:</span> {formatDate(h.receipt_date)}</div>
                            <div><span className="font-bold">Receipt No:</span> {h.receipt_no}</div>
                        </div>
                    </div>

                    <div className="mb-4 p-4 bg-body" style={{ borderRadius: 8 }}>
                        <div className="flex gap-6">
                            <div><span className="font-bold">Payment Method:</span> {h.payment_method}</div>
                            {h.notes && <div><span className="font-bold">Notes:</span> {h.notes}</div>}
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Ref. Invoice No</th>
                                    <th className="text-right">Invoice Amount Due</th>
                                    <th className="text-right">Amount Received</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((li) => (
                                    <tr key={li.id}>
                                        <td>{li.invoice_no}</td>
                                        <td className="text-right">{formatBaht(li.amount_due)}</td>
                                        <td className="text-right font-bold text-primary">{formatBaht(li.amount_received)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex justify-between">
                        <div className="text-muted" style={{ maxWidth: 300, fontSize: '0.8rem' }}>
                            Thank you for your payment.
                        </div>
                        <div style={{ minWidth: 200 }}>
                            <div className="flex justify-between mt-4 p-2 bg-body font-bold" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>
                                <span>Total Received:</span>
                                <span>{formatBaht(h.total_received)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const title = isCreate ? "Create Receipt" : `Edit Receipt ${id}`;

    return (
        <div className="invoice-page">
            <div className="page-header">
                <h3 className="page-title">{title}</h3>
                <Link to="/receipts" className="btn btn-outline">
                    <svg style={{ marginRight: 8 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Back
                </Link>
            </div>
            {err && <div className="alert alert-error">{err}</div>}
            <ReceiptForm
                onSubmit={onSubmit}
                submitting={submitting}
                initialData={isCreate ? null : initialData}
            />
        </div>
    );
}
