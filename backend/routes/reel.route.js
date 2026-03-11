import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import {
    uploadReel,
    getReelsFeed,
    likeOrUnlikeReel,
    addCommentToReel,
    deleteCommentFromReel,
    incrementViews,
    toggleSaveReel,
    deleteReel,
    likeOrUnlikeComment,
    editCommentFromReel,
    editReel,
    getReelById
} from "../controllers/reel.controller.js";

const router = express.Router();

router.route("/upload").post(isAuthenticated, upload.single("video"), uploadReel);
router.route("/feed").get(isAuthenticated, getReelsFeed);
router.route("/like/:id").post(isAuthenticated, likeOrUnlikeReel);
router.route("/comment/:id").post(isAuthenticated, addCommentToReel).delete(isAuthenticated, deleteCommentFromReel).put(isAuthenticated, editCommentFromReel);
router.route("/comment/like/:id").post(isAuthenticated, likeOrUnlikeComment);
router.route("/view/:id").post(isAuthenticated, incrementViews);
router.route("/save/:id").post(isAuthenticated, toggleSaveReel);
router.route("/delete/:id").delete(isAuthenticated, deleteReel);
router.route("/edit/:id").put(isAuthenticated, editReel);
router.route("/:id").get(isAuthenticated, getReelById);

export default router;
