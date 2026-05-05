import * as configService from "../services/configurations.service.js";
import { sendOne, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

export async function getConfig(req, res) {
  try {
    const key = req.params.key;
    const value = await configService.getConfig(key);
    if (value === null) {
      return sendError(res, "Configuration not found", 404);
    }
    // Return simple JSON object with the value
    sendOne(res, { key, value });
  } catch (err) {
    logger.error("getConfig failed", { key: req.params.key, error: err?.message ?? String(err) });
    sendError(res, err?.message ?? String(err), 500);
  }
}
