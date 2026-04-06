import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        suggestedUsers: [],
        userProfile: null,
        isFollowing: false,
        isFollower: false,
        requestPending: false,
        theme: localStorage.getItem('theme') || 'light-theme',
        token: localStorage.getItem('token') || null,
        isProfileLoading: false,
    },
    reducers: {
        // actions
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setAuthUser: (state, action) => {
            state.user = action.payload;
            if (action.payload === null) {
                state.token = null;
                localStorage.removeItem('token');
            }
        },
        setToken: (state, action) => {
            state.token = action.payload;
            if (action.payload) {
                localStorage.setItem('token', action.payload);
            } else {
                localStorage.removeItem('token');
            }
        },
        setSuggestedUsers: (state, action) => {
            state.suggestedUsers = action.payload;
        },
        setUserProfile: (state, action) => {
            state.userProfile = action.payload;
        },
        setProfileLoading: (state, action) => {
            state.isProfileLoading = action.payload;
        },
        setFollowRelationship: (state, action) => {
            const { isFollowing, isFollower, requestPending } = action.payload;
            state.isFollowing = isFollowing;
            state.isFollower = isFollower;
            state.requestPending = requestPending;
        },
        updateSuggestedUser: (state, action) => {
            const { targetUserId, updates } = action.payload;
            state.suggestedUsers = state.suggestedUsers.map(user =>
                user._id === targetUserId ? { ...user, ...updates } : user
            );
        },
        updateUserProfileReelStats: (state, action) => {
            const { reelId, likes, comment } = action.payload;
            if (state.userProfile) {
                const reelIndex = state.userProfile.reels?.findIndex(r => r._id === reelId);
                if (reelIndex !== undefined && reelIndex !== -1) {
                    if (likes !== undefined) state.userProfile.reels[reelIndex].likes = likes;
                    if (comment !== undefined) {
                        const exists = state.userProfile.reels[reelIndex].comments?.find(c => c._id === comment._id);
                        if (!exists) {
                            if (!state.userProfile.reels[reelIndex].comments) state.userProfile.reels[reelIndex].comments = [];
                            state.userProfile.reels[reelIndex].comments.push(comment);
                        }
                    }
                }

                const savedReelIndex = state.userProfile.savedReels?.findIndex(r => r._id === reelId);
                if (savedReelIndex !== undefined && savedReelIndex !== -1) {
                    if (likes !== undefined) state.userProfile.savedReels[savedReelIndex].likes = likes;
                    if (comment !== undefined) {
                        const exists = state.userProfile.savedReels[savedReelIndex].comments?.find(c => c._id === comment._id);
                        if (!exists) {
                            if (!state.userProfile.savedReels[savedReelIndex].comments) state.userProfile.savedReels[savedReelIndex].comments = [];
                            state.userProfile.savedReels[savedReelIndex].comments.push(comment);
                        }
                    }
                }
            }
        },
        updateUserProfilePostStats: (state, action) => {
            const { postId, userId, type, comment } = action.payload;
            if (state.userProfile) {
                // Update in posts array
                const postIndex = state.userProfile.posts?.findIndex(p => p._id === postId);
                if (postIndex !== undefined && postIndex !== -1) {
                    const post = state.userProfile.posts[postIndex];
                    if (type === 'like') {
                        if (!post.likes.some(id => (id._id || id) === userId)) post.likes.push(userId);
                    } else if (type === 'dislike') {
                        post.likes = post.likes.filter(id => (id._id || id) !== userId);
                    }
                    if (comment) {
                        if (!post.comments) post.comments = [];
                        const exists = post.comments.find(c => c._id === comment._id);
                        if (!exists) post.comments.push(comment);
                    }
                }

                // Update in bookmarks array (saved posts)
                const bookmarkIndex = state.userProfile.bookmarks?.findIndex(p => p._id === postId);
                if (bookmarkIndex !== undefined && bookmarkIndex !== -1) {
                    const post = state.userProfile.bookmarks[bookmarkIndex];
                    if (type === 'like') {
                        if (!post.likes.some(id => (id._id || id) === userId)) post.likes.push(userId);
                    } else if (type === 'dislike') {
                        post.likes = post.likes.filter(id => (id._id || id) !== userId);
                    }
                    if (comment) {
                        if (!post.comments) post.comments = [];
                        const exists = post.comments.find(c => c._id === comment._id);
                        if (!exists) post.comments.push(comment);
                    }
                }
            }
        },
        removeUserProfileReelComment: (state, action) => {
            const { reelId, commentId } = action.payload;
            if (state.userProfile) {
                const reelIndex = state.userProfile.reels?.findIndex(r => r._id === reelId);
                if (reelIndex !== undefined && reelIndex !== -1 && state.userProfile.reels[reelIndex].comments) {
                    state.userProfile.reels[reelIndex].comments = state.userProfile.reels[reelIndex].comments.filter(c => c._id !== commentId);
                }
                const savedReelIndex = state.userProfile.savedReels?.findIndex(r => r._id === reelId);
                if (savedReelIndex !== undefined && savedReelIndex !== -1 && state.userProfile.savedReels[savedReelIndex].comments) {
                    state.userProfile.savedReels[savedReelIndex].comments = state.userProfile.savedReels[savedReelIndex].comments.filter(c => c._id !== commentId);
                }
            }
        },
        editUserProfileReelComment: (state, action) => {
            const { reelId, commentId, text } = action.payload;
            if (state.userProfile) {
                const reelIndex = state.userProfile.reels?.findIndex(r => r._id === reelId);
                if (reelIndex !== undefined && reelIndex !== -1 && state.userProfile.reels[reelIndex].comments) {
                    const comment = state.userProfile.reels[reelIndex].comments.find(c => c._id === commentId);
                    if (comment) comment.text = text;
                }
                const savedReelIndex = state.userProfile.savedReels?.findIndex(r => r._id === reelId);
                if (savedReelIndex !== undefined && savedReelIndex !== -1 && state.userProfile.savedReels[savedReelIndex].comments) {
                    const comment = state.userProfile.savedReels[savedReelIndex].comments.find(c => c._id === commentId);
                    if (comment) comment.text = text;
                }
            }
        },
        updateUserProfileReelCommentLikes: (state, action) => {
            const { reelId, commentId, likes } = action.payload;
            if (state.userProfile) {
                const reelIndex = state.userProfile.reels?.findIndex(r => r._id === reelId);
                if (reelIndex !== undefined && reelIndex !== -1 && state.userProfile.reels[reelIndex].comments) {
                    const comment = state.userProfile.reels[reelIndex].comments.find(c => c._id === commentId);
                    if (comment) comment.likes = likes;
                }
                const savedReelIndex = state.userProfile.savedReels?.findIndex(r => r._id === reelId);
                if (savedReelIndex !== undefined && savedReelIndex !== -1 && state.userProfile.savedReels[savedReelIndex].comments) {
                    const comment = state.userProfile.savedReels[savedReelIndex].comments.find(c => c._id === commentId);
                    if (comment) comment.likes = likes;
                }
            }
        },
        toggleMuteUserAction: (state, action) => {
            const userId = action.payload;
            if (!state.user.mutedUsers) state.user.mutedUsers = [];
            const isMuted = state.user.mutedUsers.includes(userId);
            if (isMuted) {
                state.user.mutedUsers = state.user.mutedUsers.filter(id => id !== userId);
            } else {
                state.user.mutedUsers.push(userId);
            }
        },
        toggleBookmark: (state, action) => {
            const { postId, isReel } = action.payload;
            if (!state.user) return;

            const collection = isReel ? 'savedReels' : 'bookmarks';
            if (!state.user[collection]) state.user[collection] = [];

            const isSaved = state.user[collection].some(id => (id._id || id).toString() === postId.toString());

            if (isSaved) {
                state.user[collection] = state.user[collection].filter(id => (id._id || id).toString() !== postId.toString());
            } else {
                state.user[collection].push(postId);
            }

            // Sync userProfile if it's the current user's profile
            if (state.userProfile && state.userProfile._id === state.user._id) {
                if (!state.userProfile[collection]) state.userProfile[collection] = [];
                const profileIsSaved = state.userProfile[collection].some(p => (p._id || p).toString() === postId.toString());
                
                if (profileIsSaved) {
                    state.userProfile[collection] = state.userProfile[collection].filter(p => (p._id || p).toString() !== postId.toString());
                } else {
                    // Note: This won't have full post details if we just push ID, 
                    // but for "instant" UI on the bookmark icon it works.
                    state.userProfile[collection].push(postId);
                }
            }
        },
        addUserProfileReel: (state, action) => {
            if (state.userProfile && (state.userProfile._id === action.payload.author?._id || state.userProfile._id === action.payload.author)) {
                if (!state.userProfile.reels) state.userProfile.reels = [];
                state.userProfile.reels = [action.payload, ...state.userProfile.reels];
            }
        },
        addUserProfilePost: (state, action) => {
             // If we're viewing a profile, and it's either our own or the author's profile
             const postAuthorId = action.payload.author?._id || action.payload.author;
             if (state.userProfile && state.userProfile._id === postAuthorId) {
                if (!state.userProfile.posts) state.userProfile.posts = [];
                state.userProfile.posts = [action.payload, ...state.userProfile.posts];
             }
        },
        removeUserProfileReel: (state, action) => {
            const reelId = action.payload;
            if (state.userProfile) {
                state.userProfile.reels = state.userProfile.reels?.filter(r => r._id !== reelId);
                state.userProfile.savedReels = state.userProfile.savedReels?.filter(r => r._id !== reelId);
            }
        }
    }
});

export const { setTheme, setAuthUser, setToken, setSuggestedUsers, setUserProfile, setProfileLoading, updateSuggestedUser, setFollowRelationship, updateUserProfileReelStats, updateUserProfilePostStats, removeUserProfileReelComment, editUserProfileReelComment, updateUserProfileReelCommentLikes, toggleMuteUserAction, toggleBookmark, addUserProfileReel, addUserProfilePost, removeUserProfileReel } = authSlice.actions;
export default authSlice.reducer;

