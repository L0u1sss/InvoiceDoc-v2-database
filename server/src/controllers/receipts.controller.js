import * as receiptsService from "../services/receipts.service.js";
import { CreateReceiptSchema } from "../models/receipt.model.js";
import { sendList, sendOne, sendCreated, sendOk, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function listReceipts(req, res) {
  try {
    const result = await receiptsService.listReceipts(req.query);
    sendList(res, result);
  } catch (err) {
    logger.error("listReceipts failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getReceipt(req, res) {
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.getReceipt(receiptNo);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOne(res, result);
  } catch (err) {
    logger.error("getReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function createReceipt(req, res) {
  const parsed = CreateReceiptSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  try {
    const result = await receiptsService.createReceipt(parsed.data);
    sendCreated(res, result);
  } catch (err) {
    logger.error("createReceipt failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function updateReceipt(req, res) {
  const parsed = CreateReceiptSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "Validation failed", 400, "VALIDATION_ERROR", parsed.error.flatten());
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.updateReceipt(receiptNo, parsed.data);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOk(res, result);
  } catch (err) {
    logger.error("updateReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function getOutstandingInvoices(req, res) {
  try {
    const customerCode = req.params.customerCode;
    const excludeReceiptId = req.query.excludeId ? Number(req.query.excludeId) : 0;
    const invoices = await receiptsService.getOutstandingInvoices(customerCode, excludeReceiptId);
    sendOne(res, invoices); // We just send the array as data
  } catch (err) {
    logger.error("getOutstandingInvoices failed", { error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}

export async function deleteReceipt(req, res) {
  try {
    const receiptNo = decodeURIComponent(req.params.receiptNo || "");
    const result = await receiptsService.deleteReceipt(receiptNo);
    if (!result) return sendError(res, "Receipt not found", 404);
    sendOk(res, result);
  } catch (err) {
    logger.error("deleteReceipt failed", { receiptNo: req.params.receiptNo, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}
