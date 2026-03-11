import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';
import { addNewPost, getAllPosts, getUserPost, likePost, dislikePost, addComment, getCommentsOnPost, deletePost, bookmarkPost, deleteComment, toggleLikeComment, editComment } from '../controllers/post.controller.js';

const router = express.Router();

router.route("/addpost").post(isAuthenticated, upload.single('image'), addNewPost);
router.route("/all").get(isAuthenticated, getAllPosts);
router.route("/userpost/all").get(isAuthenticated, getUserPost);
router.route("/:id/like").get(isAuthenticated, likePost);
router.route("/:id/dislike").get(isAuthenticated, dislikePost);
router.route("/:id/comment").post(isAuthenticated, addComment);
router.route("/:id/comment/all").post(isAuthenticated, getCommentsOnPost);
router.route("/comment/delete/:id").delete(isAuthenticated, deleteComment);
router.route("/comment/edit/:id").put(isAuthenticated, editComment);
router.route("/comment/like/:id").post(isAuthenticated, toggleLikeComment);
router.route("/delete/:id").delete(isAuthenticated, deletePost);
router.route("/:id/bookmark").post(isAuthenticated, bookmarkPost);

export default router;