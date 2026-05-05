import express from "express";
import * as configurationsController from "../controllers/configurations.controller.js";

const router = express.Router();

router.get("/:key", configurationsController.getConfig);

export default router;
