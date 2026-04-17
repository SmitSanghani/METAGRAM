import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";
import { Setting } from "../models/setting.model.js";


// Add New Post :
export const addNewPost = async (req, res) => {
    try {
        const settings = await Setting.findOne();
        if (settings && !settings.postsEnabled && req.role !== 'admin') {
            return res.status(403).json({
                message: "Posting is currently disabled by admin.",
                success: false
            });
        }
        const { caption } = req.body;
        const images = req.files; // Array of files
        const authorId = req.id;

        if (!images || images.length === 0) {
            return res.status(400).json({
                message: "At least one image is required",
                success: false,
            });
        }

        const uploadedImages = [];

        for (const file of images) {
            // Image Optimization : 
            const optimizedImageBuffer = await sharp(file.buffer)
                .resize({ width: 800, height: 800, fit: 'inside' })
                .toFormat('jpeg', { quality: 80 })
                .toBuffer();

            // Buffer to Data URI : 
            const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
            const cloudResponse = await cloudinary.uploader.upload(fileUri, {
                folder: "instagram-clone/posts",
            });
            uploadedImages.push(cloudResponse.secure_url);
        }

        // Create Post : 
        const post = await Post.create({
            caption,
            image: uploadedImages[0], // First image for backward compatibility
            images: uploadedImages,    // All images
            author: authorId,
            allowComments: req.body.allowComments === 'false' ? false : true
        });

        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }

        await post.populate({
            path: "author",
            select: '-password'
        });

        // Real-time globally
        io.emit('newPost', post);

        return res.status(201).json({
            message: "New Post Added Successfully",
            success: true,
            post
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};


// Get All Posts :
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
            .populate({
                path: "author",
                select: 'username profilePicture isDeleted'
            })
            .populate({
                path: "comments",
                sort: { createdAt: -1 },
                populate: {
                    path: "author",
                    select: 'username profilePicture'
                }
            })
            .populate("likes", "username profilePicture");

        const filteredPosts = posts.filter(post => post.author && !post.author.isDeleted);

        return res.status(200).json({
            posts: filteredPosts,
            success: true
        });
    } catch (error) {
        console.error(error);
    }
};



//  Get User's Posts :
export const getUserPost = async (req, res) => {
    try {
        const authorId = req.id;
        const posts = await Post.find({ author: authorId }).sort({ createdAt: -1 }).populate({
            path: "author",
            select: 'username profilePicture'
        }).populate({
            path: "comments",
            sort: { createdAt: -1 },
            populate: {
                path: "author",
                select: 'username profilePicture'
            }
        });

        return res.status(200).json({
            posts,
            success: true
        });
    } catch (error) {
        console.error(error);
    }
};



// Like Post :
export const likePost = async (req, res) => {
    try {
        const likekrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post Not Found",
                success: false
            });
        }

        const author = await User.findById(post.author);
        if (author.blockedUsers.some(id => id.toString() === likekrneWalaUserKiId.toString()) || author.blockedBy.some(id => id.toString() === likekrneWalaUserKiId.toString())) {
            return res.status(403).json({ message: "Action not allowed due to a block", success: false });
        }

        // Like Logic Started :
        await post.updateOne({ $addToSet: { likes: likekrneWalaUserKiId } });
        await post.save();

        // implement socket.io for real-time notifications :
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likekrneWalaUserKiId) {
            const notification = await Notification.create({
                sender: likekrneWalaUserKiId,
                receiver: postOwnerId,
                type: 'like',
                post: postId
            });
            await notification.populate("sender", "username profilePicture");

            const receiverSocketId = getReceiverSocketId(postOwnerId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('notification', notification);
            }
        }

        // Real-time globally
        io.emit('postLiked', { postId, userId: likekrneWalaUserKiId });

        return res.status(200).json({
            message: "Post Liked",
            success: true
        });

    } catch (error) {
        console.error(error);
    }
};

// DisLike Post :
export const dislikePost = async (req, res) => {
    try {
        const likekrneWalaUserKiId = req.id;
        const postId = req.params.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post Not Found",
                success: false
            });
        }

        // Like Logic Started :
        await post.updateOne({ $pull: { likes: likekrneWalaUserKiId } });
        await post.save();

        // Real-time globally
        io.emit('postDisliked', { postId, userId: likekrneWalaUserKiId });

        return res.status(200).json({
            message: "Post Disliked",
            success: true
        });

    } catch (error) {
        console.error(error);
    }
};




// Add Comment On Post :
export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const commentkrneWalaUserKiId = req.id;

        const { text } = req.body;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });

        const author = await User.findById(post.author);
        if (author.blockedUsers.some(id => id.toString() === commentkrneWalaUserKiId.toString()) || author.blockedBy.some(id => id.toString() === commentkrneWalaUserKiId.toString())) {
            return res.status(403).json({ message: "Action not allowed due to a block", success: false });
        }

        if (!text) {
            return res.status(400).json({
                message: "text is required",
                success: false
            });
        }

        const comment = await Comment.create({
            text,
            author: commentkrneWalaUserKiId,
            post: postId,
            parentId: req.body.parentId || null
        });

        await comment.populate({
            path: "author",
            select: 'username profilePicture'
        });

        post.comments.push(comment._id);
        await post.save();

        const postOwnerId = post.author.toString();
        if (postOwnerId !== commentkrneWalaUserKiId.toString()) {
            const notification = await Notification.create({
                sender: commentkrneWalaUserKiId,
                receiver: postOwnerId,
                type: 'comment',
                post: postId,
                text: text
            });
            await notification.populate("sender", "username profilePicture");

            const receiverSocketId = getReceiverSocketId(postOwnerId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('notification', notification);
            }
        }

        if (req.body.parentId) {
            const parentComment = await Comment.findById(req.body.parentId);
            if (parentComment && parentComment.author.toString() !== commentkrneWalaUserKiId.toString()) {
                const replyNotification = await Notification.create({
                    sender: commentkrneWalaUserKiId,
                    receiver: parentComment.author,
                    type: 'reply',
                    post: postId,
                    text: text
                });
                await replyNotification.populate("sender", "username profilePicture");
                const replyReceiverSocketId = getReceiverSocketId(parentComment.author);
                if (replyReceiverSocketId) {
                    io.to(replyReceiverSocketId).emit('notification', replyNotification);
                }
            }
        }

        io.emit('newPostComment', comment);

        return res.status(201).json({
            message: "Comment Added",
            success: true,
            comment
        });

    } catch (error) {
        console.error(error);
    }
}

// Delete Comment :
export const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;

        const comment = await Comment.findById(commentId).populate('post');
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        // User can delete ONLY if they are author of comment OR they are admin
        if (comment.author.toString() !== userId && req.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized. You can only delete your own comments.", success: false });
        }

        const commentPostId = comment.post?._id || comment.post;

        await Comment.findByIdAndDelete(commentId);
        // Also delete sub-comments
        await Comment.deleteMany({ parentId: commentId });

        // Remove from post array if it was top-level
        if (comment.post) {
            await Post.findByIdAndUpdate(commentPostId, { $pull: { comments: commentId } });
        }

        io.emit('deletePostComment', { commentId, postId: commentPostId });

        return res.status(200).json({ message: "Comment deleted", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Edit Comment :
export const editComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ message: "Text is required", success: false });
        }

        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        if (comment.author.toString() !== userId) {
            return res.status(403).json({ message: "Unauthorized to edit this comment", success: false });
        }

        comment.text = text;
        await comment.save();

        io.emit('editPostComment', { commentId, postId: comment.post, text });

        return res.status(200).json({ message: "Comment updated", success: true, text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error", success: false });
    }
};

// Like/Dislike Comment :
export const toggleLikeComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.id;
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found", success: false });

        const isLiked = comment.likes.some(id => id.toString() === userId.toString());
        if (isLiked) {
            await comment.updateOne({ $pull: { likes: userId } });

            // Re-fetch or manually construct
            const updatedLikes = comment.likes.filter(id => id.toString() !== userId.toString());
            io.emit('updatePostCommentLikes', { commentId, postId: comment.post, likes: updatedLikes });

            return res.status(200).json({ message: "Comment unliked", success: true });
        } else {
            await comment.updateOne({ $addToSet: { likes: userId } });

            const updatedLikes = [...comment.likes, userId];
            io.emit('updatePostCommentLikes', { commentId, postId: comment.post, likes: updatedLikes });

            if (comment.author.toString() !== userId.toString()) {
                const notification = await Notification.create({
                    sender: userId,
                    receiver: comment.author,
                    type: 'comment_like',
                    post: comment.post,
                    comment: commentId
                });
                await notification.populate("sender", "username profilePicture");
                const receiverSocketId = getReceiverSocketId(comment.author);
                if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);
            }

            return res.status(200).json({ message: "Comment liked", success: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



// Get Comments On Post :
export const getCommentsOnPost = async (req, res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({ post: postId })
            .populate(
                'author',
                'username profilePicture'
            );

        if (!comments) {
            return res.status(404).json({
                message: "No Comments Found for this post",
                success: false
            });
        }

        return res.status(200).json({
            success: true,
            comments
        });
    } catch (error) {
        console.error(error);
    }
};



// Delete Post :
export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post Not Found", success: false });


        // check if the looged in user is the owner of the post OR they are admin: 
        if (post.author.toString() !== authorId && req.role !== 'admin') return res.status(403).json({ message: "Unauthorized" });

        // Delete Post :
        await Post.findByIdAndDelete(postId);

        // remove The Post id form the actual author's post array:
        await User.findByIdAndUpdate(post.author, { $pull: { posts: postId } });

        // Delete Associated Comments : 
        await Comment.deleteMany({ post: postId });

        // Real-time globally
        io.emit('deletePost', postId);

        return res.status(200).json({
            success: true,
            message: "Post Deleted Successfully"
        });
    } catch (error) {
        console.error(error);
    }
}



// Bookmark Post :
export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({
                message: "Post Not Found",
                success: false
            });
        }

        const user = await User.findById(authorId);
        if (user.bookmarks.some(id => id.toString() === post._id.toString())) {
            // already bookmarked -> remove from the bookmarks :
            await user.updateOne({ $pull: { bookmarks: post._id } });
            await user.save();

            return res.status(200).json({
                type: "unsaved",
                message: "Post Removed From Bookmarks",
                success: true
            });
        } else {
            // bookmark karna padega :
            await user.updateOne({ $addToSet: { bookmarks: post._id } });
            await user.save();

            return res.status(200).json({
                type: "saved",
                message: "Post Bookmarked",
                success: true
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};


export const getExplore = async (req, res) => {
    try {
        const posts = await Post.find()
            .populate("author", "username profilePicture isDeleted")
            .populate("likes", "username profilePicture")
            .populate({
                path: "comments",
                populate: { path: "author", select: "username profilePicture" }
            });

        const reels = await Reel.find()
            .populate("author", "username profilePicture isDeleted")
            .populate("likes", "username profilePicture")
            .populate({
                path: "comments",
                populate: { path: "author", select: "username profilePicture" }
            });

        // Weights
        const W_LIKE = 5;
        const W_COMMENT = 10;
        const W_VIEW = 1;

        const calculateScore = (item, isReel) => {
            const likesCount = item.likes?.length || 0;
            const commentsCount = item.comments?.length || 0;
            const viewsCount = isReel ? (item.viewsCount || 0) : 0;
            return (likesCount * W_LIKE) + (commentsCount * W_COMMENT) + (viewsCount * W_VIEW);
        };

        const topPosts = posts
            .map(p => ({ ...p.toObject(), type: 'post', score: calculateScore(p, false) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);

        const topReels = reels
            .map(r => ({ ...r.toObject(), type: 'reel', score: calculateScore(r, true) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);

        return res.status(200).json({
            success: true,
            top_posts: topPosts.filter(p => p.author && !p.author.isDeleted),
            top_reels: topReels.filter(r => r.author && !r.author.isDeleted)
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};

// Get Post By ID :
export const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
            .populate({
                path: "author",
                select: 'username profilePicture'
            })
            .populate({
                path: "comments",
                sort: { createdAt: -1 },
                populate: {
                    path: "author",
                    select: 'username profilePicture'
                }
            })
            .populate("likes", "username profilePicture");

        if (!post) {
            return res.status(404).json({
                message: "Post Not Found",
                success: false
            });
        }

        return res.status(200).json({
            post,
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};
