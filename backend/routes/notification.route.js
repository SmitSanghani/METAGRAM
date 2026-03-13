import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { getNotifications, markAsRead, markSingleAsRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.route("/").get(isAuthenticated, getNotifications);
router.route("/read").post(isAuthenticated, markAsRead);
router.route("/:notificationId/read").post(isAuthenticated, markSingleAsRead);

export default router;
