import sharp from "sharp";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Notification } from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";


// Add New Post :
export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image) {
            return res.status(400).json({
                message: "Image required",
                success: false,
            });
        }

        // Image Upload : 
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800 })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        // Buffer to Data URI : 
        const fileUri = `data:image/jpeg;base64,${optimizedImageBuffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            folder: "instagram-clone/posts",
        });

        // Create Post : 
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
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

        return res.status(201).json({
            message: "New Post Added Successfully",
            success: true,
            post
        });
    }
    catch (error) {
        console.error(error);
    }
};


// Get All Posts :
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 })
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

        return res.status(200).json({
            posts,
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

        // implement socket.io for real-time notifications :


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

        // User can delete ONLY if they are author of comment
        if (comment.author.toString() !== userId) {
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

        const isLiked = comment.likes.includes(userId);
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


        // check if the looged in user is the owner of the post : 
        if (post.author.toString() !== authorId) return res.status(403).json({ message: "Unauthorized" });

        // Delete Post :
        await Post.findByIdAndDelete(postId);

        // remove The Post id form the user's post :
        let user = await User.findById(authorId);
        user.posts = user.posts.filter(id => id.toString() !== postId);
        await user.save();

        // Delete Associated Comments : 
        await Comment.deleteMany({ post: postId });

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
        if (user.bookmarks.includes(post._id)) {
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


