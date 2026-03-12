import express from 'express';
import { editProfile, followOrUnfollow, getProfile, getSuggestedUsers, getChatUsers, login, logout, register, acceptFollowRequest, deleteFollowRequest, toggleUserStatus, changePassword } from '../controllers/user.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single('profilePicture'), editProfile);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/chatusers').get(isAuthenticated, getChatUsers);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow);
router.route('/follow/accept/:id').post(isAuthenticated, acceptFollowRequest);
router.route('/follow/delete/:id').post(isAuthenticated, deleteFollowRequest);
router.route('/admin/toggle-status/:id').post(isAuthenticated, toggleUserStatus);
router.route('/change-password').post(isAuthenticated, changePassword);

export default router;