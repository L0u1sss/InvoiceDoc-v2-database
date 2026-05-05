import { http } from "./http.js";

function unwrap(res) {
  if (res && res.success === false && res.error) throw new Error(res.error.message);
  return res;
}

export async function listSalesPersons(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = unwrap(await http(`/api/sales_persons${query ? `?${query}` : ""}`));
  return { data: res.data, ...(res.meta || {}) };
}

export async function getSalesPerson(id) {
  const res = unwrap(await http(`/api/sales_persons/${encodeURIComponent(id)}`));
  return res.data;
}

export async function createSalesPerson(payload) {
  const res = unwrap(await http(`/api/sales_persons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  return res.data;
}

export async function updateSalesPerson(id, payload) {
  const res = unwrap(await http(`/api/sales_persons/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }));
  return res.data;
}

export async function deleteSalesPerson(id) {
  const res = unwrap(await http(`/api/sales_persons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  }));
  return res;
}
