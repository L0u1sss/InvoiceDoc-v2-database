import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listReceipts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/receipts${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getReceipt(receiptNo) {
  const res = unwrap(await http(`/api/receipts/${encodeURIComponent(receiptNo)}`));
  return res.data;
}

export async function getOutstandingInvoices(customerCode, excludeReceiptId = 0) {
  const res = unwrap(await http(`/api/receipts/outstanding/${encodeURIComponent(customerCode)}?excludeId=${excludeReceiptId}`));
  return res.data;
}

export async function createReceipt(data) {
  const res = unwrap(await http("/api/receipts", { method: "POST", body: JSON.stringify(data) }));
  return res.data;
}

export async function updateReceipt(receiptNo, data) {
  const res = unwrap(await http(`/api/receipts/${encodeURIComponent(receiptNo)}`, { method: "PUT", body: JSON.stringify(data) }));
  return res.data;
}

export async function deleteReceipt(receiptNo) {
  const res = unwrap(await http(`/api/receipts/${encodeURIComponent(receiptNo)}`, { method: "DELETE" }));
  return res.data;
}
