// Production build
import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDataUri } from "../utils/datauri.js";
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
        const { username, email, password, gender, isPrivate = false } = req.body;
        if (!username || !email || !password || !gender) {
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
            gender,
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

// Check email availability
export const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            return res.status(200).json({
                available: false,
                message: "This email is already in use.",
                success: true
            });
        }
        return res.status(200).json({
            available: true,
            message: "Email is available.",
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
        const userWithLinked = await User.findById(user._id).populate('linkedAccounts', 'username profilePicture email');

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
            role: user.role,
            mutedUsers: user.mutedUsers || [],
            linkedAccounts: userWithLinked.linkedAccounts || []
        }

        return res.cookie("token", token, { httpOnly: true, sameSite: 'strict', maxAge: 1 * 24 * 60 * 60 * 1000 }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user: userData,
            token: token
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

        // BLOCK CHECK: If the target user has blocked current user, return "User not found"
        if (user.blockedUsers.includes(currentUserId)) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        const isBlocked = user.blockedBy.includes(currentUserId);

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
            isBlocked,
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
        const user = await User.findById(req.id);
        const suggestedUsers = await User.find({
            _id: { $ne: req.id, $nin: [...user.blockedUsers, ...user.blockedBy, ...user.following] },
            isActive: { $ne: false },
            blockedUsers: { $ne: req.id }
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
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};

// Get All Users (Admin) :
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        return res.status(200).json({
            success: true,
            users,
        })
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
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

        // BLOCK CHECK:
        if (user.blockedUsers.includes(jiskoFollowKrunga) || user.blockedBy.includes(jiskoFollowKrunga)) {
            return res.status(403).json({ message: "Action not allowed due to a block", success: false });
        }

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

// // Get Chat Users (Sorted by activity, Includes Groups)
export const getChatUsers = async (req, res) => {
    try {
        const userId = req.id;
        const conversations = await Conversation.find({
            participants: userId
        }).sort({ updatedAt: -1 }).populate('participants', 'username profilePicture');

        const user = await User.findById(userId);

        const chatItemsMap = new Map();

        conversations.forEach(conv => {
            let item = null;
            const currentUserIdStr = String(userId);
            const hiddenTime = conv.hiddenAt?.get(currentUserIdStr);
            const latestMsg = conv.messages[conv.messages.length - 1];
            
            // Logic: Hide if HiddenAt exists AND (no messages OR latest message is older than HiddenAt)
            if (hiddenTime) {
                const isStillHidden = !latestMsg || new Date(latestMsg.createdAt) <= new Date(hiddenTime);
                if (isStillHidden) return; // Skip this one, it's hidden from sidebar
            }

            if (conv.isGroup) {
                item = {
                    _id: conv._id.toString(), // Conversation ID acts as the "user" identity in frontend select
                    username: conv.groupName,
                    profilePicture: conv.groupProfilePicture,
                    isGroup: true,
                    participants: conv.participants,
                    groupAdmin: conv.groupAdmin,
                    conversationId: conv._id,
                    updatedAt: conv.updatedAt
                };
            } else {
                const other = conv.participants.find(p => {
                    const pid = (p._id || p).toString();
                    return pid !== userId.toString();
                });
                if (other) {
                    item = {
                        ...other.toObject(),
                        conversationId: conv._id,
                        isGroup: false,
                        updatedAt: conv.updatedAt
                    };
                }
            }

            if (item) {
                const key = String(item._id);
                // Keep the most recently updated conversation for this user/group
                if (!chatItemsMap.has(key) || new Date(item.updatedAt) > new Date(chatItemsMap.get(key).updatedAt)) {
                    chatItemsMap.set(key, item);
                }
            }
        });

        const chatItems = Array.from(chatItemsMap.values())
            .filter(item => {
                if (item.isGroup) return true;
                // Block filter for 1v1
                return !user.blockedUsers.some(id => String(id) === String(item._id)) &&
                    !user.blockedBy.some(id => String(id) === String(item._id));
            })
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        return res.status(200).json({
            success: true,
            users: chatItems
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
        const followersOnly = req.query.followersOnly === 'true';

        const currentUser = await User.findById(req.id);
        const filter = {
            _id: { $ne: req.id, $nin: [...currentUser.blockedUsers, ...currentUser.blockedBy] },
            isActive: { $ne: false }
        };

        if (query) {
            filter.$or = [
                { username: { $regex: query, $options: 'i' } },
                { fullName: { $regex: query, $options: 'i' } }
            ];
        }

        if (followersOnly) {
            filter._id.$in = currentUser.followers;
        }

        const users = await User.find(filter).select("username profilePicture fullName").limit(20);

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


export const blockUser = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;

        if (userId === targetId) {
            return res.status(400).json({ message: "You can't block yourself", success: false });
        }

        const user = await User.findById(userId);
        const target = await User.findById(targetId);

        if (!user || !target) return res.status(404).json({ message: "User not found", success: false });

        // Add to block strings
        if (!user.blockedUsers.includes(targetId)) {
            user.blockedUsers.push(targetId);
            target.blockedBy.push(userId);

            // AUTO-UNFOLLOW Logic:
            user.following = user.following.filter(id => id.toString() !== targetId.toString());
            user.followers = user.followers.filter(id => id.toString() !== targetId.toString());
            target.following = target.following.filter(id => id.toString() !== userId.toString());
            target.followers = target.followers.filter(id => id.toString() !== userId.toString());

            // Clear pending requests
            user.followRequests = user.followRequests.filter(id => id.toString() !== targetId.toString());
            target.followRequests = target.followRequests.filter(id => id.toString() !== userId.toString());

            // Remove from recent searches
            user.recentSearches = user.recentSearches.filter(id => id.toString() !== targetId.toString());

            await user.save();
            await target.save();
        }

        return res.status(200).json({ message: `You have blocked ${target.username}`, success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to block user", success: false });
    }
}

export const unblockUser = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;

        if (!userId || !targetId) {
            return res.status(400).json({ message: "Missing user information", success: false });
        }

        const user = await User.findById(userId);
        const target = await User.findById(targetId);

        if (!user || !target) return res.status(404).json({ message: "User not found", success: false });

        // Use $pull for more reliable array updates
        await Promise.all([
            User.updateOne({ _id: userId }, { $pull: { blockedUsers: targetId } }),
            User.updateOne({ _id: targetId }, { $pull: { blockedBy: userId } })
        ]);

        return res.status(200).json({ message: `You have unblocked ${target.username}`, success: true });
    } catch (error) {
        console.error("Unblock Error:", error);
        res.status(500).json({ message: error.message || "Failed to unblock user", success: false });
    }
}
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

export const getBlockedUsers = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).populate('blockedUsers', 'username profilePicture fullName');

        if (!user) return res.status(404).json({ message: "User not found", success: false });

        return res.status(200).json({
            blockedUsers: user.blockedUsers || [],
            success: true
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to fetch blocked users", success: false });
    }
};

export const toggleMuteUser = async (req, res) => {
    try {
        const userId = req.id;
        const targetId = req.params.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });

        const isMuted = user.mutedUsers.includes(targetId);
        if (isMuted) {
            user.mutedUsers = user.mutedUsers.filter(id => id.toString() !== targetId);
        } else {
            user.mutedUsers.push(targetId);
        }

        await user.save();
        return res.status(200).json({
            message: `User ${isMuted ? 'unmuted' : 'muted'} successfully`,
            success: true,
            isMuted: !isMuted
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        // 1. Delete all assets (Posts, Reels)
        // Note: For production, you'd also delete media from Cloudinary
        await Post.deleteMany({ author: userId });
        await Reel.deleteMany({ author: userId });

        // 2. Delete all interactions (Comments, Notifications)
        await Comment.deleteMany({ author: userId });
        await ReelComment.deleteMany({ author: userId });
        await Notification.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });

        // 3. Cleanup relationships (Followers, Following, Linked Accounts, etc.)
        await User.updateMany(
            {},
            {
                $pull: {
                    followers: userId,
                    following: userId,
                    blockedUsers: userId,
                    blockedBy: userId,
                    recentSearches: userId,
                    mutedUsers: userId,
                    linkedAccounts: userId,
                    followRequests: userId
                }
            }
        );

        // 4. Delete conversations where user was a participant
        await Conversation.deleteMany({ participants: userId });

        // 5. Finally, delete the user record
        await User.findByIdAndDelete(userId);

        return res.status(200).cookie("token", "", { maxAge: 0 }).json({
            message: "Account and all associated data deleted successfully.",
            success: true
        });

    } catch (error) {
        console.error("Delete Account Error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
}

export const linkAccount = async (req, res) => {
    try {
        const primaryUserId = req.id;
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required", success: false });
        }

        const secondaryUser = await User.findOne({ email });
        if (!secondaryUser) {
            return res.status(401).json({ message: "Invalid credentials for account to link", success: false });
        }

        const isMatch = await bcrypt.compare(password, secondaryUser.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials for account to link", success: false });
        }

        if (String(primaryUserId) === String(secondaryUser._id)) {
            return res.status(400).json({ message: "You cannot link the same account", success: false });
        }

        // Mutual linking
        await User.findByIdAndUpdate(primaryUserId, { $addToSet: { linkedAccounts: secondaryUser._id } });
        await User.findByIdAndUpdate(secondaryUser._id, { $addToSet: { linkedAccounts: primaryUserId } });

        // Get the secondary user's token so we could potentially use it
        const secondaryToken = await jwt.sign({ userId: secondaryUser._id, role: secondaryUser.role }, process.env.SECRET_KEY, { expiresIn: '1d' });

        return res.status(200).json({
            message: `Account @${secondaryUser.username} linked successfully`,
            success: true,
            account: {
                userId: secondaryUser._id,
                username: secondaryUser.username,
                profilePicture: secondaryUser.profilePicture,
                email: secondaryUser.email,
                token: secondaryToken,
                user: secondaryUser
            }
        });
    } catch (error) {
        console.error("Link Account Error:", error);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

