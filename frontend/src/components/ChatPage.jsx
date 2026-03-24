import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn, getAvatarColor } from '@/lib/utils';
import { Button } from './ui/button';
import { MessageCircle, Send, X, Image as ImageIcon, Smile, Plus, FileText, Reply, Trash2, Search, BellOff, Bell, VolumeOff, Volume2 } from 'lucide-react';
import api from '@/api';
import { toast } from 'sonner';
import { toggleMuteUserAction } from '../redux/authSlice';
import Swal from 'sweetalert2';
import { setMessages, addMessage, updateMessageStatus, updateReactions, markUnsent, markStoryUnsent, incrementUnreadCount, clearUnreadCount, updateLastMessage, removeTempMessage, setSelectedUser, setChatUsers, reorderUsers, updateChatUserConversation, addChatUser, clearChat } from '../redux/chatSlice';
import ScrollToBottom from 'react-scroll-to-bottom';
import MessageBubble from './MessageBubble';
import useGetChatUsers from '@/hooks/useGetChatUsers';
import { setSelectedPost } from '@/redux/postSlice';
import StoryViewer from './StoryViewer';
import PostModal from './PostModal';
import CommentDialog from './CommentDialog';

const NOTIFICATION_SOUND_URL = "/notification.mp3"; // Reference local file

const ChatPage = () => {
    const navigate = useNavigate();
    useGetChatUsers();
    const [textMessage, setTextMessage] = useState("");
    const { user } = useSelector(store => store.auth);
    const { onlineUsers = [], messages = [], unreadCounts = {}, lastMessages = {}, selectedUser, chatUsers = [] } = useSelector(store => store.chat || {});
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
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false); // New state for (+) menu
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, targetUser: null });
    const searchInputRef = useRef(null);
    let typingTimeout = useRef(null);


    // Clear unread count when chat selected
    const handleSelectUser = (targetUser) => {
        if (!targetUser || targetUser._id === selectedUser?._id) return;

        // Leave previous conversation room if any
        if (socket && selectedUser?.conversationId) {
            socket.emit("leave_room", String(selectedUser.conversationId));
        }

        dispatch(setSelectedUser(targetUser));
        localStorage.setItem('lastChatUserId', targetUser._id);
        dispatch(setMessages([])); // Clear messages for new user immediately
        dispatch(clearUnreadCount(String(targetUser._id)));

        // Immediate sync with backend
        api.get(`/message/seen/${targetUser._id}`).catch(() => { });

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

    // Restore last chat on refresh
    useEffect(() => {
        if (!selectedUser && chatUsers.length > 0) {
            const savedId = localStorage.getItem('lastChatUserId');
            if (savedId) {
                const userToRestore = chatUsers.find(u => String(u._id) === savedId);
                if (userToRestore) {
                    handleSelectUser(userToRestore);
                }
            }
        }
    }, [chatUsers, selectedUser]);

    // Fetch messages when a user is selected
    useEffect(() => {
        if (!selectedUser?._id) return;

        console.log(`[ChatPage] Loading chat with ${selectedUser.username} (${selectedUser._id})`);

        const fetchMessages = async () => {
            try {
                const res = await api.get(`/message/all/${selectedUser._id}`);
                if (res.data.success) {
                    dispatch(setMessages(res.data.messages || []));
                    markAsSeen();

                    // Join the conversation socket room
                    const conversationId = res.data.conversationId;
                    if (conversationId && socket) {
                        console.log(`[ChatPage] Joining room: ${conversationId}`);
                        socket.emit("join_room", String(conversationId));
                        // Update the conversationId in the chatUsers list
                        dispatch(updateChatUserConversation({ userId: selectedUser._id, conversationId }));
                    }
                }
            } catch (error) {
                console.error("[ChatPage] Error fetching messages:", error);
            }
        };
        fetchMessages();
    }, [selectedUser?._id, dispatch, socket]);

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
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.trim()) {
                setIsSearching(true);
                try {
                    const res = await api.get(`/user/search?query=${searchQuery}`);
                    if (res.data.success) {
                        // Filter out users already in active chat list to avoid duplicates
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
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, chatUsers]);

    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId === selectedUser._id && !lastMsg.seen) {
                markAsSeen();
                dispatch(clearUnreadCount(String(selectedUser._id)));
            }
        }
    }, [messages, selectedUser]);

    const markAsSeen = async () => {
        if (!selectedUser) return;
        try {
            await api.get(`/message/seen/${selectedUser._id}`);
            if (socket) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && lastMsg.senderId === selectedUser._id) {
                    socket.emit("message_seen", { messageId: lastMsg._id, senderId: lastMsg.senderId });
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const sendMessageHandler = async (e) => {
        e.preventDefault();
        if (!textMessage.trim() && !replyTo) return;

        try {
            const tempId = Date.now().toString();

            // Optimistic socket emit as requested
            if (socket) {
                socket.emit("send_message", {
                    conversationId: selectedUser.conversationId,
                    senderId: user._id,
                    receiverId: selectedUser._id,
                    text: textMessage,
                    messageType: 'text',
                    tempId: tempId
                });
            }

            const res = await api.post(`/message/send/${selectedUser?._id}`, {
                message: textMessage,
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

                dispatch(addMessage(populatedNewMsg));
                dispatch(updateLastMessage({ userId: selectedUser._id, message: populatedNewMsg }));
                dispatch(reorderUsers(selectedUser._id));

                // If this message initialized the conversation, update selectedUser with the ID
                if (!selectedUser.conversationId && res.data.newMessage.conversationId) {
                    const updatedUser = { ...selectedUser, conversationId: res.data.newMessage.conversationId };
                    dispatch(setSelectedUser(updatedUser)); // Update in redux
                    if (socket) {
                        socket.emit("join_room", res.data.newMessage.conversationId);
                    }
                }

                setTextMessage("");
                setReplyTo(null);
            }
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error(error.response.data.message || "Message not sent");
            }
            console.error(error);
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

    const deleteChatHandler = async (targetUserId) => {
        const userToDelete = targetUserId || selectedUser?._id;
        const username = targetUserId ? chatUsers.find(u => u._id === targetUserId)?.username : selectedUser?.username;

        if (!userToDelete) return;

        const result = await Swal.fire({
            title: 'Delete Chat?',
            text: `Are you sure you want to delete the entire chat with ${username}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Yes, delete it!',
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
            const res = await api.delete(`/message/delete-chat/${userToDelete}`);
            if (res.data.success) {
                toast.success("Chat deleted successfully");
                dispatch(clearChat(userToDelete));
                if (selectedUser?._id === userToDelete) {
                    dispatch(setSelectedUser(null));
                }
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to delete chat");
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
            socket.emit("typing", { receiverId: selectedUser._id });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit("stop_typing", { receiverId: selectedUser._id });
            }, 2000);
        }
    };

    useEffect(() => {
        if (!socket || !selectedUser) return;

        const handleIncomingMessage = (newMessage) => {
            setIsTyping(false);

            // Accept messages that belong to the current conversation
            const messageInvolvesSender = String(newMessage.senderId) === String(selectedUser._id);
            const messageInvolvesReceiver = String(newMessage.receiverId) === String(selectedUser._id);

            if (messageInvolvesSender || messageInvolvesReceiver) {
                dispatch(addMessage(newMessage)); // addMessage deduplicates by _id automatically
                if (messageInvolvesSender) {
                    // Other user sent this — clear unread count
                    dispatch(clearUnreadCount(String(newMessage.senderId)));
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

        const handleUserTyping = ({ senderId }) => {
            if (String(senderId) === String(selectedUser._id)) setIsTyping(true);
        };

        const handleUserStoppedTyping = ({ senderId }) => {
            if (String(senderId) === String(selectedUser._id)) setIsTyping(false);
        };

        socket.on('receive_message', handleIncomingMessage);
        socket.on('message_reaction_added', handleReactionAdded);
        socket.on('message_deleted', handleDeletedMessage);
        socket.on('story_deleted_from_chat', handleStoryDeleted);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stopped_typing', handleUserStoppedTyping);

        return () => {
            socket.off('receive_message', handleIncomingMessage);
            socket.off('message_reaction_added', handleReactionAdded);
            socket.off('message_deleted', handleDeletedMessage);
            socket.off('story_deleted_from_chat', handleStoryDeleted);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stopped_typing', handleUserStoppedTyping);
        };
    }, [dispatch, socket, selectedUser, user?._id]);

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
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => searchInputRef.current?.focus()}>
                        <MessageCircle size={18} className="text-[#262626]" />
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
                            placeholder='Search people...'
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
                </div>                <div className='flex-1 overflow-y-auto custom-scrollbar pb-10 px-2'>
                    <div className='px-2 mb-4 text-[12px] font-black text-[#8e8e8e] tracking-widest uppercase opacity-60'>
                        {searchQuery ? (isSearching ? 'Searching...' : 'Search Results') : 'Messages'}
                    </div>
                    <div className='flex flex-col gap-1'>
                        {/* Map filtered chat users */}
                        {chatUsers?.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).map((suggestedUser) => {
                            if (!suggestedUser || String(suggestedUser._id) === String(user?._id)) return null;
                            const isOnline = onlineUsers.includes(String(suggestedUser?._id));
                            const isSelected = selectedUser?._id === suggestedUser?._id;
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
                                                <AvatarFallback className={cn("text-black font-black text-[15px] uppercase", getAvatarColor(suggestedUser?.username))}>
                                                    {suggestedUser?.username?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {isOnline && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-white rounded-full transition-all"></div>}
                                        </div>

                                        <div className='flex flex-col flex-1 overflow-hidden ml-1'>
                                            <div className="flex justify-between items-center w-full">
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <span className={`text-[15px] truncate font-black ${isSelected ? 'text-[#111]' : 'text-[#262626]'}`}>{suggestedUser?.username}</span>
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
                                                        const isMe = String(lastMsg.senderId) === String(user?._id);
                                                        const prefix = isMe ? "You: " : `${suggestedUser.username}: `;
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
                                    className={`relative z-10 ${headerStories.length > 0 ? 'cursor-pointer' : ''}`}
                                    onClick={() => headerStories.length > 0 && setIsHeaderStoryOpen(true)}
                                >
                                    <Avatar className={`w-13 h-13 border-2 ${headerStories.length > 0 ? 'border-pink-500' : 'border-indigo-50'} shadow-sm transition-transform active:scale-95`}>
                                        <AvatarImage src={selectedUser?.profilePicture} className="object-cover" />
                                        <AvatarFallback className={cn("text-black font-black uppercase text-[15px]", getAvatarColor(selectedUser?.username))}>{selectedUser?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {onlineUsers.includes(selectedUser?._id) && (
                                        <div className="absolute bottom-0 right-0.5 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full"></div>
                                    )}
                                </div>
                                <div
                                    className='flex flex-col cursor-pointer hover:opacity-70 transition-opacity z-10'
                                    onClick={() => navigate(`/profile/${selectedUser?._id}`)}
                                >
                                    <span className='font-black text-[18px] text-[#111] leading-none mb-1.5'>{selectedUser?.username}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${onlineUsers.includes(selectedUser?._id) ? 'text-green-500' : 'text-gray-400'}`}>
                                            {onlineUsers.includes(selectedUser?._id) ? 'Active now' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => searchInputRef.current?.focus()} className="rounded-full w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><MessageCircle size={20} /></Button>
                                <Button variant="ghost" size="icon" onClick={deleteChatHandler} className="rounded-full w-10 h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={20} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => dispatch(setSelectedUser(null))} className="rounded-full w-10 h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><X size={20} /></Button>
                            </div>
                        </div>

                        <ScrollToBottom className='flex-1 p-0 flex flex-col bg-[#fafafa] overflow-hidden' scrollViewClassName="custom-scrollbar px-10 py-8" followButtonClassName='hidden'>
                            <div className="flex flex-col gap-1 min-h-full pb-6">
                                {Object.keys(groupedMessages || {}).map(date => {
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
                                                    isSender={String(msg.senderId) === String(user?._id)}
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
                                })}
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && textMessage.trim()) {
                                                e.preventDefault();
                                                sendMessageHandler(e);
                                            }
                                        }}
                                        placeholder="Message..."
                                        className='flex-1 bg-transparent py-2.5 outline-none text-[15px] font-medium placeholder:text-gray-400 text-gray-800'
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
                                            <button type="submit" className='ml-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-black text-[13px] tracking-wide shadow-md shadow-indigo-200 active:scale-95 transition-all'>
                                                SEND
                                            </button>
                                        ) : (
                                            <div className="p-2 text-gray-300">
                                                <Send size={22} strokeWidth={1.5} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
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
                            deleteChatHandler(contextMenu.targetUser._id);
                            setContextMenu(prev => ({ ...prev, visible: false }));
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-white text-red-500">
                            <Trash2 size={16} />
                        </div>
                        <span className="text-[14px] font-bold">Delete Chat History</span>
                    </button>
                </div>
            )}

            <PostModal open={openPostModal} setOpen={setOpenPostModal} post={selectedPostForModal} onOpenComment={() => { setOpenPostModal(false); setOpenCommentDialog(true); }} />
            <CommentDialog open={openCommentDialog} setOpen={setOpenCommentDialog} />
        </div>
    );
};

export default ChatPage;
