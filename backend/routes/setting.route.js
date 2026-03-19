import express from "express";
import isAuthenticated, { isAdmin } from "../middlewares/isAuthenticated.js";
import { getSettings, updateSettings } from "../controllers/setting.controller.js";

const router = express.Router();

router.get("/get", getSettings);
router.post("/update", isAuthenticated, isAdmin, updateSettings);

export default router;
