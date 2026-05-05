import { Router } from "express";
import * as controller from "../controllers/sales_persons.controller.js";

const router = Router();

router.get("/", controller.listSalesPersons);
router.get("/:id", controller.getSalesPerson);
router.post("/", controller.createSalesPerson);
router.put("/:id", controller.updateSalesPerson);
router.delete("/:id", controller.deleteSalesPerson);

export default router;
