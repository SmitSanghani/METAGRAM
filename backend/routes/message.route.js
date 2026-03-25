import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';
import { 
    addReaction, deleteMessage, getMessages, markAsSeen, 
    sendMessage, getUnreadCounts, deleteConversation,
    createGroup, addGroupMembers, removeGroupMember
} from '../controllers/message.controller.js';

const router = express.Router();

router.route("/send/:id").post(isAuthenticated, upload.single('media'), sendMessage);
router.route("/all/:id").get(isAuthenticated, getMessages);
router.route("/seen/:id").get(isAuthenticated, markAsSeen);
router.route("/delete/:id").delete(isAuthenticated, deleteMessage);
router.route("/react/:id").post(isAuthenticated, addReaction);
router.route("/unread-counts").get(isAuthenticated, getUnreadCounts);
router.route("/delete-chat/:id").delete(isAuthenticated, deleteConversation);

// Group Chat Routes
router.route("/group/create").post(isAuthenticated, createGroup);
router.route("/group/add").post(isAuthenticated, addGroupMembers);
router.route("/group/remove").post(isAuthenticated, removeGroupMember);

export default router;  