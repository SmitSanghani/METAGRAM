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
        }
    }
});

export const { setTheme, setAuthUser, setToken, setSuggestedUsers, setUserProfile, updateSuggestedUser, setFollowRelationship, updateUserProfileReelStats, removeUserProfileReelComment, editUserProfileReelComment, updateUserProfileReelCommentLikes, toggleMuteUserAction } = authSlice.actions;
export default authSlice.reducer;

