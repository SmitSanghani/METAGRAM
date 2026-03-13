import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataUri } from "../utils/dataUri.js";
import cloudinary from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { Comment } from "../models/comment.model.js";
import { ReelComment } from "../models/reelComment.model.js";
import { Notification } from "../models/notification.model.js";
import { Conversation } from "../models/conversation.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";



// User Registration : 
export const register = async (req, res) => {
    try {
        const { username, email, password, isPrivate = false } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({
                message: "Something is missing, Please Check !!!",
                success: false,
            });
        }

        const user = await User.findOne({ email });
        if (user) {
            return res.status(401).json({
                message: "Try with a different email",
                success: false,
            });
        }

        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(401).json({
                message: "This username is already taken. Please try another one.",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({
            username,
            email,
            password: hashedPassword,
            isPrivate
        });
        return res.status(201).json({
            message: "Account Created Successfully",
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            success: false,
        });
    }
};

// Check username availability
export const checkUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (user) {
            return res.status(200).json({
                available: false,
                message: "This username is already taken. Please try another one.",
                success: true
            });
        }
        return res.status(200).json({
            available: true,
            message: "Username is available.",
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};


// User Login :
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(401).json({
                message: "Something is missing, Please Check !!!",
                success: false,
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                message: "Your account has been suspended. Please contact admin.",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Incorrect email or password",
                success: false,
            });
        };

        const token = await jwt.sign({ userId: user._id, role: user.role }, process.env.SECRET_KEY, { expiresIn: '1d' });

        // populate each post if in the posts array :  
        const populatedPosts = await Promise.all(
            user.posts.map(async (postId) => {
                const post = await Post.findById(postId);
                if (post.author.equals(user._id)) {
                    return post;
                }
                return null;
            })
        );
        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            category: user.category,
            followers: user.followers,
            following: user.following,
            posts: populatedPosts,
            isPrivate: user.isPrivate,
            followRequests: user.followRequests,
            role: user.role
        }

        return res.cookie("token", token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user: userData
        });
    } catch (error) {
        console.error(error);
    }
};



// User Logout :
export const logout = async (_, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({
            message: "Logged out successfully.",
            success: true,
        });
    } catch (error) {
        console.error(error);
    }
};



// Get User Profile :
export const getProfile = async (req, res) => {
    try {
        const currentUserId = req.id;
        const userId = req.params.id;
        const user = await User.findById(userId)
            .populate({
                path: "posts",
                options: { sort: { createdAt: -1 } },
                populate: [
                    { path: 'author', select: 'username profilePicture' },
                    { path: 'likes', select: 'username profilePicture' },
                    { path: 'comments', populate: { path: 'author', select: 'username profilePicture' } }
                ]
            })
            .populate({
                path: "reels",
                options: { sort: { createdAt: -1 } },
                populate: [
                    { path: 'author', select: 'username profilePicture' },
                    { path: 'likes', select: 'username profilePicture' },
                    { path: 'comments', populate: { path: 'author', select: 'username profilePicture' } }
                ]
            })
            .populate({
                path: "bookmarks",
                populate: [
                    { path: 'author', select: 'username profilePicture' },
                    { path: 'likes', select: 'username profilePicture' },
                    { path: 'comments', populate: { path: 'author', select: 'username profilePicture' } }
                ]
            })
            .populate({
                path: "savedReels",
                populate: [
                    { path: 'author', select: 'username profilePicture' },
                    { path: 'likes', select: 'username profilePicture' },
                    { path: 'comments', populate: { path: 'author', select: 'username profilePicture' } }
                ]
            })
            .populate("followers", "username fullName profilePicture")
            .populate("following", "username fullName profilePicture");

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        const isSelf = currentUserId?.toString() === userId?.toString();
        const isFollowing = user.followers.some(f => (f._id || f).toString() === currentUserId);
        const isFollower = user.following.some(f => (f._id || f).toString() === currentUserId);
        const isRequested = user.followRequests.some(f => (f._id || f).toString() === currentUserId);

        // Send profile visit notification if not self and not following each other (mutual non-following)
        if (!isSelf && !isFollowing && !isFollower) {
            try {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const existingNotif = await Notification.findOne({
                    sender: currentUserId,
                    receiver: userId,
                    type: 'profile_visit',
                    createdAt: { $gte: twentyFourHoursAgo }
                });

                if (!existingNotif) {
                    const newNotif = await Notification.create({
                        sender: currentUserId,
                        receiver: userId,
                        type: 'profile_visit'
                    });

                    const visitor = await User.findById(currentUserId).select("username profilePicture");
                    const receiverSocketId = getReceiverSocketId(userId);
                    if (receiverSocketId) {
                        io.to(receiverSocketId).emit('notification', {
                            ...newNotif.toObject(),
                            sender: visitor
                        });
                    }
                }
            } catch (err) {
                console.error("Error sending profile visit notification:", err);
            }
        }

        let userResponse = user.toObject();

        if (userResponse.isPrivate && !isSelf && !isFollowing) {
            userResponse.posts = [];
            userResponse.bookmarks = [];
            userResponse.reels = [];
        }

        return res.status(200).json({
            user: userResponse,
            isFollowing,
            isFollower,
            requestPending: isRequested,
            success: true
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error",
            success: false
        });
    }
};

// export const getProfile = async (req, res) => {
//     try {
//         const userId = req.params.id;
//         const user = await User.findById(userId).populate({path:'posts', createdAt:-1}).populate('bookmarks');
//         return res.status(200).json({
//             user,
//             success: true,
//         });
//     } catch (error) {
//         console.error(error);
//     }
// };



// Edit / Update User Profile :
export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender, category, link, isPrivate } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }

        const user = await User.findById(userId).select("-password").populate("followers following");
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            })
        };
        if (bio !== undefined) user.bio = bio;
        if (gender !== undefined) user.gender = gender;
        if (category !== undefined) user.category = category;
        if (link !== undefined) user.link = link;
        if (isPrivate !== undefined) user.isPrivate = isPrivate === 'true' || isPrivate === true;
        if (profilePicture) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user
        });

    } catch (error) {
        console.error(error);
    }
};


// Get Suggested Users :
export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({
            _id: { $ne: req.id },
            isActive: { $ne: false }
        }).select("-password");
        if (!suggestedUsers) {
            return res.status(400).json({
                message: "Currently do not have any users",
                success: false,
            });
        }
        return res.status(200).json({
            success: true,
            users: suggestedUsers,
        })
    }
    catch (error) {
        console.error(error);
    }
};



// Follow / Unfollow User (Includes Private Account logic) :
export const followOrUnfollow = async (req, res) => {
    try {
        const followKrneWala = req.id; // Sender
        const jiskoFollowKrunga = req.params.id; // Target

        if (followKrneWala === jiskoFollowKrunga) {
            return res.status(400).json({ message: "You can't follow/unfollow yourself", success: false });
        }

        const user = await User.findById(followKrneWala);
        const targetUser = await User.findById(jiskoFollowKrunga);

        if (!user || !targetUser) return res.status(404).json({ message: "User not found", success: false });

        const isFollowing = user.following.includes(jiskoFollowKrunga);
        const hasRequested = targetUser.followRequests.includes(followKrneWala);

        if (isFollowing) {
            // Unfollow
            await Promise.all([
                User.updateOne({ _id: followKrneWala }, { $pull: { following: jiskoFollowKrunga } }),
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followers: followKrneWala } })
            ]);
            return res.status(200).json({
                message: "Unfollowed successfully",
                success: true,
                status: 'unfollowed',
                isFollowing: false,
                isFollower: targetUser.following.includes(followKrneWala),
                requestPending: false
            });
        } else if (hasRequested) {
            // Cancel Request
            await Promise.all([
                User.updateOne({ _id: jiskoFollowKrunga }, { $pull: { followRequests: followKrneWala } }),
                Notification.deleteOne({ sender: followKrneWala, receiver: jiskoFollowKrunga, type: 'follow_request' })
            ]);
            return res.status(200).json({
                message: "Follow request canceled",
                success: true,
                status: 'canceled',
                isFollowing: false,
                isFollower: targetUser.following.includes(followKrneWala),
                requestPending: false
            });
        } else {
            if (targetUser.isPrivate) {
                // Send Follow Request
                await User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followRequests: followKrneWala } });

                const notification = await Notification.create({
                    sender: followKrneWala,
                    receiver: jiskoFollowKrunga,
                    type: 'follow_request'
                });
                await notification.populate("sender", "username profilePicture");

                const receiverSocketId = getReceiverSocketId(jiskoFollowKrunga);
                if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);

                return res.status(200).json({
                    message: "Follow request sent",
                    success: true,
                    status: 'requested',
                    isFollowing: false,
                    isFollower: targetUser.following.includes(followKrneWala),
                    requestPending: true
                });
            } else {
                // Direct Follow (Public)
                await Promise.all([
                    User.updateOne({ _id: followKrneWala }, { $push: { following: jiskoFollowKrunga } }),
                    User.updateOne({ _id: jiskoFollowKrunga }, { $push: { followers: followKrneWala } }),
                ]);

                const notification = await Notification.create({
                    sender: followKrneWala,
                    receiver: jiskoFollowKrunga,
                    type: 'follow'
                });
                await notification.populate("sender", "username profilePicture");

                const receiverSocketId = getReceiverSocketId(jiskoFollowKrunga);
                if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);

                return res.status(200).json({
                    message: "Followed successfully",
                    success: true,
                    status: 'followed',
                    isFollowing: true,
                    isFollower: targetUser.following.includes(followKrneWala),
                    requestPending: false
                });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
}

export const acceptFollowRequest = async (req, res) => {
    try {
        const userId = req.id; // Me
        const requesterId = req.params.id; // User who sent request

        const user = await User.findById(userId);

        // If already accepted previously, just resolve it
        if (user.followers.some(id => id.toString() === requesterId)) {
            await Notification.updateMany({ sender: requesterId, receiver: userId, type: 'follow_request' }, { $set: { requestStatus: 'accepted' } });
            return res.status(200).json({ message: "Request accepted", success: true });
        }

        if (!user.followRequests.some(id => id.toString() === requesterId)) {
            // Might have been deleted or never existed. Force delete state just in case
            await Notification.updateMany({ sender: requesterId, receiver: userId, type: 'follow_request' }, { $set: { requestStatus: 'deleted' } });
            return res.status(200).json({ message: "No request found", success: true, status: 'deleted' });
        }

        // Remove from requests, add to followers/following
        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { followRequests: requesterId }, $push: { followers: requesterId } }),
            User.updateOne({ _id: requesterId }, { $push: { following: userId } }),
            Notification.updateMany({ sender: requesterId, receiver: userId, type: 'follow_request' }, { $set: { requestStatus: 'accepted' } })
        ]);

        const notification = await Notification.create({
            sender: userId,
            receiver: requesterId,
            type: 'follow_accept'
        });
        await notification.populate("sender", "username profilePicture");

        const receiverSocketId = getReceiverSocketId(requesterId);
        if (receiverSocketId) io.to(receiverSocketId).emit('notification', notification);

        res.status(200).json({ message: "Request accepted", success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

export const deleteFollowRequest = async (req, res) => {
    try {
        const userId = req.id;
        const requesterId = req.params.id;

        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { followRequests: requesterId } }),
            Notification.updateMany({ sender: requesterId, receiver: userId, type: 'follow_request' }, { $set: { requestStatus: 'deleted' } })
        ]);
        res.status(200).json({ message: "Request deleted", success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
}

// Get Chat Users (Sorted by activity)
export const getChatUsers = async (req, res) => {
    try {
        const userId = req.id;
        const conversations = await Conversation.find({
            participants: userId
        }).sort({ updatedAt: -1 }).populate('participants', 'username profilePicture');

        const chattedUsers = conversations.map(conv => {
            const other = conv.participants.find(p => p._id.toString() !== userId.toString());
            if (!other) return null;
            return {
                ...other.toObject(),
                conversationId: conv._id
            };
        }).filter(u => u != null);

        // Get all active users except the current user
        const allUsers = await User.find({
            _id: { $ne: userId },
            isActive: { $ne: false }
        }).select("-password");

        // Filter out users we've already chatted with to avoid duplicates in the final list
        const suggestedUsers = allUsers.filter(u => !chattedUsers.some(cu => cu._id.toString() === u._id.toString()));

        return res.status(200).json({
            success: true,
            users: [...chattedUsers, ...suggestedUsers]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
}

export const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        return res.status(200).json({
            message: `User account ${user.isActive ? 'activated' : 'suspended'} successfully`,
            success: true,
            isActive: user.isActive
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

// Change Password :
export const changePassword = async (req, res) => {
    try {
        const userId = req.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Both current and new password are required", success: false });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect", success: false });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters", success: false });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        return res.status(200).json({ message: "Password changed successfully", success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
}
export const searchUsers = async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(200).json({ users: [], success: true });
        }
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.id },
            isActive: { $ne: false }
        }).select("username profilePicture fullName").limit(10);

        return res.status(200).json({ users, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", success: false });
    }
};

export const addToRecentSearch = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;
        await User.findByIdAndUpdate(userId, {
            $pull: { recentSearches: targetId }
        });
        await User.findByIdAndUpdate(userId, {
            $push: { recentSearches: { $each: [targetId], $position: 0 } }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};

export const removeFromRecentSearch = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;
        await User.findByIdAndUpdate(userId, {
            $pull: { recentSearches: targetId }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};

export const getRecentSearches = async (req, res) => {
    try {
        const user = await User.findById(req.id).populate("recentSearches", "username profilePicture fullName");
        return res.status(200).json({
            recentSearches: user?.recentSearches || [],
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};


export const clearRecentSearches = async (req, res) => {
    try {
        const userId = req.id;
        await User.findByIdAndUpdate(userId, {
            $set: { recentSearches: [] }
        });
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};


export const getLikedActivity = async (req, res) => {
    try {
        const userId = req.id;
        const likedPosts = await Post.find({ likes: userId }).populate('author', 'username profilePicture').sort({ createdAt: -1 });
        const likedReels = await Reel.find({ likes: userId }).populate('author', 'username profilePicture').sort({ createdAt: -1 });
        const activity = [
            ...likedPosts.map(p => ({ ...p.toObject(), activityType: 'post' })),
            ...likedReels.map(r => ({ ...r.toObject(), activityType: 'reel' }))
        ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return res.status(200).json({ success: true, activity });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};

export const getCommentActivity = async (req, res) => {
    try {
        const userId = req.id;
        const postComments = await Comment.find({ author: userId }).populate({ path: 'post', select: 'image caption author', populate: { path: 'author', select: 'username' } }).sort({ createdAt: -1 });
        const reelComments = await ReelComment.find({ author: userId }).populate({ path: 'reel', select: 'videoUrl thumbnail caption author', populate: { path: 'author', select: 'username' } }).sort({ createdAt: -1 });
        const activity = [
            ...postComments.map(c => ({ ...c.toObject(), activityType: 'post' })),
            ...reelComments.map(c => ({ ...c.toObject(), activityType: 'reel' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return res.status(200).json({ success: true, activity });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false });
    }
};

