import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { Button } from './ui/button';
import { MessageCircle, Send, X, Image as ImageIcon, Smile, Plus, FileText, Reply, Trash2, Search, BellOff, Bell, VolumeOff, Volume2, Users, UserPlus, UserMinus, Shield } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';
import { toggleMuteUserAction } from '../redux/authSlice';
import Swal from 'sweetalert2';
import { setMessages, addMessage, updateMessageStatus, updateReactions, markUnsent, markStoryUnsent, incrementUnreadCount, clearUnreadCount, updateLastMessage, removeTempMessage, setSelectedUser, setChatUsers, reorderUsers, updateChatUserConversation, addChatUser, clearChat, clearChatLocally, setSelectedChatTheme, updateChatUserMembership } from '../redux/chatSlice';
import ScrollToBottom from 'react-scroll-to-bottom';
import MessageBubble from './MessageBubble';
import useGetChatUsers from '@/hooks/useGetChatUsers';
import { setSelectedPost } from '@/redux/postSlice';
import StoryViewer from './StoryViewer';
import PostModal from './PostModal';
import CommentDialog from './CommentDialog';
import { THEMES } from '@/utils/themes';
import ThemeSelectorModal from './ThemeSelectorModal';
import { Palette } from 'lucide-react';

const NOTIFICATION_SOUND_URL = "/notification.mp3"; // Reference local file

const ChatPage = () => {
    const navigate = useNavigate();
    useGetChatUsers();
    const [textMessage, setTextMessage] = useState("");
    const { user } = useSelector(store => store.auth);
    const { onlineUsers = [], messages = [], unreadCounts = {}, lastMessages = {}, selectedUser, chatUsers = [], selectedChatTheme } = useSelector(store => store.chat || {});
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const { socket } = useSelector(store => store.socketio);
    const [replyTo, setReplyTo] = useState(null);
    const [storyToView, setStoryToView] = useState(null);
    const [headerStories, setHeaderStories] = useState([]);
    const [isHeaderStoryOpen, setIsHeaderStoryOpen] = useState(false);
    const [openPostModal, setOpenPostModal] = useState(false);
    const [openCommentDialog, setOpenCommentDialog] = useState(false);
    const [selectedPostForModal, setSelectedPostForModal] = useState(null);
    const dispatch = useDispatch();

    const [isTyping, setIsTyping] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false); // New state for (+) menu
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetUser: null });
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);
    const [isGroupSearching, setIsGroupSearching] = useState(false);
    const [groupSearchQuery, setGroupSearchQuery] = useState("");
    const [groupSearchResults, setGroupSearchResults] = useState([]);
    const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
    const searchInputRef = useRef(null);
    const typingTimeout = useRef(null);
    const currentUserId = String(user?._id || user?.id || "");
    const isNotAMember = selectedUser?.isGroup && (
        !selectedUser?.participants?.some(p => String(p?._id || p) === currentUserId) &&
        !selectedUser?.groupAdmin?.some(a => String(a?._id || a) === currentUserId)
    );

    // Clear unread count when chat selected
    const handleSelectUser = (targetUser) => {
        if (!targetUser || String(targetUser._id) === String(selectedUser?._id)) return;

        // Ensure user is in sidebar immediately with full search result details
        const exists = chatUsers.some(u => String(u._id) === String(targetUser._id));
        if (!exists && !targetUser.isGroup) {
            dispatch(addChatUser(targetUser));
        }

        // Leave previous conversation room if any
        if (socket && selectedUser?.conversationId) {
            socket.emit("leave_room", String(selectedUser.conversationId));
        }

        dispatch(setMessages([])); // CLEAR IMMEDIATELY TO AVOID CROSS-CHAT GHOST MESSAGES
        dispatch(setSelectedUser(targetUser));
        localStorage.setItem('lastChatUserId', targetUser._id);
        dispatch(clearUnreadCount(String(targetUser._id)));

        // Immediate sync with backend (only if member)
        const isTargetNotMember = targetUser?.isGroup &&
            !targetUser?.participants?.some(p => String(p?._id || p) === currentUserId) &&
            !targetUser?.groupAdmin?.some(a => String(a?._id || a) === currentUserId);

        if (!isTargetNotMember) {
            api.get(`/message/seen/${targetUser._id}`).catch(() => { });
        }

        // Join conversation room immediately if we already know the conversationId
        if (socket && targetUser.conversationId) {
            socket.emit("join_room", String(targetUser.conversationId));
        }
    };

    // Cleanup ONLY when leaving the ChatPage component completely
    useEffect(() => {
        return () => {
            dispatch(setSelectedUser(null));
        };
    }, [dispatch]);

    // Restore or switch chat from localStorage (e.g., when clicking notifications)
    useEffect(() => {
        const savedId = localStorage.getItem('lastChatUserId');
        if (savedId && String(selectedUser?._id) !== String(savedId) && chatUsers.length > 0) {
            const userToRestore = chatUsers.find(u => String(u._id) === String(savedId));
            if (userToRestore) {
                handleSelectUser(userToRestore);
            }
        }
    }, [chatUsers, selectedUser]);

    // Fetch messages when a user is selected
    useEffect(() => {
        const targetId = String(selectedUser?._id);
        if (!targetId || targetId === '[object Object]' || targetId === 'undefined') return;

        // Skip fetch if we already know we are not a member of this group
        if (isNotAMember) {
            console.log(`[ChatPage] Skipping fetch for ${targetId} - User is no longer a member.`);
            dispatch(setMessages([]));
            return;
        }

        console.log(`[ChatPage] Loading chat with ${selectedUser.username} (${targetId})`);
        let isCancelled = false;

        const fetchChatMessages = async () => {
            setIsLoadingMessages(true);
            try {
                const res = await api.get(`/message/all/${targetId}`);
                if (!isCancelled && res.data.success) {
                    dispatch(setMessages(res.data.messages || []));
                    dispatch(setSelectedChatTheme(res.data.theme));
                    markAsSeen();

                    const conversationId = res.data.conversationId;
                    if (conversationId && socket) {
                        socket.emit("join_room", String(conversationId));
                        dispatch(updateChatUserConversation({ userId: targetId, conversationId }));
                    }
                }
            } catch (error) {
                if (!isCancelled) {
                    if (error.response?.status === 403) {
                        // User was likely removed, clear history
                        dispatch(setMessages([]));
                        console.warn("[ChatPage] Unauthorized fetch: User is not a member.");
                    } else {
                        console.error("[ChatPage] Error fetching messages:", error);
                    }
                }
            } finally {
                if (!isCancelled) setIsLoadingMessages(false);
            }
        };
        fetchChatMessages();
        return () => { isCancelled = true; };
    }, [selectedUser?._id, isNotAMember, dispatch, socket]);

    // Fetch user stories for the header
    useEffect(() => {
        if (selectedUser?._id) {
            const fetchHeaderStories = async () => {
                try {
                    const res = await api.get(`/story/user/${selectedUser._id}`);
                    if (res.data.success) {
                        setHeaderStories(res.data.stories || []);
                    }
                } catch (error) {
                    console.error("Error fetching header stories", error);
                }
            };
            fetchHeaderStories();
        } else {
            setHeaderStories([]);
        }
    }, [selectedUser?._id]);

    useEffect(() => {
        const fetchSearch = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const res = await api.get(`/user/search?query=${searchQuery}`);
                if (res.data.success) {
                    const filtered = res.data.users.filter(u =>
                        !chatUsers.some(cu => String(cu._id) === String(u._id))
                    );
                    setSearchResults(filtered);
                }
            } catch (err) {
                console.error("Search error", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeout = setTimeout(fetchSearch, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery, chatUsers]);
    useEffect(() => {
        const fetchGroupSearch = async () => {
            if (!isGroupModalOpen) return;

            setIsGroupSearching(true);
            try {
                const res = await api.get(`/user/search?query=${groupSearchQuery}&followersOnly=true`);
                if (res.data.success) {
                    setGroupSearchResults(res.data.users);
                }
            } catch (err) {
                console.error("Group search error", err);
            } finally {
                setIsGroupSearching(false);
            }
        };

        const timeout = setTimeout(fetchGroupSearch, 300);
        return () => clearTimeout(timeout);
    }, [groupSearchQuery, isGroupModalOpen]);

    useEffect(() => {
        if (selectedUser && (messages?.length || 0) > 0) {
            const lastMsg = messages[messages.length - 1];
            const lastMsgSenderId = lastMsg.senderId?._id ? String(lastMsg.senderId._id) : String(lastMsg.senderId);
            if (lastMsgSenderId === String(selectedUser._id) && !lastMsg.seen) {
                markAsSeen();
                dispatch(clearUnreadCount(String(selectedUser._id)));
            }
        }
    }, [messages, selectedUser]);

    const markAsSeen = async () => {
        if (!selectedUser || isNotAMember) return;
        try {
            await api.get(`/message/seen/${selectedUser._id}`);
            if (socket) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg) {
                    const lastMsgSenderId = lastMsg.senderId?._id ? String(lastMsg.senderId._id) : String(lastMsg.senderId);
                    if (lastMsgSenderId === String(selectedUser._id)) {
                        socket.emit("message_seen", { messageId: lastMsg._id, senderId: lastMsgSenderId });
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const sendMessageHandler = async (e) => {
        if (e) e.preventDefault();
        if (!textMessage.trim() && !replyTo) return;
        if (isSending) return;

        const originalText = textMessage;
        const tempId = `temp-${Date.now()}`;

        // 1. Optimistic UI: Add message to state immediately
        const optimisticMsg = {
            _id: tempId,
            tempId: tempId,
            senderId: user._id,
            receiverId: selectedUser.isGroup ? null : selectedUser._id,
            message: originalText,
            messageType: 'text',
            replyTo: replyTo ? { ...replyTo } : null,
            isLoading: true, // Show loading indicator/opacity in UI
            createdAt: new Date().toISOString(),
            isGroup: !!selectedUser.isGroup,
            conversationId: selectedUser.conversationId
        };

        dispatch(addMessage(optimisticMsg));
        setTextMessage(""); // Clear UI immediately
        setIsSending(true);

        try {
            // 2. Optimistic socket emit for others (optional but good for speed)
            if (socket) {
                socket.emit("send_message", {
                    conversationId: selectedUser.conversationId,
                    senderId: user._id,
                    receiverId: selectedUser.isGroup ? null : selectedUser._id,
                    text: originalText,
                    messageType: 'text',
                    tempId: tempId
                });
            }

            // 3. Actual API call
            const res = await api.post(`/message/send/${selectedUser?._id}`, {
                message: originalText,
                replyTo: replyTo?._id,
                tempId: tempId
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.data.success) {
                const populatedNewMsg = {
                    ...res.data.newMessage,
                    replyTo: replyTo ? { ...replyTo } : null
                };

                // Remove temp and add real
                dispatch(removeTempMessage(tempId));
                dispatch(addMessage(populatedNewMsg));

                // Ensure user is in sidebar immediately with full search result details
                const exists = chatUsers.some(u => String(u._id) === String(selectedUser?._id));
                if (!exists && !selectedUser.isGroup) {
                    dispatch(addChatUser(selectedUser));
                }

                const targetId = String(selectedUser?._id);
                dispatch(updateLastMessage({ userId: targetId, message: populatedNewMsg }));
                dispatch(reorderUsers(targetId));

                if (!selectedUser.conversationId && res.data.newMessage.conversationId) {
                    const updatedUser = { ...selectedUser, conversationId: res.data.newMessage.conversationId };
                    dispatch(setSelectedUser(updatedUser));
                    if (socket) {
                        socket.emit("join_room", res.data.newMessage.conversationId);
                    }
                }

                setReplyTo(null);
            } else {
                // If not successful, restore text for user to try again
                if (originalText) setTextMessage(originalText);
            }
        } catch (error) {
            if (originalText) setTextMessage(originalText);
            if (error.response?.status === 403) {
                toast.error(error.response.data.message || "Message not sent");
            }
            console.error(error);
        } finally {
            setIsSending(false);
        }
    }

    const unsendMessageHandler = async (messageId) => {
        try {
            const res = await api.delete(`/message/delete/${messageId}`);
            if (res.data.success) {
                dispatch(markUnsent({ messageId }));
            }
        } catch (error) {
            console.error(error);
        }
    }

    const reactMessageHandler = async (messageId, emoji) => {
        try {
            const res = await api.post(`/message/react/${messageId}`, { emoji });
            if (res.data.success) {
                dispatch(updateReactions({ messageId, reactions: res.data.reactions }));
            }
        } catch (error) {
            console.error(error);
        }
    }

    const deleteChatHandler = async (targetIdInput, fromSidebar = false) => {
        // Normalize the ID
        const targetUserId = (targetIdInput && typeof targetIdInput === 'string' && targetIdInput !== '[object Object]') ? targetIdInput : selectedUser?._id;
        const username = (targetUserId && typeof targetUserId === 'string') ? chatUsers.find(u => u._id === targetUserId)?.username : selectedUser?.username;

        if (!targetUserId) return;

        const result = await Swal.fire({
            title: fromSidebar ? 'Delete Chat?' : 'Clear Chat history?',
            text: fromSidebar
                ? `Are you sure you want to remove ${username} from your sidebar? Conversation will stay for them.`
                : `Are you sure you want to clear your chat history with ${username}? This will only delete the conversation for you, and not the other user.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: fromSidebar ? 'Yes, delete it!' : 'Yes, clear it!',
            background: '#ffffff',
            borderRadius: '24px',
            customClass: {
                popup: 'rounded-[24px]',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
            }
        });

        if (!result.isConfirmed) return;

        try {
            const res = await api.delete(`/message/delete-chat/${targetUserId}${fromSidebar ? '?sidebar=true' : ''}`);
            if (res.data.success) {
                toast.success(fromSidebar ? "Chat deleted" : "Chat history cleared");

                if (fromSidebar) {
                    // Remove from sidebar
                    dispatch(clearChat(targetUserId));
                    if (selectedUser?._id === targetUserId) {
                        dispatch(setSelectedUser(null));
                    }
                } else {
                    // Just clear messages locally (stay in sidebar)
                    dispatch(clearChatLocally(targetUserId));
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to process request");
        }
    };

    const toggleMuteHandler = async (targetUserId) => {
        try {
            const res = await api.post(`/user/toggle-mute/${targetUserId}`);
            if (res.data.success) {
                dispatch(toggleMuteUserAction(targetUserId));
                toast.success(res.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to toggle mute");
        }
    };

    const handleContextMenu = (e, targetUser) => {
        e.preventDefault();

        // Safety margin to prevent being cut off (menu is roughly 200x150)
        const menuWidth = 200;
        const menuHeight = 160;

        let x = e.clientX;
        let y = e.clientY;

        // If clicking too close to the bottom, spawn menu upwards
        if (y + menuHeight > window.innerHeight) {
            y = y - menuHeight;
        }

        // If clicking too close to the right edge, spawn menu leftwards
        if (x + menuWidth > window.innerWidth) {
            x = x - menuWidth;
        }

        setContextMenu({
            visible: true,
            x,
            y,
            targetUser
        });
    };

    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(prev => ({ ...prev, visible: false }));
            setIsPlusMenuOpen(false); // Close plus menu on outside click
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const scrollToMessage = (msgId) => {
        const element = document.getElementById(`msg-${msgId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(msgId);
            setTimeout(() => setHighlightedMessageId(null), 2000); // Highlight for 2 seconds
        }
    };

    const handleTyping = (e) => {
        setTextMessage(e.target.value);
        if (socket && selectedUser) {
            socket.emit("typing", {
                receiverId: selectedUser.isGroup ? null : selectedUser._id,
                conversationId: selectedUser.conversationId
            });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit("stop_typing", {
                    receiverId: selectedUser.isGroup ? null : selectedUser._id,
                    conversationId: selectedUser.conversationId
                });
            }, 2000);
        }
    };

    useEffect(() => {
        if (!socket || !selectedUser) return;

        const handleIncomingMessage = (newMessage) => {
            setIsTyping(false);

            const senderId = newMessage.senderId?._id ? String(newMessage.senderId._id) : String(newMessage.senderId);
            const receiverId = newMessage.receiverId ? String(newMessage.receiverId) : null;
            const currentUserId = String(user?._id);

            // 1. Group Logic: Match by conversationId (Only if we are still a member)
            const isGroupMatch = selectedUser?.isGroup &&
                String(newMessage.conversationId) === String(selectedUser.conversationId) &&
                !isNotAMember;

            // 2. 1v1 Logic: EXACT Match (One side is ME, other side is SELECTED USER)
            const isMeAndSelectedUser = !selectedUser?.isGroup && (
                (senderId === currentUserId && receiverId === String(selectedUser?._id)) ||
                (senderId === String(selectedUser?._id) && receiverId === currentUserId)
            );

            if (isGroupMatch || isMeAndSelectedUser) {
                dispatch(addMessage(newMessage)); // addMessage deduplicates by _id automatically

                // Update sidebar even in active chat
                const targetId = String(selectedUser?._id);
                dispatch(updateLastMessage({ userId: targetId, message: newMessage }));
                dispatch(reorderUsers(targetId));

                // Always clear unread when active
                if (senderId !== currentUserId) {
                    dispatch(clearUnreadCount(targetId));
                }
            } else {
                // Message for a chat NOT currently open
                const isFromMe = senderId === currentUserId;
                const isToMe = receiverId === currentUserId;

                // Guard: Ignore if not involved in this 1v1
                if (!newMessage.isGroup && !isFromMe && !isToMe) {
                    console.log("[ChatPage] Ignoring irrelevant message for other conversation");
                    return;
                }

                // Determine which sidebar entry to update
                const targetId = newMessage.isGroup ? String(newMessage.conversationId) : (isFromMe ? receiverId : senderId);

                // Ensure user/group is in sidebar
                const exists = chatUsers.some(u => String(u._id) === targetId);
                if (!exists && !newMessage.isGroup) {
                    dispatch(addChatUser({
                        _id: targetId,
                        username: isFromMe ? (newMessage.receiverUsername || selectedUser?.username || "New Chat") : newMessage.senderUsername,
                        profilePicture: isFromMe ? (newMessage.receiverProfilePicture || selectedUser?.profilePicture) : newMessage.senderProfilePicture,
                        conversationId: newMessage.conversationId
                    }));
                }

                dispatch(updateLastMessage({ userId: targetId, message: newMessage }));
                dispatch(reorderUsers(targetId));
                if (!isFromMe) {
                    dispatch(incrementUnreadCount(targetId));
                }
            }
        };

        const handleReactionAdded = ({ messageId, message_id, reactions }) => {
            dispatch(updateReactions({ messageId: messageId || message_id, reactions }));
        };

        const handleDeletedMessage = ({ messageId }) => {
            dispatch(markUnsent({ messageId }));
        };

        const handleStoryDeleted = (storyId) => {
            dispatch(markStoryUnsent({ storyId }));
        };

        const handleUserTyping = ({ senderId, conversationId }) => {
            if (selectedUser?.isGroup) {
                if (String(conversationId) === String(selectedUser.conversationId)) setIsTyping(true);
            } else {
                if (String(senderId) === String(selectedUser._id)) setIsTyping(true);
            }
        };

        const handleUserStoppedTyping = ({ senderId, conversationId }) => {
            if (selectedUser?.isGroup) {
                if (String(conversationId) === String(selectedUser.conversationId)) setIsTyping(false);
            } else {
                if (String(senderId) === String(selectedUser._id)) setIsTyping(false);
            }
        };

        const handleThemeUpdate = ({ conversationId, theme }) => {
            if ((selectedUser?.conversationId && String(conversationId) === String(selectedUser.conversationId)) ||
                (!selectedUser?.conversationId && selectedUser?._id)) {
                // Double check if we should apply this theme
                dispatch(setSelectedChatTheme(theme));
            }
        };

        const handleRemovedFromGroup = ({ conversationId }) => {
            console.log(`[ChatPage] Received removed_from_group for ${conversationId}`);
            if (selectedUser?.isGroup && String(selectedUser._id) === String(conversationId)) {
                // Update local selectedUser state so UI reflects "no longer a member"
                const updatedParticipants = selectedUser.participants?.filter(p => String(p._id || p) !== currentUserId) || [];
                dispatch(updateChatUserMembership({ conversationId, participants: updatedParticipants }));
                toast.error("You are no longer a member of this group.");
            }
        };

        const handleGroupUpdated = (updatedGroup) => {
            console.log(`[ChatPage] Received group_updated for ${updatedGroup._id}`);
            dispatch(updateChatUserMembership({ conversationId: updatedGroup._id, participants: updatedGroup.participants }));
        };

        socket.on('receive_message', handleIncomingMessage);
        socket.on('message_reaction_added', handleReactionAdded);
        socket.on('message_deleted', handleDeletedMessage);
        socket.on('story_deleted_from_chat', handleStoryDeleted);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);
        socket.on('update_theme', handleThemeUpdate);
        socket.on('removed_from_group', handleRemovedFromGroup);
        socket.on('group_updated', handleGroupUpdated);

        return () => {
            socket.off('receive_message', handleIncomingMessage);
            socket.off('message_reaction_added', handleReactionAdded);
            socket.off('message_deleted', handleDeletedMessage);
            socket.off('story_deleted_from_chat', handleStoryDeleted);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stopped_typing', handleUserStoppedTyping);
            socket.off('update_theme', handleThemeUpdate);
            socket.off('removed_from_group', handleRemovedFromGroup);
            socket.off('group_updated', handleGroupUpdated);
        };
    }, [dispatch, socket, selectedUser, user?._id]);

    const handleThemeSelect = async (theme) => {
        if (!selectedUser?._id) return;
        try {
            const res = await api.post('/message/theme', {
                conversationId: selectedUser.conversationId,
                recipientId: selectedUser.isGroup ? null : selectedUser._id,
                theme: theme
            });
            if (res.data.success) {
                dispatch(setSelectedChatTheme(theme));
                // If the backend returned a conversationId (it was null before), update the user in state
                if (!selectedUser.conversationId && res.data.conversationId) {
                    dispatch(setSelectedUser({ ...selectedUser, conversationId: res.data.conversationId }));
                }
                toast.success("Theme updated");
            }
        } catch (error) {
            console.error("Error setting theme", error);
            toast.error("Failed to update theme");
        }
    };

    // Grouping logic for messages
    const groupedMessages = messages?.reduce((groups, msg) => {
        if (!msg.createdAt) return groups;
        const d = new Date(msg.createdAt);
        if (isNaN(d.getTime())) return groups;

        // Use toDateString for a stable local date key (e.g., "Fri Mar 13 2026")
        const dateKey = d.toDateString();

        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
        return groups;
    }, {});

    const formatDateLabel = (dateStr) => {
        if (!dateStr || dateStr === 'Invalid Date') return "";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "";

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const dStr = date.toDateString();
        if (dStr === today.toDateString()) return "Today";
        if (dStr === yesterday.toDateString()) return "Yesterday";

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    return (
        <div className='flex h-[100dvh] bg-[rgb(218,242,242)] text-[#333333] w-full overflow-hidden font-sans border-0'>
            {/* Sidebar User List */}
            <section className='hidden md:flex flex-col w-[350px] shrink-0 border-r border-[#efefef] bg-white px-2'>
                <div className='py-8 px-4 flex items-center justify-between'>
                    <h1 className='font-black text-[22px] tracking-tight text-[#262626]'>{user?.username}</h1>
                    <div className="flex gap-2">
                        <div
                            className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors"
                            title="Create Group"
                            onClick={() => setIsGroupModalOpen(true)}
                        >
                            <Users size={18} className="text-indigo-600" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => searchInputRef.current?.focus()}>
                            <MessageCircle size={18} className="text-[#262626]" />
                        </div>
                    </div>
                </div>
                <div className='px-4 mb-4'>
                    <div className='relative group'>
                        <div className='absolute inset-y-0 left-3 flex items-center pointer-events-none'>
                            <Search size={16} className='text-gray-400 group-focus-within:text-indigo-500 transition-colors' />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='w-full bg-gray-100/80 border-none rounded-xl py-2.5 pl-10 pr-10 text-[14px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all'
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className='absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600'
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
                <div className='flex-1 overflow-y-auto custom-scrollbar pb-10 px-2'>
                    <div className='px-2 mb-4 text-[12px] font-black text-[#8e8e8e] tracking-widest uppercase opacity-60'>
                        {searchQuery ? (isSearching ? 'Searching...' : 'Search Results') : 'Messages'}
                    </div>
                    <div className='flex flex-col gap-1'>
                        {/* Map filtered chat users, sorted by latest message activity */}
                        {(chatUsers || []).filter(u => u?.username?.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => {
                            const timeA = a?._id ? (lastMessages[String(a._id)]?.createdAt || a.updatedAt || 0) : 0;
                            const timeB = b?._id ? (lastMessages[String(b._id)]?.createdAt || b.updatedAt || 0) : 0;
                            return new Date(timeB) - new Date(timeA);
                        }).map((suggestedUser) => {
                            if (!suggestedUser || String(suggestedUser._id) === String(user?._id)) return null;
                            const isOnline = onlineUsers.includes(String(suggestedUser?._id));
                            const isSelected = selectedUser?._id && String(selectedUser?._id) === String(suggestedUser?._id);
                            const unreadCount = unreadCounts[String(suggestedUser?._id)] || 0;
                            const lastMsg = lastMessages[String(suggestedUser?._id)];

                            return (
                                <div key={suggestedUser?._id}
                                    onContextMenu={(e) => handleContextMenu(e, suggestedUser)}
                                    className={`relative p-3 rounded-2xl transition-all duration-300 cursor-pointer active:scale-[0.98] group select-none z-10 ${isSelected ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-gray-100/50' : 'hover:bg-gray-100/50'}`}
                                >
                                    {/* Clickable Overlay */}
                                    <div
                                        className="absolute inset-0 z-20 cursor-pointer"
                                        onClick={() => handleSelectUser(suggestedUser)}
                                    />

                                    {/* Selection Indicator */}
                                    {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#4F46E5] rounded-full pointer-events-none"></div>}

                                    <div className="relative flex items-center gap-3 pointer-events-none">
                                        <div className="relative shrink-0">
                                            <Avatar className={`w-14 h-14 border-2 ${isSelected ? 'border-white' : 'border-transparent'} shadow-sm transition-all group-hover:scale-105`}>
                                                <AvatarImage src={suggestedUser?.profilePicture} className="object-cover" />
                                                <AvatarFallback className={cn("font-black text-[15px] uppercase", getAvatarColor(suggestedUser?.username))}>
                                                    {suggestedUser?.username?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {isOnline && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-white rounded-full transition-all"></div>}
                                        </div>

                                        <div className='flex flex-col flex-1 overflow-hidden ml-1'>
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className={`text-[15px] truncate font-black ${isSelected ? 'text-[#111]' : 'text-[#262626]'}`}>
                                                        {suggestedUser?.username}
                                                    </span>
                                                    {unreadCount > 0 && !isSelected && (
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end shrink-0">
                                                    {lastMsg && (
                                                        <span className={`text-[11px] font-bold opacity-60 font-sans ${unreadCount > 0 ? 'text-blue-500 opacity-100' : 'text-[#8e8e8e]'}`}>
                                                            {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                        </span>
                                                    )}
                                                    {user?.mutedUsers?.includes(suggestedUser?._id) && (
                                                        <BellOff size={12} className="text-gray-400 mt-1" />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center w-full mt-0.5">
                                                <span className={`text-[13px] truncate flex-1 font-medium ${unreadCount > 0 ? 'text-black font-black' : (isSelected ? 'text-indigo-600' : 'text-[#8e8e8e]')}`}>
                                                    {lastMsg ? (() => {
                                                        if (lastMsg.isDeleted) return "Message unsent";
                                                        const senderIdStr = String(lastMsg.senderId?._id || lastMsg.senderId);
                                                        const isMe = senderIdStr === String(user?._id);
                                                        const senderDisplayName = isMe ? "You" : (lastMsg.senderUsername || lastMsg.senderId?.username || suggestedUser.username);
                                                        const isReactionPreview = lastMsg.messageType === 'reaction_info';
                                                        const prefix = isReactionPreview ? "" : `${senderDisplayName}: `;

                                                        let body = lastMsg.message;
                                                        if (lastMsg.messageType === 'reel') body = "Sent a reel";
                                                        else if (lastMsg.messageType === 'image') body = "Sent a photo";
                                                        else if (lastMsg.messageType === 'video') body = "Sent a video";
                                                        else if (lastMsg.messageType === 'file') body = lastMsg.message || "Shared a file";
                                                        else if (lastMsg.messageType === 'post') body = "Shared a post";
                                                        else if (lastMsg.messageType === 'story_reply') body = isMe ? "Replied to their story" : "Replied to your story";
                                                        else if (lastMsg.messageType === 'story_reaction') body = isMe ? `Reacted to their story: ${lastMsg.message}` : `Reacted to your story: ${lastMsg.message}`;
                                                        else if (lastMsg.messageType === 'reaction_info') body = lastMsg.message;
                                                        return prefix + body;
                                                    })() : (isOnline ? 'Active now' : 'Offline')}
                                                </span>
                                                {unreadCount > 0 && !isSelected && (
                                                    <div className="min-w-[18px] h-[18px] px-1.5 bg-blue-500 flex items-center justify-center rounded-full ml-2 shadow-sm">
                                                        <span className="text-[9px] font-black text-white">{unreadCount}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Map global search results */}
                        {searchQuery && searchResults.map((suggestedUser) => (
                            <div key={suggestedUser?._id}
                                className={`relative p-3 rounded-2xl transition-all duration-300 cursor-pointer active:scale-[0.98] group select-none z-10 hover:bg-gray-100/50`}
                            >
                                <div
                                    className="absolute inset-0 z-20 cursor-pointer"
                                    onClick={() => {
                                        handleSelectUser(suggestedUser);
                                        setSearchQuery("");
                                    }}
                                />
                                <div className="relative flex items-center gap-3 pointer-events-none">
                                    <div className="relative shrink-0">
                                        <Avatar className={`w-14 h-14 border-2 border-transparent shadow-sm transition-all group-hover:scale-105`}>
                                            <AvatarImage src={suggestedUser?.profilePicture} className="object-cover" />
                                            <AvatarFallback className={cn("text-black font-black text-[15px] uppercase", getAvatarColor(suggestedUser?.username))}>
                                                {suggestedUser?.username?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className='flex flex-col flex-1 overflow-hidden ml-1'>
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`text-[15px] truncate font-black text-[#262626]`}>{suggestedUser?.username}</span>
                                        </div>
                                        <div className="flex justify-between items-center w-full mt-0.5">
                                            <span className={`text-[12px] truncate flex-1 font-medium text-indigo-500`}>
                                                Discovery - Tap to start chat
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Main Chat Area */}
            <section className='flex-1 flex flex-col h-full bg-white relative overflow-hidden'>
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div className='flex items-center justify-between px-8 py-5 border-b border-[#efefef] bg-white/95 backdrop-blur-md z-40 sticky top-0'>
                            <div className='flex items-center gap-4'>
                                <div
                                    className={`relative z-10 ${(headerStories?.length || 0) > 0 ? 'cursor-pointer' : ''}`}
                                    onClick={() => (headerStories?.length || 0) > 0 && setIsHeaderStoryOpen(true)}
                                >
                                    <Avatar className={`w-13 h-13 border-2 ${headerStories.length > 0 ? 'border-pink-500' : 'border-indigo-50'} shadow-sm transition-transform active:scale-95`}>
                                        <AvatarImage src={selectedUser?.profilePicture} className="object-cover" />
                                        <AvatarFallback className={cn("text-black font-black uppercase text-[15px]", getAvatarColor(selectedUser?.username))}>{selectedUser?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {!selectedUser.isGroup && onlineUsers.includes(selectedUser?._id) && (
                                        <div className="absolute bottom-0 right-0.5 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full"></div>
                                    )}
                                </div>
                                <div
                                    className='flex flex-col cursor-pointer hover:opacity-70 transition-opacity z-10'
                                    onClick={() => !selectedUser.isGroup && navigate(`/profile/${selectedUser?._id}`)}
                                >
                                    <span className='font-black text-[18px] text-[#111] leading-none mb-1.5'>
                                        {selectedUser?.username}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${onlineUsers.includes(selectedUser?._id) || selectedUser.isGroup ? 'text-green-500' : 'text-gray-400'}`}>
                                            {selectedUser.isGroup ? `${selectedUser.participants.length} members` : (onlineUsers.includes(selectedUser?._id) ? 'Active now' : 'Offline')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedUser.isGroup && !isNotAMember && (
                                    <Button variant="ghost" size="icon" onClick={() => setIsGroupInfoOpen(true)} className="rounded-full w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><Users size={20} /></Button>
                                )}
                                {(!selectedUser.isGroup || selectedUser.groupAdmin?.some(a => String(a?._id || a) === String(user?._id))) && (
                                    <Button variant="ghost" size="icon" onClick={() => setIsThemeModalOpen(true)} className="rounded-full w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                                        <Palette size={20} />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => searchInputRef.current?.focus()} className="rounded-full w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><MessageCircle size={20} /></Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        if (selectedUser.isGroup && !isNotAMember) {
                                            Swal.fire({
                                                title: "Group Locked",
                                                text: "You must leave the group before you can delete the chat from your sidebar.",
                                                icon: "info",
                                                confirmButtonColor: "#4F46E5",
                                                borderRadius: "24px"
                                            });
                                            return;
                                        }
                                        deleteChatHandler(selectedUser._id, false);
                                    }}
                                    className={`rounded-full w-10 h-10 transition-all ${selectedUser.isGroup && !isNotAMember ? 'opacity-30 grayscale cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                >
                                    <Trash2 size={20} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        localStorage.removeItem('lastChatUserId');
                                        dispatch(setSelectedUser(null));
                                    }}
                                    className="rounded-full w-10 h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <X size={20} />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col relative overflow-hidden">
                            {/* Theme Background Layer */}
                            <div
                                className="absolute inset-0 z-0 transition-all duration-700 ease-in-out bg-[#fafafa]"
                                style={{
                                    backgroundImage: THEMES.find(t => t.id === selectedChatTheme?.id)?.backgroundImage ? `url(${THEMES.find(t => t.id === selectedChatTheme?.id)?.backgroundImage})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                }}
                            />

                            {/* Dark Overlay for contrast when background is present */}
                            {THEMES.find(t => t.id === selectedChatTheme?.id)?.backgroundImage && (
                                <div className="absolute inset-0 bg-black/15 z-[1] pointer-events-none" />
                            )}

                            <ScrollToBottom
                                className='flex-1 p-0 flex flex-col overflow-hidden relative z-10 h-full bg-transparent'
                                scrollViewClassName="custom-scrollbar px-10 py-8 relative z-10 h-full !bg-transparent"
                                followButtonClassName='hidden'
                            >
                                <div className="flex flex-col gap-1 min-h-full pb-6 relative z-10">
                                    {isLoadingMessages ? (
                                        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                            <p className="text-[13px] font-black text-indigo-900/40 uppercase tracking-widest">Securing your chat...</p>
                                        </div>
                                    ) : (
                                        Object.keys(groupedMessages || {}).map(date => {
                                            const label = formatDateLabel(date);
                                            if (!label) return null;
                                            return (
                                                <React.Fragment key={date}>
                                                    <div className="flex justify-center my-8">
                                                        <span className="text-[10px] font-black text-[#8e8e8e] uppercase tracking-[0.2em] bg-white border border-gray-100 px-5 py-2 rounded-full shadow-sm">
                                                            {label}
                                                        </span>
                                                    </div>
                                                    {groupedMessages[date].map((msg) => (
                                                        <MessageBubble
                                                            key={msg._id}
                                                            msg={msg}
                                                            isSender={String(msg.senderId?._id || msg.senderId) === String(user?._id)}
                                                            currentUser={user}
                                                            otherUser={selectedUser}
                                                            onReply={setReplyTo}
                                                            onDelete={unsendMessageHandler}
                                                            onReact={reactMessageHandler}
                                                            onScrollTo={scrollToMessage}
                                                            onStoryClick={(story) => setStoryToView(story)}
                                                            onPostClick={(post) => {
                                                                dispatch(setSelectedPost(post));
                                                                setSelectedPostForModal(post);
                                                                setOpenPostModal(true);
                                                            }}
                                                            isHighlighted={highlightedMessageId === msg._id}
                                                        />
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                    {isTyping && (
                                        <div className='flex mb-6 justify-start animate-in slide-in-from-bottom-4 duration-500'>
                                            <div className='flex items-center gap-2 px-6 py-4 rounded-[24px] bg-white border border-[#efefef] shadow-[0_4px_12px_rgba(0,0,0,0.03)]'>
                                                <div className="flex gap-1.5">
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollToBottom>
                        </div>

                        {isHeaderStoryOpen && headerStories.length > 0 && (
                            <StoryViewer
                                stories={headerStories}
                                onClose={() => setIsHeaderStoryOpen(false)}
                                onStoryViewed={() => { }}
                            />
                        )}

                        {/* Story Viewer in Chat */}
                        {storyToView && (
                            <StoryViewer
                                stories={[storyToView]}
                                onClose={() => setStoryToView(null)}
                                onStoryViewed={() => { }}
                            />
                        )}

                        {/* Input Section */}
                        <div className='px-8 py-4 pb-5 bg-white border-t border-[#f3f4f6] flex flex-col gap-3 relative z-30'>
                            {isNotAMember ? (
                                <div className="flex items-center justify-center p-4 bg-gray-50/80 rounded-[28px] border border-gray-100 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                                    <span className="text-[13px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <X size={14} /> You are no longer a member of this group
                                    </span>
                                </div>
                            ) : (
                                <>
                                    {replyTo && (
                                        <div className="flex items-center justify-between bg-indigo-50 border-l-[4px] border-indigo-600 px-5 py-4 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex flex-col overflow-hidden max-w-[85%]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Reply size={13} className="text-indigo-600" strokeWidth={3} />
                                                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                                                        Replying to {String(replyTo.senderId) === String(user?._id) ? "yourself" : selectedUser?.username}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-indigo-900/60 truncate font-medium">
                                                    "{replyTo.message}"
                                                </p>
                                            </div>
                                            <button onClick={() => setReplyTo(null)} className="p-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-full transition-all">
                                                <X size={16} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={sendMessageHandler} className="flex items-center gap-3">
                                        <div className="flex-1 flex items-center bg-[#f9fafb] border border-[#f3f4f6] rounded-[28px] py-0.5 pl-6 pr-2 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all duration-300 relative">
                                            {/* Plus (+) Menu Trigger and Dropup */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsPlusMenuOpen(!isPlusMenuOpen);
                                                    }}
                                                    className={`p-2 hover:bg-white rounded-full transition-all text-gray-400 hover:text-indigo-600 active:scale-95 flex items-center justify-center ${isPlusMenuOpen ? 'rotate-45 text-indigo-500' : ''}`}
                                                >
                                                    <Plus size={22} strokeWidth={2.5} />
                                                </button>

                                                {/* Dropup Menu */}
                                                {isPlusMenuOpen && (
                                                    <div className="absolute bottom-[calc(100%+8px)] left-0 bg-white border border-gray-100 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] rounded-[20px] py-1.5 min-w-[180px] z-50 animate-in slide-in-from-bottom-2 duration-300">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                document.getElementById('media-upload-final').setAttribute('accept', '*/*');
                                                                document.getElementById('media-upload-final').click();
                                                                setIsPlusMenuOpen(false);
                                                            }}
                                                            className="w-full h-11 flex items-center gap-3 px-4 hover:bg-indigo-50 text-[#262626] transition-all group"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                                <FileText size={16} className="text-indigo-600" />
                                                            </div>
                                                            <span className="text-[13px] font-bold">Document</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                document.getElementById('media-upload-final').setAttribute('accept', 'image/*,video/*');
                                                                document.getElementById('media-upload-final').click();
                                                                setIsPlusMenuOpen(false);
                                                            }}
                                                            className="w-full h-11 flex items-center gap-3 px-4 hover:bg-indigo-50 text-[#262626] transition-all group"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                                <ImageIcon size={16} className="text-indigo-600" />
                                                            </div>
                                                            <span className="text-[13px] font-bold">Photos & videos</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <button type="button" className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-indigo-500 group">
                                                <Smile className="group-hover:scale-110 transition-transform" size={24} strokeWidth={1.5} />
                                            </button>
                                            <input
                                                type="text"
                                                value={textMessage}
                                                onChange={handleTyping}
                                                disabled={isSending}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && textMessage.trim() && !isSending) {
                                                        e.preventDefault();
                                                        sendMessageHandler(e);
                                                    }
                                                }}
                                                placeholder="Message..."
                                                className='flex-1 bg-transparent py-2.5 outline-none text-[15px] font-medium placeholder:text-gray-400 text-gray-800 disabled:opacity-50'
                                            />
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    id="media-upload-final"
                                                    multiple
                                                    accept="*/*"
                                                    onChange={async (e) => {
                                                        const files = Array.from(e.target.files);
                                                        if (files.length === 0) return;

                                                        for (const file of files) {
                                                            if (file.size > 10 * 1024 * 1024) {
                                                                toast.error(`File "${file.name}" is too large (>10MB).`);
                                                                continue;
                                                            }

                                                            const tempId = Math.random().toString(36).substr(2, 9) + Date.now();
                                                            const previewUrl = URL.createObjectURL(file);
                                                            const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
                                                            const isVid = file.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(file.name);
                                                            const finalType = isImg ? 'image' : (isVid ? 'video' : 'file');

                                                            try {
                                                                // Optimistic local update
                                                                const tempMsg = {
                                                                    _id: tempId,
                                                                    tempId: tempId,
                                                                    senderId: user._id,
                                                                    receiverId: selectedUser._id,
                                                                    message: finalType === 'file' ? file.name : "",
                                                                    messageType: finalType,
                                                                    mediaUrl: previewUrl,
                                                                    isLoading: true,
                                                                    createdAt: new Date().toISOString()
                                                                };
                                                                dispatch(addMessage(tempMsg));

                                                                const formData = new FormData();
                                                                formData.append("message", finalType === 'file' ? file.name : "");
                                                                formData.append("messageType", finalType);
                                                                formData.append("media", file);
                                                                formData.append("tempId", tempId);
                                                                if (replyTo?._id) {
                                                                    formData.append("replyTo", replyTo._id);
                                                                }

                                                                const res = await api.post(`/message/send/${selectedUser?._id}`, formData, {
                                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                                });
                                                                if (res.data.success) {
                                                                    const populatedNewMsg = {
                                                                        ...res.data.newMessage,
                                                                        replyTo: replyTo ? { ...replyTo } : null
                                                                    };
                                                                    dispatch(addMessage(populatedNewMsg));

                                                                    // Ensure user is in sidebar
                                                                    // Critical: Ensure user is in sidebar and at the top
                                                                    const exists = chatUsers.some(u => String(u._id) === String(selectedUser?._id));
                                                                    if (!exists && !selectedUser.isGroup) {
                                                                        dispatch(addChatUser(selectedUser));
                                                                    }

                                                                    dispatch(updateLastMessage({ userId: selectedUser._id, message: populatedNewMsg }));
                                                                    dispatch(reorderUsers(selectedUser._id));
                                                                    setReplyTo(null);
                                                                }
                                                            } catch (err) {
                                                                console.log(err);
                                                                const errorMessage = err.response?.data?.message || `Failed to send "${file.name}"`;
                                                                toast.error(errorMessage);
                                                                dispatch(removeTempMessage({ tempId }));
                                                            }
                                                        }
                                                        e.target.value = null; // Clear input for re-selection
                                                    }}
                                                />


                                                {textMessage.trim() ? (
                                                    <button
                                                        type="submit"
                                                        disabled={isSending}
                                                        className='ml-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-black text-[13px] tracking-wide shadow-md shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                                                    >
                                                        {isSending ? 'SENDING...' : 'SEND'}
                                                    </button>
                                                ) : (
                                                    <div className="p-2 text-gray-300">
                                                        <Send size={22} strokeWidth={1.5} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className='flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#fafafa]'>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 bg-white shadow-sm border border-gray-100">
                            <MessageCircle className="w-12 h-12 text-[#262626]" strokeWidth={1.5} />
                        </div>
                        <h2 className='text-3xl font-black mb-2 tracking-tight text-[#262626] uppercase'>Your Messages</h2>
                        <p className='text-[#8e8e8e] mb-8 text-[16px] max-w-xs font-medium'>Send private photos and messages to a friend or group.</p>
                        <Button
                            onClick={() => searchInputRef.current?.focus()}
                            className='bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black h-12 px-10 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-200'
                        >
                            NEW MESSAGE
                        </Button>
                    </div>
                )}
            </section>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div
                    className="fixed z-[100] bg-white border border-gray-100 shadow-xl rounded-2xl py-2 min-w-[200px] animate-in fade-in zoom-in duration-200"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{contextMenu.targetUser?.username}</span>
                    </div>

                    <button
                        onClick={() => {
                            toggleMuteHandler(contextMenu.targetUser._id);
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 text-gray-700 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white">
                            {user?.mutedUsers?.includes(contextMenu.targetUser._id) ? <Volume2 size={16} className="text-gray-500" /> : <VolumeOff size={16} className="text-gray-500" />}
                        </div>
                        <span className="text-[14px] font-bold">
                            {user?.mutedUsers?.includes(contextMenu.targetUser._id) ? 'Unmute' : 'Mute Notifications'}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            const isGroupMember = contextMenu.targetUser?.isGroup && (
                                contextMenu.targetUser?.participants?.some(p => String(p._id || p) === String(user?._id)) ||
                                contextMenu.targetUser?.groupAdmin?.some(a => String(a) === String(user?._id))
                            );

                            if (isGroupMember) {
                                return Swal.fire({
                                    title: "Group Locked",
                                    text: "You must leave the group before you can delete it from your sidebar.",
                                    icon: "info",
                                    confirmButtonColor: "#4F46E5",
                                    borderRadius: "24px"
                                });
                            }

                            deleteChatHandler(contextMenu.targetUser._id, true);
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors group ${contextMenu.targetUser?.isGroup && (
                            contextMenu.targetUser?.participants?.some(p => String(p._id || p) === String(user?._id)) ||
                            contextMenu.targetUser?.groupAdmin?.some(a => String(a) === String(user?._id))
                        ) ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-red-50 text-red-600'
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${contextMenu.targetUser?.isGroup && (
                            contextMenu.targetUser?.participants?.some(p => String(p._id || p) === String(user?._id)) ||
                            contextMenu.targetUser?.groupAdmin?.some(a => String(a) === String(user?._id))
                        ) ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500 group-hover:bg-white'
                            }`}>
                            <Trash2 size={16} />
                        </div>
                        <span className="text-[14px] font-bold">Delete Chat</span>
                    </button>
                </div>
            )}

            {/* Group Creation Modal */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[8px] animate-in fade-in duration-300 px-4">
                    <div className="bg-white rounded-[32px] w-full max-w-[440px] max-h-[85vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-gray-100">
                        {/* Fixed Header */}
                        <div className="px-8 pt-10 pb-6 bg-white shrink-0 border-b border-gray-50 relative">
                            <button
                                onClick={() => { setIsGroupModalOpen(false); setIsAddingMembers(false); setGroupSearchQuery(""); }}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                            <h2 className="text-[26px] font-black text-[#111] tracking-tight leading-7">
                                {isAddingMembers ? "Add Members" : "Create Group"}
                            </h2>
                            <p className="text-[13px] font-medium text-gray-400 mt-1">{isAddingMembers ? "Expand your conversation" : "Select members to start"}</p>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
                            {!isAddingMembers && (
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-1">Group Title</label>
                                    <input
                                        type="text"
                                        id="group-name-input"
                                        placeholder="Name your group..."
                                        className="w-full bg-gray-50 border-gray-100 border rounded-2xl py-4 px-5 text-[15px] font-bold outline-none ring-4 ring-transparent focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/30 transition-all"
                                    />
                                </div>
                            )}

                            <div className="space-y-4">
                                <label className="text-[11px] font-black uppercase text-gray-500 tracking-widest px-1">Select Participants</label>
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={17} />
                                    <input
                                        type="text"
                                        value={groupSearchQuery}
                                        placeholder="Find followers..."
                                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                                        className="w-full bg-gray-50 border-gray-100 border rounded-2xl py-3.5 pl-12 pr-5 text-[14px] font-bold outline-none ring-4 ring-transparent focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/30 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5 pt-2">
                                    {(groupSearchResults?.length || 0) > 0 ? groupSearchResults
                                        .filter(u => !selectedUser?.participants?.some(p => String(p._id || p) === String(u._id)))
                                        .map((u) => (
                                            <div
                                                key={u._id}
                                                onClick={() => {
                                                    const el = document.getElementById(`check-${u._id}`);
                                                    if (el) el.checked = !el.checked;
                                                }}
                                                className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-indigo-50/50 cursor-pointer transition-all group border border-transparent hover:border-indigo-100/50"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <Avatar className="w-11 h-11 border-2 border-white shadow-sm transition-transform group-hover:scale-105">
                                                        <AvatarImage src={u.profilePicture} className="object-cover" />
                                                        <AvatarFallback className={cn("font-bold text-sm", getAvatarColor(u.username))}>{u.username?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-[15px] font-black text-[#262626]">{u.username}</span>
                                                        <span className="text-[12px] text-gray-400 font-medium">@{u.username}</span>
                                                    </div>
                                                </div>
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`check-${u._id}`}
                                                        value={u._id}
                                                        className="w-6 h-6 rounded-lg border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer accent-indigo-600 shadow-sm transition-all"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                        )) : (
                                        groupSearchQuery && !isGroupSearching ? (
                                            <div className="py-8 text-center text-gray-400 font-medium text-[14px]">No followers found</div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fixed Footer */}
                        <div className="px-8 pb-8 pt-2 bg-white shrink-0">
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] h-14 font-black text-[15px] shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                                onClick={async () => {
                                    const groupNameInput = document.getElementById('group-name-input');
                                    const groupName = isAddingMembers ? null : groupNameInput?.value;
                                    const selectedIds = Array.from(document.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

                                    if (!isAddingMembers && !groupName) return toast.error("Please name your group");
                                    if (selectedIds.length === 0) return toast.error("Select at least one member");

                                    try {
                                        if (isAddingMembers) {
                                            const res = await api.post('/message/group/add', { conversationId: selectedUser.conversationId, participants: selectedIds });
                                            if (res.data.success) {
                                                const updatedParticipants = res.data.group.participants;
                                                dispatch(setSelectedUser({ ...selectedUser, participants: updatedParticipants }));
                                                setIsGroupModalOpen(false);
                                                setIsAddingMembers(false);
                                                toast.success("Group members updated!");
                                            }
                                        } else {
                                            const res = await api.post('/message/group/create', { groupName, participants: selectedIds });
                                            if (res.data.success) {
                                                dispatch(addChatUser(res.data.group));
                                                handleSelectUser(res.data.group);
                                                setIsGroupModalOpen(false);
                                                toast.success("Group created!");
                                            }
                                        }
                                    } catch (err) {
                                        toast.error(isAddingMembers ? "Failed to add members" : "Failed to create group");
                                    }
                                }}
                            >
                                {isAddingMembers ? "Add Members" : "Create My Group"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Info Modal */}
            {isGroupInfoOpen && selectedUser?.isGroup && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[8px] animate-in fade-in duration-300 px-4">
                    <div className="bg-white rounded-[32px] w-full max-w-[440px] max-h-[85vh] flex flex-col overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 border border-gray-100">
                        {/* Header Section */}
                        <div className="px-8 pt-10 pb-8 flex flex-col items-center bg-white border-b border-gray-50 shrink-0 relative">
                            <button
                                onClick={() => setIsGroupInfoOpen(false)}
                                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                            <div className="relative mb-5">
                                <Avatar className="w-24 h-24 border-4 border-white shadow-[0_12px_24px_-10px_rgba(0,0,0,0.2)]">
                                    <AvatarImage src={selectedUser.profilePicture} className="object-cover" />
                                    <AvatarFallback className={cn("text-3xl font-black", getAvatarColor(selectedUser.username))}>{selectedUser.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 p-2.5 bg-indigo-600 rounded-full text-white shadow-lg shadow-indigo-100 ring-4 ring-white">
                                    <Users size={16} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 group/edit">
                                <h3 className="text-[24px] font-black text-[#111] tracking-tight">{selectedUser.username}</h3>
                                {selectedUser?.groupAdmin?.some(adminId => String(adminId) === String(user?._id)) && (
                                    <button
                                        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-all"
                                        onClick={async () => {
                                            const { value: newName } = await Swal.fire({
                                                title: 'Rename Group',
                                                input: 'text',
                                                inputLabel: 'New group name',
                                                inputValue: selectedUser.username,
                                                showCancelButton: true,
                                                inputValidator: (value) => {
                                                    if (!value) return 'Please enter a name'
                                                }
                                            })
                                            if (newName && newName !== selectedUser.username) {
                                                try {
                                                    const res = await api.post('/message/group/update', { conversationId: selectedUser.conversationId, groupName: newName });
                                                    if (res.data.success) {
                                                        dispatch(setSelectedUser({ ...selectedUser, username: newName }));
                                                        dispatch(setChatUsers(chatUsers.map(u => String(u._id) === String(selectedUser._id) ? { ...u, username: newName } : u)));
                                                        toast.success("Group renamed!");
                                                    }
                                                } catch (err) {
                                                    toast.error("Failed to rename group");
                                                }
                                            }
                                        }}
                                    >
                                        <Plus className="rotate-45" size={16} />
                                    </button>
                                )}
                            </div>
                            <div className="mt-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-widest">
                                {selectedUser?.participants?.length || 0} Active Members
                            </div>
                        </div>

                        {/* Members List Section */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                            <div className="flex items-center px-4 mb-4 justify-between sticky -top-4 bg-white z-[30] py-4 -mx-6 px-10 border-b border-gray-50/50">
                                <label className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Group Members</label>
                                {selectedUser?.groupAdmin?.some(adminId => String(adminId) === String(user?._id)) && (
                                    <button
                                        className="text-[12px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-all"
                                        onClick={() => {
                                            setIsAddingMembers(true);
                                            setIsGroupModalOpen(true);
                                            setIsGroupInfoOpen(false);
                                        }}
                                    >
                                        <Plus size={14} strokeWidth={3} /> Add
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1">
                                {selectedUser?.participants?.map(p => {
                                    const isMe = String(p?._id || p) === String(user?._id);
                                    const isAdmin = selectedUser?.groupAdmin?.some(adminId => String(adminId) === String(p?._id || p));
                                    const amIAdmin = selectedUser?.groupAdmin?.some(adminId => String(adminId) === String(user?._id));
                                    return (
                                        <div key={p._id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-gray-50 group transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <Avatar className="w-11 h-11 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                                        <AvatarImage src={p.profilePicture} className="object-cover" />
                                                        <AvatarFallback className={cn("font-bold text-sm", getAvatarColor(p.username))}>{p.username?.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    {onlineUsers.includes(p._id) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[15px] font-black text-[#262626] flex items-center gap-2">
                                                        {p.username}
                                                        {isMe && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">You</span>}
                                                    </span>
                                                    {isAdmin && (
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 mt-0.5 opacity-80">
                                                            <Shield size={10} strokeWidth={3} /> Administrator
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {amIAdmin && !isMe && (
                                                <button
                                                    onClick={async () => {
                                                        const confirm = await Swal.fire({
                                                            title: 'Remove Member?',
                                                            text: `Remove ${p.username} from the group?`,
                                                            icon: 'warning',
                                                            showCancelButton: true,
                                                            confirmButtonText: 'Remove',
                                                            confirmButtonColor: '#ef4444',
                                                            cancelButtonColor: '#94a3b8',
                                                            borderRadius: '24px'
                                                        });

                                                        if (confirm.isConfirmed) {
                                                            try {
                                                                const res = await api.post('/message/group/remove', {
                                                                    conversationId: selectedUser.conversationId,
                                                                    userId: p._id || p
                                                                });
                                                                if (res.data.success) {
                                                                    const updatedParticipants = selectedUser.participants.filter(m => String(m._id || m) !== String(p._id || p));
                                                                    dispatch(setSelectedUser({ ...selectedUser, participants: updatedParticipants }));
                                                                    toast.success("Member removed");
                                                                }
                                                            } catch (err) {
                                                                toast.error("Failed to remove member");
                                                            }
                                                        }
                                                    }}
                                                    className="p-2.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-full transition-all"
                                                >
                                                    <UserMinus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Section */}
                        <div className="p-8 border-t border-gray-50 flex gap-4 bg-white shrink-0">
                            <Button variant="outline" className="flex-1 rounded-2xl h-13 font-black text-[14px] bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600 transition-all border-none shadow-none" onClick={() => setIsGroupInfoOpen(false)}>CLOSE</Button>
                            <Button
                                variant="destructive"
                                className="flex-1 rounded-2xl h-13 font-black text-[14px] bg-red-50 text-red-600 hover:bg-red-100 transition-all border-none shadow-none"
                                onClick={async () => {
                                    const confirm = await Swal.fire({
                                        title: 'Leave Group?',
                                        text: "You won't be able to send or receive messages in this group.",
                                        icon: 'warning',
                                        showCancelButton: true,
                                        confirmButtonText: 'Yes, leave',
                                        confirmButtonColor: '#ef4444',
                                        cancelButtonColor: '#94a3b8',
                                        borderRadius: '24px'
                                    });
                                    if (confirm.isConfirmed) {
                                        try {
                                            const myId = String(user?._id || user?.id || "");
                                            if (isNotAMember) {
                                                setIsGroupInfoOpen(false);
                                                return;
                                            }

                                            // 1. Show loading state to prevent double clicks
                                            Swal.fire({
                                                title: 'Leaving group...',
                                                allowOutsideClick: false,
                                                showConfirmButton: false,
                                                didOpen: () => Swal.showLoading()
                                            });

                                            const targetId = selectedUser.conversationId || selectedUser._id;
                                            await api.post('/message/group/remove', {
                                                conversationId: targetId,
                                                userId: myId
                                            });

                                            // 2. Clear state and close modal instantly
                                            const updatedParticipants = selectedUser.participants?.filter(p => String(p?._id || p) !== myId) || [];
                                            dispatch(updateChatUserMembership({ conversationId: selectedUser._id, participants: updatedParticipants }));

                                            Swal.close();
                                            setTimeout(() => setIsGroupInfoOpen(false), 300); // Small delay to guarantee state sync
                                            toast.success("You left the group");
                                        } catch (err) {
                                            Swal.close();
                                            setIsGroupInfoOpen(false); // CLOSE ANYWAY to avoid stale modal
                                            toast.info("Membership updated");
                                        }
                                    }
                                }}
                            >
                                LEAVE GROUP
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Modal */}
            {openPostModal && selectedPostForModal && (
                <PostModal
                    open={openPostModal}
                    setOpen={setOpenPostModal}
                    post={selectedPostForModal}
                />
            )}

            {/* Comment Dialog */}
            {openCommentDialog && (
                <CommentDialog open={openCommentDialog} setOpen={setOpenCommentDialog} />
            )}
            <ThemeSelectorModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                onSelect={handleThemeSelect}
                currentTheme={selectedChatTheme}
            />
        </div>
    );
};

export default ChatPage;
