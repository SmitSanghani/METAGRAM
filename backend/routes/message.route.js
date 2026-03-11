import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';
import { addReaction, deleteMessage, getMessages, markAsSeen, sendMessage, getUnreadCounts } from '../controllers/message.controller.js';

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.single('media'), sendMessage);
router.route("/all/:id").get(isAuthenticated, getMessages);
router.route("/seen/:id").get(isAuthenticated, markAsSeen);
router.route("/delete/:id").delete(isAuthenticated, deleteMessage);
router.route("/react/:id").post(isAuthenticated, addReaction);
router.route("/unread-counts").get(isAuthenticated, getUnreadCounts);

export default router;  