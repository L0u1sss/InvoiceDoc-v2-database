import express from "express";
import * as receiptsController from "../controllers/receipts.controller.js";

const router = express.Router();

router.get("/", receiptsController.listReceipts);
router.get("/outstanding/:customerCode", receiptsController.getOutstandingInvoices);
router.get("/:receiptNo", receiptsController.getReceipt);
router.post("/", receiptsController.createReceipt);
router.put("/:receiptNo", receiptsController.updateReceipt);
router.delete("/:receiptNo", receiptsController.deleteReceipt); // ลบ receipt


export default router;
