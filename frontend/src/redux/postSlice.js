import { createSlice } from "@reduxjs/toolkit";

const postSlice = createSlice({
    name: "post",
    initialState: {
        posts: [],
        selectedPost: null,
        isCreatePostOpen: false
    },
    reducers: {
        setCreatePostOpen(state, action) {
            state.isCreatePostOpen = action.payload;
        },
        //actions
        setPosts(state, action) {
            state.posts = action.payload;
        },
        setSelectedPost(state, action) {
            state.selectedPost = action.payload;
        },
        updatePostLikes: (state, action) => {
            const { postId, userId, type } = action.payload;
            const post = state.posts.find(p => p._id?.toString() === postId?.toString());
            if (post) {
                if (type === 'like') {
                    if (!post.likes.some(id => (id._id || id).toString() === userId.toString())) post.likes.push(userId);
                } else {
                    post.likes = post.likes.filter(id => (id._id || id).toString() !== userId.toString());
                }
            }
            if (state.selectedPost?._id?.toString() === postId?.toString()) {
                if (type === 'like') {
                    if (!state.selectedPost.likes.some(id => (id._id || id).toString() === userId.toString())) state.selectedPost.likes.push(userId);
                } else {
                    state.selectedPost.likes = state.selectedPost.likes.filter(id => (id._id || id).toString() !== userId.toString());
                }
            }
        },
        updatePostCommentLikes: (state, action) => {
            const { postId, commentId, likes } = action.payload;
            const post = state.posts.find(p => p._id?.toString() === postId?.toString());
            if (post) {
                const comment = post.comments.find(c => c._id?.toString() === commentId?.toString());
                if (comment) comment.likes = likes;
            }
            if (state.selectedPost?._id?.toString() === postId?.toString()) {
                const comment = state.selectedPost.comments.find(c => c._id?.toString() === commentId?.toString());
                if (comment) comment.likes = likes;
            }
        },
        deletePostComment: (state, action) => {
            const { postId, commentId } = action.payload;
            const post = state.posts.find(p => p._id?.toString() === postId?.toString());
            if (post) {
                post.comments = post.comments.filter(c => c._id?.toString() !== commentId?.toString());
            }
            if (state.selectedPost?._id?.toString() === postId?.toString()) {
                state.selectedPost.comments = state.selectedPost.comments.filter(c => c._id?.toString() !== commentId?.toString());
            }
        },
        addPostComment: (state, action) => {
            const { postId, comment } = action.payload;
            const post = state.posts.find(p => p._id?.toString() === postId?.toString());
            if (post) {
                const exists = post.comments.find(c => c._id?.toString() === comment._id?.toString());
                if (!exists) post.comments.push(comment);
            }
            if (state.selectedPost?._id?.toString() === postId?.toString()) {
                const exists = state.selectedPost.comments.find(c => c._id?.toString() === comment._id?.toString());
                if (!exists) state.selectedPost.comments.push(comment);
            }
        }
    }
});

export const { setCreatePostOpen, setPosts, setSelectedPost, updatePostCommentLikes, deletePostComment, addPostComment, updatePostLikes } = postSlice.actions;
export default postSlice.reducer;