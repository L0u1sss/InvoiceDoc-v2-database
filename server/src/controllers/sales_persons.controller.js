import * as salesPersonsService from "../services/sales_persons.service.js";
import { sendList, sendOne, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listSalesPersons(req, res) {
  try {
    const result = await salesPersonsService.listSalesPersons(req.query);
    // sendList wraps data with { data, meta: { total, page, ... } } if present
    sendList(res, result);
  } catch (err) {
    logger.error("listSalesPersons failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getSalesPerson(req, res) {
  try {
    const code = req.params.id;
    const row = await salesPersonsService.getSalesPersonByCode(code);
    if (!row) return sendError(res, "Sales Person not found", 404);
    sendOne(res, row);
  } catch (err) {
    logger.error("getSalesPerson failed", { id: req.params.id, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createSalesPerson(req, res) {
  try {
    const row = await salesPersonsService.createSalesPerson(req.body);
    sendOne(res, row, 201);
  } catch (err) {
    logger.error("createSalesPerson failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function updateSalesPerson(req, res) {
  try {
    const row = await salesPersonsService.updateSalesPerson(req.params.id, req.body);
    if (!row) return sendError(res, "Sales Person not found", 404);
    sendOne(res, row);
  } catch (err) {
    logger.error("updateSalesPerson failed", { id: req.params.id, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function deleteSalesPerson(req, res) {
  try {
    await salesPersonsService.deleteSalesPerson(req.params.id);
    sendOne(res, { ok: true });
  } catch (err) {
    logger.error("deleteSalesPerson failed", { id: req.params.id, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}
