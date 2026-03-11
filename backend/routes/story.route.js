import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
import { getAllStories, getUserStories, uploadStory, viewStory, deleteStory, likeStory, addStoryComment, updateCloseFriends } from "../controllers/story.controller.js";

const router = express.Router();

router.route("/all").get(isAuthenticated, getAllStories);
router.route("/user/:id").get(isAuthenticated, getUserStories);
router.route("/upload").post(isAuthenticated, upload.array("media", 10), uploadStory);
router.route("/close-friends").post(isAuthenticated, updateCloseFriends);
router.route("/:id/view").post(isAuthenticated, viewStory);
router.route("/:id").delete(isAuthenticated, deleteStory);
router.route("/:id/like").post(isAuthenticated, likeStory);
router.route("/:id/comment").post(isAuthenticated, addStoryComment);

export default router;
