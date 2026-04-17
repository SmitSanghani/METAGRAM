import { createSlice } from "@reduxjs/toolkit";

const reelSlice = createSlice({
    name: 'reel',
    initialState: {
        reels: [],
        isReelUploadOpen: false
    },
    reducers: {
        setReelUploadOpen: (state, action) => {
            state.isReelUploadOpen = action.payload;
        },
        setReels: (state, action) => {
            state.reels = action.payload;
        },
        addReel: (state, action) => {
            state.reels = [action.payload, ...state.reels];
        },
        updateReelLikes: (state, action) => {
            const { reelId, likes } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) reel.likes = likes;
        },
        addReelComment: (state, action) => {
            const { reelId, comment } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) {
                const alreadyExists = reel.comments.find(c => c._id === comment._id);
                if (!alreadyExists) {
                    reel.comments.push(comment);
                }
            }
        },
        incrementReelViews: (state, action) => {
            const reelId = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) reel.viewsCount += 1;
        },
        updateReelViews: (state, action) => {
            const { reelId, viewsCount } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) reel.viewsCount = viewsCount;
        },
        deleteReelComment: (state, action) => {
            const { reelId, commentId } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) {
                reel.comments = reel.comments.filter(c => c._id !== commentId);
            }
        },
        editReelComment: (state, action) => {
            const { reelId, commentId, text } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) {
                const comment = reel.comments.find(c => c._id === commentId);
                if (comment) comment.text = text;
            }
        },
        updateReelCommentLikes: (state, action) => {
            const { reelId, commentId, likes } = action.payload;
            const reel = state.reels.find(r => r._id === reelId);
            if (reel) {
                const comment = reel.comments.find(c => c._id === commentId);
                if (comment) comment.likes = likes;
            }
        },
        deleteReel: (state, action) => {
            state.reels = state.reels.filter(r => r._id !== action.payload);
        },
        updateReel: (state, action) => {
            const updatedReel = action.payload;
            state.reels = state.reels.map(r => r._id === updatedReel._id ? updatedReel : r);
        }
    }
});

export const {
    setReelUploadOpen,
    setReels,
    addReel,
    updateReelLikes,
    addReelComment,
    incrementReelViews,
    deleteReelComment,
    editReelComment,
    deleteReel,
    updateReelViews,
    updateReelCommentLikes,
    updateReel
} = reelSlice.actions;
export default reelSlice.reducer;
