import { createSlice } from "@reduxjs/toolkit";

const postSlice = createSlice({
    name: "post",
    initialState: {
        posts: [],
        selectedPost: null
    },
    reducers: {
        //actions
        setPosts(state, action) {
            state.posts = action.payload;
        },
        setSelectedPost(state, action) {
            state.selectedPost = action.payload;
        },
        updatePostLikes: (state, action) => {
            const { postId, userId, type } = action.payload;
            const post = state.posts.find(p => p._id === postId);
            if (post) {
                if (type === 'like') {
                    if (!post.likes.some(id => (id._id || id) === userId)) post.likes.push(userId);
                } else {
                    post.likes = post.likes.filter(id => (id._id || id) !== userId);
                }
            }
            if (state.selectedPost?._id === postId) {
                if (type === 'like') {
                    if (!state.selectedPost.likes.some(id => (id._id || id) === userId)) state.selectedPost.likes.push(userId);
                } else {
                    state.selectedPost.likes = state.selectedPost.likes.filter(id => (id._id || id) !== userId);
                }
            }
        },
        updatePostCommentLikes: (state, action) => {
            const { postId, commentId, likes } = action.payload;
            const post = state.posts.find(p => p._id === postId);
            if (post) {
                const comment = post.comments.find(c => c._id === commentId);
                if (comment) comment.likes = likes;
            }
            if (state.selectedPost?._id === postId) {
                const comment = state.selectedPost.comments.find(c => c._id === commentId);
                if (comment) comment.likes = likes;
            }
        },
        deletePostComment: (state, action) => {
            const { postId, commentId } = action.payload;
            const post = state.posts.find(p => p._id === postId);
            if (post) {
                post.comments = post.comments.filter(c => c._id !== commentId);
            }
            if (state.selectedPost?._id === postId) {
                state.selectedPost.comments = state.selectedPost.comments.filter(c => c._id !== commentId);
            }
        },
        addPostComment: (state, action) => {
            const { postId, comment } = action.payload;
            const post = state.posts.find(p => p._id === postId);
            if (post) {
                const exists = post.comments.find(c => c._id === comment._id);
                if (!exists) post.comments.push(comment);
            }
            if (state.selectedPost?._id === postId) {
                const exists = state.selectedPost.comments.find(c => c._id === comment._id);
                if (!exists) state.selectedPost.comments.push(comment);
            }
        }
    }
});

export const { setPosts, setSelectedPost, updatePostCommentLikes, deletePostComment, addPostComment, updatePostLikes } = postSlice.actions;
export default postSlice.reducer;