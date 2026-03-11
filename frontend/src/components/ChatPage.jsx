import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { MessageCircle, Send, X, Image as ImageIcon, Smile, Reply, Trash2 } from 'lucide-react';
import axios from 'axios';
import { setMessages, addMessage, updateMessageStatus, updateReactions, markUnsent, markStoryUnsent, incrementUnreadCount, clearUnreadCount, updateLastMessage, removeTempMessage, setSelectedUser, setChatUsers, reorderUsers } from '../redux/chatSlice';
import ScrollToBottom from 'react-scroll-to-bottom';
import MessageBubble from './MessageBubble';
import useGetSuggestedUsers from '@/hooks/useGetSuggestedUsers';
import StoryViewer from './StoryViewer';

const NOTIFICATION_SOUND_URL = "/notification.mp3"; // Reference local file

const ChatPage = () => {
    useGetSuggestedUsers();
    const [textMessage, setTextMessage] = useState("");
    const { user, suggestedUsers } = useSelector(store => store.auth);
    const { onlineUsers = [], messages = [], unreadCounts = {}, lastMessages = {}, selectedUser, chatUsers = [] } = useSelector(store => store.chat || {});
    const { socket } = useSelector(store => store.socketio);
    const [replyTo, setReplyTo] = useState(null);
    const [storyToView, setStoryToView] = useState(null);
    const dispatch = useDispatch();
    const notificationAudio = useRef(new Audio(NOTIFICATION_SOUND_URL));

    const [isTyping, setIsTyping] = useState(false);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    let typingTimeout = useRef(null);

    // Initial sync of chat users if needed
    useEffect(() => {
        if (suggestedUsers && suggestedUsers.length > 0 && chatUsers.length === 0) {
            dispatch(setChatUsers([...suggestedUsers]));
        }
    }, [suggestedUsers, chatUsers.length, dispatch]);

    // Clear unread count when chat selected
    const handleSelectUser = (targetUser) => {
        dispatch(setSelectedUser(targetUser));
        dispatch(setMessages([])); // Clear messages for new user immediately
        dispatch(clearUnreadCount(targetUser._id));
    };

    // Cleanup when leaving ChatPage
    useEffect(() => {
        return () => {
            dispatch(setSelectedUser(null));
        };
    }, [dispatch]);

    // Fetch messages when a user is selected
    useEffect(() => {
        if (!selectedUser) return;

        const fetchMessages = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/message/all/${selectedUser?._id}`, { withCredentials: true });
                if (res.data.success) {
                    dispatch(setMessages(res.data.messages || []));
                    markAsSeen();
                }
            } catch (error) {
                console.error(error);
            }
        }
        fetchMessages();
    }, [selectedUser, dispatch]);

    // Mark as seen when messages change or user is selected
    useEffect(() => {
        if (selectedUser && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId === selectedUser._id && !lastMsg.seen) {
                markAsSeen();
                dispatch(clearUnreadCount(selectedUser._id));
            }
        }
    }, [messages, selectedUser]);

    const markAsSeen = async () => {
        if (!selectedUser) return;
        try {
            await axios.get(`http://localhost:8000/api/v1/message/seen/${selectedUser._id}`, { withCredentials: true });
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
            const res = await axios.post(`http://localhost:8000/api/v1/message/send/${selectedUser?._id}`, {
                message: textMessage,
                replyTo: replyTo?._id
            }, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });

            if (res.data.success) {
                const populatedNewMsg = {
                    ...res.data.newMessage,
                    replyTo: replyTo ? { ...replyTo } : null
                };
                dispatch(addMessage(populatedNewMsg));
                dispatch(updateLastMessage({ userId: selectedUser._id, message: populatedNewMsg }));
                dispatch(reorderUsers(selectedUser._id));
                setTextMessage("");
                setReplyTo(null);
            }
        } catch (error) {
            console.error(error);
        }
    }

    const unsendMessageHandler = async (messageId) => {
        try {
            const res = await axios.delete(`http://localhost:8000/api/v1/message/delete/${messageId}`, { withCredentials: true });
            if (res.data.success) {
                dispatch(markUnsent({ messageId }));
            }
        } catch (error) {
            console.error(error);
        }
    }

    const reactMessageHandler = async (messageId, emoji) => {
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/message/react/${messageId}`, { emoji }, { withCredentials: true });
            if (res.data.success) {
                dispatch(updateReactions({ messageId, reactions: res.data.reactions }));
            }
        } catch (error) {
            console.error(error);
        }
    }

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
        if (socket) {
            const handleIncomingMessage = (newMessage) => {
                // Background tasks (lastMessage, unread, sound) are handled in App.jsx
                // We just need to stop typing indicator here
                setIsTyping(false);
            };

            const handleReactionUpdate = ({ messageId, reactions }) => {
                dispatch(updateReactions({ messageId, reactions }));
            };

            const handleDeletedMessage = ({ messageId }) => {
                dispatch(markUnsent({ messageId }));
            };

            const handleStoryDeleted = (storyId) => {
                dispatch(markStoryUnsent({ storyId }));
            };

            const handleUserTyping = ({ senderId }) => { 
                if (selectedUser && String(senderId) === String(selectedUser._id)) setIsTyping(true); 
            };

            const handleUserStoppedTyping = ({ senderId }) => { 
                if (selectedUser && String(senderId) === String(selectedUser._id)) setIsTyping(false); 
            };

            socket.on('message_received', handleIncomingMessage);
            socket.on('message_reaction_update', handleReactionUpdate);
            socket.on('message_deleted', handleDeletedMessage);
            socket.on('story_deleted_from_chat', handleStoryDeleted);
            socket.on('user_typing', handleUserTyping);
            socket.on('user_stopped_typing', handleUserStoppedTyping);

            return () => {
                socket.off('message_received', handleIncomingMessage);
                socket.off('message_reaction_update', handleReactionUpdate);
                socket.off('message_deleted', handleDeletedMessage);
                socket.off('story_deleted_from_chat', handleStoryDeleted);
                socket.off('user_typing', handleUserTyping);
                socket.off('user_stopped_typing', handleUserStoppedTyping);
            }
        }
    }, [dispatch, socket, selectedUser, user?._id]);

    // Grouping logic for messages
    const groupedMessages = messages?.reduce((groups, msg) => {
        if (!msg.createdAt) return groups;
        const d = new Date(msg.createdAt);
        if (isNaN(d.getTime())) return groups;
        const dateString = d.toLocaleDateString();
        if (!groups[dateString]) groups[dateString] = [];
        groups[dateString].push(msg);
        return groups;
    }, {});

    const formatDateLabel = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    };

    return (
        <div className='flex h-screen bg-[rgb(218,242,242)] text-[#333333] w-full overflow-hidden font-sans'>
            {/* Sidebar User List */}
            <section className='hidden md:flex flex-col w-[350px] shrink-0 border-r border-[#efefef] bg-white px-2'>
                <div className='py-8 px-4 flex items-center justify-between'>
                    <h1 className='font-black text-[22px] tracking-tight text-[#262626]'>{user?.username}</h1>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                        <MessageCircle size={18} className="text-[#262626]" />
                    </div>
                </div>
                <div className='flex-1 overflow-y-auto custom-scrollbar pb-10 px-2'>
                    <div className='px-2 mb-4 text-[12px] font-black text-[#8e8e8e] tracking-widest uppercase opacity-60'>Messages</div>
                    <div className='flex flex-col gap-1'>
                        {chatUsers?.map((suggestedUser) => {
                            if (!suggestedUser) return null;
                            const isOnline = onlineUsers.includes(String(suggestedUser?._id));
                            const isSelected = selectedUser?._id === suggestedUser?._id;
                            const unreadCount = unreadCounts[String(suggestedUser?._id)] || 0;
                            const lastMsg = isSelected ? messages[messages.length - 1] : lastMessages[String(suggestedUser?._id)];

                            return (
                                <div key={suggestedUser?._id} onClick={() => handleSelectUser(suggestedUser)}
                                    className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer active:scale-[0.98] group ${isSelected ? 'bg-[#F3F4F6]' : 'hover:bg-gray-50'}`}>
                                    {isSelected && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#4F46E5] rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>}
                                    <div className="relative shrink-0">
                                        <Avatar className={`w-14 h-14 border-2 ${isSelected ? 'border-white' : 'border-transparent'} shadow-sm transition-all group-hover:scale-105`}>
                                            <AvatarImage src={suggestedUser?.profilePicture} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-black text-[15px] uppercase">
                                                {suggestedUser?.username?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        {isOnline && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-white rounded-full transition-all"></div>}
                                    </div>
                                    <div className='flex flex-col flex-1 overflow-hidden ml-1'>
                                        <div className="flex justify-between items-center w-full">
                                            <span className={`text-[15px] truncate font-black ${isSelected ? 'text-[#111]' : 'text-[#262626]'}`}>{suggestedUser?.username}</span>
                                            {lastMsg && (
                                                <span className="text-[11px] text-[#8e8e8e] font-bold opacity-60 font-sans">
                                                    {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center w-full mt-0.5">
                                            <span className={`text-[13px] truncate flex-1 font-medium ${unreadCount > 0 ? 'text-black font-black' : (isSelected ? 'text-indigo-600' : 'text-[#8e8e8e]')}`}>
                                                {lastMsg ? (
                                                    (lastMsg.senderId === user?._id ? "You: " : "") + 
                                                    (lastMsg.messageType === 'reel' ? "Sent a reel" : 
                                                     lastMsg.messageType === 'image' ? "Sent a photo" :
                                                     lastMsg.messageType === 'video' ? "Sent a video" :
                                                     lastMsg.message)
                                                ) : (unreadCount > 0 ? `Sent ${unreadCount} new message${unreadCount > 1 ? 's' : ''}` : (isOnline ? 'Active now' : 'Offline'))}
                                            </span>
                                            {unreadCount > 0 && !isSelected && (
                                                <div className="min-w-[20px] h-[20px] px-1.5 bg-red-500 flex items-center justify-center rounded-full ml-2 shadow-sm animate-pulse">
                                                    <span className="text-[10px] font-black text-white">{unreadCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* Main Chat Area */}
            <section className='flex-1 flex flex-col h-full bg-white relative overflow-hidden'>
                {selectedUser ? (
                    <>
                        {/* Header */}
                        <div className='flex items-center justify-between px-8 py-5 border-b border-[#efefef] bg-white/95 backdrop-blur-md z-20 sticky top-0'>
                            <div className='flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity'>
                                <div className="relative">
                                    <Avatar className="w-13 h-13 border-2 border-indigo-50 shadow-sm">
                                        <AvatarImage src={selectedUser?.profilePicture} className="object-cover" />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-black uppercase text-[15px]">{selectedUser?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {onlineUsers.includes(selectedUser?._id) && (
                                        <div className="absolute bottom-0 right-0.5 w-4 h-4 bg-green-500 border-[3px] border-white rounded-full"></div>
                                    )}
                                </div>
                                <div className='flex flex-col'>
                                    <span className='font-black text-[18px] text-[#111] leading-none mb-1.5'>{selectedUser?.username}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[11px] font-black uppercase tracking-wider ${onlineUsers.includes(selectedUser?._id) ? 'text-green-500' : 'text-gray-400'}`}>
                                            {onlineUsers.includes(selectedUser?._id) ? 'Active now' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"><MessageCircle size={20} /></Button>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)} className="rounded-full w-10 h-10 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"><X size={20} /></Button>
                            </div>
                        </div>

                        <ScrollToBottom className='flex-1 p-0 flex flex-col bg-[#fafafa] overflow-hidden' scrollViewClassName="custom-scrollbar px-10 py-8" followButtonClassName='hidden'>
                            <div className="flex flex-col gap-1 min-h-full pb-6">
                                {Object.keys(groupedMessages || {}).map(date => (
                                    <React.Fragment key={date}>
                                        <div className="flex justify-center my-8">
                                            <span className="text-[10px] font-black text-[#8e8e8e] uppercase tracking-[0.2em] bg-white border border-gray-100 px-5 py-2 rounded-full shadow-sm">
                                                {formatDateLabel(date)}
                                            </span>
                                        </div>
                                        {groupedMessages[date].map((msg) => (
                                            <MessageBubble
                                                key={msg._id}
                                                msg={msg}
                                                isSender={msg.senderId === user?._id}
                                                currentUser={user}
                                                otherUser={selectedUser}
                                                onReply={setReplyTo}
                                                onDelete={unsendMessageHandler}
                                                onReact={reactMessageHandler}
                                                onScrollTo={scrollToMessage}
                                                onStoryClick={(story) => setStoryToView(story)}
                                                isHighlighted={highlightedMessageId === msg._id}
                                            />
                                        ))}
                                    </React.Fragment>
                                ))}
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

                        {/* Story Viewer in Chat */}
                        {storyToView && (
                            <StoryViewer
                                stories={[storyToView]}
                                onClose={() => setStoryToView(null)}
                                onStoryViewed={() => {}} 
                            />
                        )}

                        {/* Input Section */}
                        <div className='px-8 py-6 bg-white border-t border-[#f3f4f6] flex flex-col gap-3 relative z-30'>
                            {replyTo && (
                                <div className="flex items-center justify-between bg-indigo-50 border-l-[4px] border-indigo-600 px-5 py-4 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col overflow-hidden max-w-[85%]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Reply size={13} className="text-indigo-600" strokeWidth={3} />
                                            <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tight">
                                                Replying to {replyTo.senderId === user?._id ? "yourself" : selectedUser?.username}
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
                                <div className="flex-1 flex items-center bg-[#f9fafb] border border-[#f3f4f6] rounded-[28px] py-1 pl-6 pr-2 focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/50 transition-all duration-300">
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
                                        className='flex-1 bg-transparent py-4 outline-none text-[15px] font-medium placeholder:text-gray-400 text-gray-800'
                                    />
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="file"
                                            className="hidden"
                                            id="media-upload-final"
                                            accept="image/*,video/*"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const tempId = Date.now().toString();
                                                    try {
                                                        // Optimistic local update
                                                        const previewUrl = URL.createObjectURL(file);
                                                        const tempMsg = {
                                                            _id: tempId,
                                                            tempId: tempId,
                                                            senderId: user._id,
                                                            receiverId: selectedUser._id,
                                                            message: "",
                                                            messageType: file.type.startsWith('image/') ? 'image' : 'video',
                                                            mediaUrl: previewUrl,
                                                            isLoading: true,
                                                            createdAt: new Date().toISOString()
                                                        };
                                                        dispatch(addMessage(tempMsg));

                                                        const formData = new FormData();
                                                        formData.append("message", "");
                                                        formData.append("messageType", file.type.startsWith('image/') ? 'image' : 'video');
                                                        formData.append("media", file);
                                                        if (replyTo?._id) {
                                                            formData.append("replyTo", replyTo._id);
                                                        }

                                                        const res = await axios.post(`http://localhost:8000/api/v1/message/send/${selectedUser?._id}`, formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' },
                                                            withCredentials: true
                                                        });
                                                        if (res.data.success) {
                                                            dispatch(removeTempMessage(tempId));
                                                            dispatch(addMessage(res.data.newMessage));
                                                            setReplyTo(null);
                                                        }
                                                    } catch (err) {
                                                        console.log(err);
                                                        dispatch(removeTempMessage(tempId));
                                                    }
                                                }
                                            }}
                                        />
                                        <button type="button" onClick={() => document.getElementById('media-upload-final').click()} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-indigo-500 group">
                                            <ImageIcon className="group-hover:scale-110 transition-transform" size={24} strokeWidth={1.5} />
                                        </button>

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
                        <Button className='bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black h-12 px-10 rounded-full transition-all active:scale-95 shadow-lg shadow-indigo-200'>NEW MESSAGE</Button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default ChatPage;
