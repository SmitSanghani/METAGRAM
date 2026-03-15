import express from 'express';
import { editProfile, followOrUnfollow, getProfile, getSuggestedUsers, getChatUsers, login, logout, register, acceptFollowRequest, deleteFollowRequest, toggleUserStatus, changePassword, checkUsername, searchUsers, addToRecentSearch, removeFromRecentSearch, getRecentSearches, clearRecentSearches, getLikedActivity, getCommentActivity, blockUser, unblockUser, getBlockedUsers, toggleMuteUser, linkAccount, deleteAccount } from '../controllers/user.controller.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import upload from '../middlewares/multer.js';

const router = express.Router();

router.route('/activity/likes').get(isAuthenticated, getLikedActivity);
router.route('/activity/comments').get(isAuthenticated, getCommentActivity);

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/check-username/:username").get(checkUsername);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single('profilePicture'), editProfile);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/chatusers').get(isAuthenticated, getChatUsers);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow);
router.route('/follow/accept/:id').post(isAuthenticated, acceptFollowRequest);
router.route('/follow/delete/:id').post(isAuthenticated, deleteFollowRequest);
router.route('/admin/toggle-status/:id').post(isAuthenticated, toggleUserStatus);
router.route('/change-password').post(isAuthenticated, changePassword);
router.route('/search').get(isAuthenticated, searchUsers);
router.route('/recent-search').get(isAuthenticated, getRecentSearches);
router.route('/recent-search/add/:id').post(isAuthenticated, addToRecentSearch);
router.route('/recent-search/remove/:id').delete(isAuthenticated, removeFromRecentSearch);
router.route('/recent-search/clear-all').delete(isAuthenticated, clearRecentSearches);
router.route('/block/:id').post(isAuthenticated, blockUser);
router.route('/unblock/:id').post(isAuthenticated, unblockUser);
router.route('/blocked-users').get(isAuthenticated, getBlockedUsers);
router.route('/delete-account').delete(isAuthenticated, deleteAccount);
router.route('/link-account').post(isAuthenticated, linkAccount);
router.route('/toggle-mute/:id').post(isAuthenticated, toggleMuteUser);

export default router;