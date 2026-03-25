import Home from "./components/Home"
import Login from "./components/Login"
import MainLayout from "./components/MainLayout"
import Profile from "./components/Profile"
import Signup from "./components/Signup"
import ForgotPassword from "./components/ForgotPassword"
import VerifyOTP from "./components/VerifyOTP"
import ResetPassword from "./components/ResetPassword"
import ChatPage from "./components/ChatPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AuthenticatedRoute from "./components/AuthenticatedRoute"
import Reels from "./components/Reels"
import Explore from "./components/Explore"
import YourActivity from "./components/YourActivity"
import Settings from "./components/Settings"
import AdminLayout from "./components/admin/AdminLayout"
import AdminDashboard from "./components/admin/AdminDashboard"
import UserManagement from "./components/admin/UserManagement"
import PostManagement from "./components/admin/PostManagement"
import ReelManagement from "./components/admin/ReelManagement"
import CommentManagement from "./components/admin/CommentManagement"
import MessageMonitoring from "./components/admin/MessageMonitoring"
import AdminSettings from "./components/admin/AdminSettings"
import AdminLogin from "./components/admin/AdminLogin"
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute"
import AnimationPage from "./components/AnimationPage"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { X } from "lucide-react";
import { setSocket } from "./redux/socketSlice";
import { setOnlineUsers, incrementUnreadCount, setBulkUnreadCounts, updateLastMessage, addMessage, updateMessageStatus, reorderUsers, updateChatUserConversation, clearUnreadCount, addChatUser, updateReactions } from "./redux/chatSlice";
import { addNotification, setNotifications } from "./redux/notificationSlice";
import { updateReelLikes, addReelComment, deleteReelComment, editReelComment, updateReelViews, updateReelCommentLikes } from "./redux/reelSlice";
import { setPosts, updatePostCommentLikes, deletePostComment, addPostComment, updatePostLikes } from "./redux/postSlice";
import { setAuthUser, setSuggestedUsers, setUserProfile, updateUserProfileReelStats, updateUserProfilePostStats } from './redux/authSlice';
import { useLocation } from "react-router-dom";
import api from '@/api';

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <ProtectedRoute><MainLayout /></ProtectedRoute>,
    children: [
      {
        path: '/',
        index: true,
        element: <ProtectedRoute><Home /></ProtectedRoute>
      },
      {
        path: '/profile/:id',
        element: <ProtectedRoute><Profile /></ProtectedRoute>
      },
      {
        path: '/chat',
        element: <ProtectedRoute><ChatPage /></ProtectedRoute>
      },
      {
        path: '/reels',
        element: <ProtectedRoute><Reels /></ProtectedRoute>
      },
      {
        path: '/reels/:id',
        element: <ProtectedRoute><Reels /></ProtectedRoute>
      },
      {
        path: '/explore',
        element: <ProtectedRoute><Explore /></ProtectedRoute>
      },
      {
        path: '/settings',
        element: <ProtectedRoute><Settings /></ProtectedRoute>
      },
      {
        path: '/settings/activity',
        element: <ProtectedRoute><YourActivity /></ProtectedRoute>
      },
    ]
  },
  {
    path: '/login',
    element: <AuthenticatedRoute><Login /></AuthenticatedRoute>
  },
  {
    path: '/signup',
    element: <AuthenticatedRoute><Signup /></AuthenticatedRoute>
  },
  {
    path: '/forgot-password',
    element: <AuthenticatedRoute><ForgotPassword /></AuthenticatedRoute>
  },
  {
    path: '/verify-otp',
    element: <AuthenticatedRoute><VerifyOTP /></AuthenticatedRoute>
  },
  {
    path: '/reset-password',
    element: <AuthenticatedRoute><ResetPassword /></AuthenticatedRoute>
  },
  {
    path: '/animation',
    element: <AnimationPage />
  },
  {
    path: "/admin",
    element: <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>,
    children: [
      {
        path: "",
        element: <AdminDashboard />
      },
      {
        path: "users",
        element: <UserManagement />
      },
      {
        path: "posts",
        element: <PostManagement />
      },
      {
        path: "reels",
        element: <ReelManagement />
      },
      {
        path: "comments",
        element: <CommentManagement />
      },
      {
        path: "messages",
        element: <MessageMonitoring />
      },
      {
        path: "settings",
        element: <AdminSettings />
      },
    ]
  },
])

import { setPlatformSettings } from "./redux/settingsSlice";
import useTheme from "./hooks/useTheme";

function App() {
  useTheme(); // Initialize theme sync
  const { user } = useSelector(store => store.auth);
  const { socket } = useSelector(store => store.socketio);
  const { selectedUser, chatUsers = [], messages = [] } = useSelector(store => store.chat || {});
  const selectedUserRef = useRef(null);
  const audioRef = useRef(null); 
  const chatUsersRef = useRef(chatUsers);
  const messagesRef = useRef(messages);
  const dispatch = useDispatch();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    chatUsersRef.current = chatUsers;
  }, [chatUsers]);

  useEffect(() => {
    // Initialize audio only once on mount
    if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
    }
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  // Periodic Fetching of Global Settings (Poll every 10s)
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const res = await api.get('/setting/get');
        if (res.data.success) {
          dispatch(setPlatformSettings(res.data.settings));
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchPlatformSettings(); // Initial fetch

    const intervalId = setInterval(fetchPlatformSettings, 10000); // Poll every 10s
    return () => clearInterval(intervalId);
  }, [dispatch]);

  // Browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Audio unlocking for browsers
  useEffect(() => {
    const unlockAudio = () => {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  useEffect(() => {
    // Global api interceptor for 401 errors
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // If we get a 401, the session is invalid or expired
          dispatch(setAuthUser(null));
          // Optionally clear other state if needed
        }
        return Promise.reject(error);
      }
    );

    if (user) {
      const fetchInitialData = async () => {
        try {
          const [msgRes, notiRes] = await Promise.all([
            api.get('/message/unread-counts'),
            api.get('/notification')
          ]);
          
          if (msgRes.data.success) dispatch(setBulkUnreadCounts(msgRes.data.unreadCounts));
          if (notiRes.data.success) dispatch(setNotifications(notiRes.data.notifications));
        } catch (err) {
          console.error("Initial fetch error:", err);
        }
      };
      fetchInitialData();

      const socketUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8000' 
        : 'https://metagram-3.onrender.com';
        
      const socketio = io(socketUrl, {
        query: { userId: user._id },
        auth: { token: localStorage.getItem('token') }
      });

      dispatch(setSocket(socketio));
      console.log("socket connected", socketio.id);

      socketio.on("connect", () => {
        socketio.emit("register_user", user._id);
      });

      socketio.on('getOnlineUsers', (onlineUsers) => {
        dispatch(setOnlineUsers(onlineUsers));
      });

      socketio.on('notification', (notification) => {
        dispatch(addNotification(notification));
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      });

      socketio.on('postLiked', ({ postId, userId }) => {
        dispatch(updatePostLikes({ postId, userId, type: 'like' }));
        dispatch(updateUserProfilePostStats({ postId, userId, type: 'like' }));
      });

      socketio.on('postDisliked', ({ postId, userId }) => {
        dispatch(updatePostLikes({ postId, userId, type: 'dislike' }));
        dispatch(updateUserProfilePostStats({ postId, userId, type: 'dislike' }));
      });

      socketio.on('newPostComment', (comment) => {
        dispatch(addPostComment({ postId: comment.post, comment }));
      });

      // 1. Room-specific message delivery (Fallback/Optimization for multi-tab or active rooms)
      socketio.on('receive_message', (newMessage) => {
        const currentUserId = String(user?._id);
        const senderId = newMessage.senderId?._id ? String(newMessage.senderId._id) : String(newMessage.senderId);
        const receiverId = newMessage.receiverId ? String(newMessage.receiverId) : null;
        const isFromMe = senderId === currentUserId;
        const isToMe = receiverId === currentUserId;
        const targetId = newMessage.isGroup ? String(newMessage.conversationId) : (isFromMe ? receiverId : senderId);

        console.log(`[Socket] Received "receive_message" (${newMessage.isGroup ? 'Group' : 'Room'}) - Content: ${newMessage.message}`);

        // Isolation Check: For 1v1, only process if I'm involved
        if (!newMessage.isGroup && !isFromMe && !isToMe) {
          console.log("[Socket] Ignoring message for other conversation");
          return;
        }

        // Check if the chat exists in sidebar
        const chatExistsInSidebar = chatUsersRef.current?.some(u => String(u._id) === targetId);
        
        // Auto-add 1v1 ONLY if not from me (others' messages should add them to list)
        if (!chatExistsInSidebar && !isFromMe && !newMessage.isGroup) {
           dispatch(addChatUser({
             _id: targetId,
             username: newMessage.senderUsername,
             profilePicture: newMessage.senderProfilePicture,
             conversationId: newMessage.conversationId
           }));
        }

        // Always update last message preview and reorder the sidebar 
        dispatch(updateLastMessage({ userId: targetId, message: newMessage }));
        dispatch(reorderUsers(targetId));

        if (newMessage.conversationId) {
          dispatch(updateChatUserConversation({ userId: targetId, conversationId: newMessage.conversationId }));
        }

        const openChatUser = selectedUserRef.current;
        const isCurrentlyViewingThisChat = openChatUser && String(openChatUser._id) === targetId;

        // EXTRA CHECK: Verify this message belongs to the OPENED conversation
        const isCorrectConversation = newMessage.isGroup 
          ? (openChatUser?.isGroup && String(newMessage.conversationId) === String(openChatUser.conversationId))
          : (isCurrentlyViewingThisChat && (isFromMe || isToMe));

        if (isCurrentlyViewingThisChat && isCorrectConversation && !isFromMe) {
          dispatch(addMessage(newMessage));
        }
      });


      // 2. Global direct notification delivery (Universal reliability)
      socketio.on('new_message_notification', (newMessage) => {
        const currentUserId = String(user?._id);
        const senderId = newMessage.senderId?._id ? String(newMessage.senderId._id) : String(newMessage.senderId);
        const receiverId = newMessage.receiverId ? String(newMessage.receiverId) : null;
        const isFromMe = senderId === currentUserId;
        const isToMe = receiverId === currentUserId;
        const targetId = newMessage.isGroup ? String(newMessage.conversationId) : (isFromMe ? String(newMessage.receiverId) : senderId);
        
        console.log(`[Socket] Received "notification" (${newMessage.isGroup ? 'Group' : 'Direct'}) - From: ${senderId}`);

        // Isolation Check: Ignore notifications for conversations I'm not part of
        if (!newMessage.isGroup && !isFromMe && !isToMe) {
          return;
        }

        // 1. Ensure the relevant chat exists in sidebar (Group or User)
        const chatExistsInSidebar = chatUsersRef.current?.some(u => String(u._id) === targetId);
        if (!chatExistsInSidebar) {
           // For 1v1: auto-add based on sender details
           if (!newMessage.isGroup) {
              dispatch(addChatUser({
                _id: isFromMe ? newMessage.receiverId : senderId,
                username: isFromMe ? "" : newMessage.senderUsername,
                profilePicture: isFromMe ? "" : newMessage.senderProfilePicture,
                conversationId: newMessage.conversationId
              }));
           } 
           // For Groups: wait for fetch or add with minimal info (better to add placeholder than miss it)
           else {
              dispatch(addChatUser({
                _id: targetId,
                 username: newMessage.groupName || "Group Chat",
                 profilePicture: newMessage.groupProfilePicture,
                 isGroup: true,
                 groupAdmin: newMessage.groupAdmin,
                 conversationId: targetId
              }));
           }
        }

        const openChatUser = selectedUserRef.current;
        const isViewingThisChat = openChatUser && String(openChatUser._id) === targetId;

        if (isViewingThisChat) {
          // If viewing, add to messages and clear unread (Only if not from me)
          if (!isFromMe) {
            dispatch(addMessage(newMessage));
            dispatch(clearUnreadCount(targetId));
            api.get(`/message/seen/${targetId}`).catch(() => {});
          }
        } else {
          // Check if muted (either the sender or the group)
          const isMuted = user?.mutedUsers?.includes(targetId) || user?.mutedUsers?.includes(senderId);

          // Play sound and show toast only if: 
          // 1. NOT looking at this chat
          // 2. NOT from me
          // 3. NOT muted
          if (!isFromMe && !isMuted) {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

            toast.custom((t) => (
              <div 
                onClick={() => { 
                  localStorage.setItem('lastChatUserId', targetId);
                  window.location.href = '/chat'; 
                  toast.dismiss(t); 
                }}
                className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[24px] p-5 flex gap-4 relative max-w-[360px] w-full cursor-pointer hover:bg-gray-50 transition-all pointer-events-auto"
              >
                <div className="relative shrink-0">
                  <Avatar className="w-14 h-14 border border-indigo-50 shadow-sm">
                    <AvatarImage src={newMessage.senderProfilePicture} className="object-cover" />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-bold uppercase">{newMessage.senderUsername?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {newMessage.isGroup && <div className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white">GROUP</div>}
                </div>
                
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12px] font-medium text-gray-400 capitalize">Just now</span>
                    <button onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }} className="text-gray-300 hover:text-gray-500 transition-colors p-1">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <span className="text-[14px] font-semibold text-gray-500 leading-none mb-1">{newMessage.senderUsername}{newMessage.isGroup ? " in Group" : ""}</span>
                  <p className="text-[16px] font-bold text-gray-900 leading-tight truncate mb-3">
                    {newMessage.messageType === 'text' ? newMessage.message : `Sent a ${newMessage.messageType}`}
                  </p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        localStorage.setItem('lastChatUserId', targetId);
                        window.location.href = '/chat'; 
                        toast.dismiss(t); 
                      }} 
                      className="text-[13px] font-bold text-indigo-600"
                    >
                      Reply
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); api.get(`/message/seen/${targetId}`).catch(() => {}); dispatch(clearUnreadCount(targetId)); toast.dismiss(t); }} className="text-[13px] font-bold text-gray-400">Mark as read</button>
                  </div>
                </div>
              </div>
            ), { id: `msg-${newMessage._id}`, duration: 5000, position: 'top-right' });

            if (document.visibilityState !== 'visible' && Notification.permission === "granted") {
              const notifTitle = newMessage.isGroup ? `Message in ${newMessage.senderUsername}'s group` : `Message from ${newMessage.senderUsername}`;
              new Notification(notifTitle, {
                body: newMessage.message || `Sent a ${newMessage.messageType}`,
                icon: "/logo.png"
              });
            }
          }
          
          // Increment unread count (if not from me)
          if (!isFromMe) {
            dispatch(incrementUnreadCount(targetId));
          }
        }

        // Always update last message preview and reorder the sidebar (VERY IMPORTANT for multi-tab sync)
        dispatch(updateLastMessage({ userId: targetId, message: newMessage }));
        dispatch(reorderUsers(targetId));
      });


      socketio.on('message_seen_update', ({ receiverId }) => {
        dispatch(updateMessageStatus({ targetUserId: receiverId, status: { seen: true } }));
      });

      socketio.on('message_reaction_added', ({ messageId, user_id, reaction, reactions, action, isGroup, conversationId, reactorUsername, reactorProfilePicture }) => {
        // user_id is the person who reacted
        dispatch(updateReactions({ messageId, reactions }));
        
        const senderId = String(user_id);
        const emoji = reaction;

        // Find existing user in sidebar to update preview
        const personInSidebar = chatUsersRef.current?.find(u => String(u._id) === senderId);
        
        // Only show notification/preview if the reaction is NOT from the current user AND it wasn't a removal
        if (senderId !== String(user?._id) && action !== 'removed') {
             // Find target message to see what was reacted to
             const targetMsg = messagesRef.current?.find(m => String(m._id) === String(messageId));
             let typeLabel = "message";
             if (targetMsg) {
                 if (targetMsg.messageType === 'reel') typeLabel = "reel";
                 else if (targetMsg.messageType === 'story_reply' || targetMsg.messageType === 'story_reaction') typeLabel = "story";
                 else if (targetMsg.messageType === 'image') typeLabel = "photo";
                 else if (targetMsg.messageType === 'video') typeLabel = "video";
             }

             const previewText = isGroup ? `${reactorUsername}: Reacted ${emoji} to your ${typeLabel}` : `Reacted ${emoji} to your ${typeLabel}`;
             
             const previewMsg = {
                 _id: `react-${messageId}-${Date.now()}`,
                 senderId: senderId,
                 message: previewText,
                 messageType: 'reaction_info',
                 createdAt: new Date().toISOString()
             };
             
             const targetSidebarId = isGroup ? conversationId : senderId;
             dispatch(updateLastMessage({ userId: targetSidebarId, message: previewMsg }));
             dispatch(reorderUsers(targetSidebarId));
             
             // ✅ Always show toast for reaction — even while in that chat
             const isMuted = user?.mutedUsers?.includes(senderId);
             if (audioRef.current && !isMuted) {
               audioRef.current.currentTime = 0;
               audioRef.current.play().catch(() => {});
             }
             toast.custom((t) => (
               <div 
                 onClick={() => { 
                   localStorage.setItem('lastChatUserId', senderId);
                   window.location.href = '/chat'; 
                   toast.dismiss(t); 
                 }}
                 className="bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[24px] p-5 flex gap-4 relative max-w-[360px] w-full cursor-pointer hover:bg-gray-50 transition-all pointer-events-auto"
               >
                 <div className="relative shrink-0">
                   <Avatar className="w-14 h-14 border border-pink-50 shadow-sm">
                     <AvatarImage src={reactorProfilePicture} className="object-cover" />
                     <AvatarFallback className="bg-pink-100 text-pink-600 font-bold uppercase">{reactorUsername?.charAt(0)}</AvatarFallback>
                   </Avatar>
                   <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-pink-50 text-[16px]">
                     {emoji}
                   </div>
                 </div>
                 
                 <div className="flex flex-col flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-0.5">
                     <span className="text-[12px] font-medium text-gray-400 capitalize">Just now</span>
                     <button 
                       onClick={(e) => { e.stopPropagation(); toast.dismiss(t); }}
                       className="text-gray-300 hover:text-gray-500 transition-colors p-1"
                     >
                       <X size={16} />
                     </button>
                   </div>
                   
                   <span className="text-[14px] font-semibold text-gray-500 leading-none mb-1">{reactorUsername}</span>
                   <p className="text-[16px] font-bold text-gray-900 leading-tight truncate mb-3">
                     {isGroup ? `Reacted ${emoji} to your ${typeLabel} in Group` : `Reacted ${emoji} to your ${typeLabel}`}
                   </p>
                   
                   <div className="flex items-center gap-4">
                     <button 
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         localStorage.setItem('lastChatUserId', senderId);
                         window.location.href = '/chat'; 
                         toast.dismiss(t); 
                       }}
                       className="text-[13px] font-bold text-pink-600 hover:text-pink-700 transition-colors"
                     >
                       View Chat
                     </button>
                   </div>
                 </div>
               </div>
             ), { id: `react-${messageId}`, duration: 5000, position: 'top-right' });
        }
      });

      // Global updates for Reels and Posts
      socketio.on('likeReel', ({ reelId, likes }) => {
        dispatch(updateReelLikes({ reelId, likes }));
        dispatch(updateUserProfileReelStats({ reelId, likes }));
      });

      socketio.on('newReelComment', (comment) => {
        dispatch(addReelComment({ reelId: comment.reel, comment }));
        dispatch(updateUserProfileReelStats({ reelId: comment.reel, comment }));
      });

      socketio.on('deleteReelComment', ({ commentId, reelId }) => {
        dispatch(deleteReelComment({ reelId, commentId }));
        dispatch(removeUserProfileReelComment({ reelId, commentId }));
      });

      socketio.on('editReelComment', ({ commentId, reelId, text }) => {
        dispatch(editReelComment({ reelId, commentId, text }));
        dispatch(editUserProfileReelComment({ reelId, commentId, text }));
      });

      socketio.on('updateReelViews', ({ reelId, viewsCount }) => {
        dispatch(updateReelViews({ reelId, viewsCount }));
        dispatch(updateUserProfileReelStats({ reelId, viewsCount }));
      });

      socketio.on('updateReelCommentLikes', ({ reelId, commentId, likes }) => {
        dispatch(updateReelCommentLikes({ reelId, commentId, likes }));
        dispatch(updateUserProfileReelCommentLikes({ reelId, commentId, likes }));
      });

      // Global post updates
      socketio.on('updatePostCommentLikes', ({ postId, commentId, likes }) => {
        dispatch(updatePostCommentLikes({ postId, commentId, likes }));
      });

      socketio.on('deletePostComment', ({ postId, commentId }) => {
        dispatch(deletePostComment({ postId, commentId }));
      });

      socketio.on('group_updated', (updatedGroup) => {
        // Update the item in the sidebar list
        const exists = chatUsersRef.current?.some(u => String(u._id) === String(updatedGroup._id));
        if (exists) {
          dispatch(setChatUsers(chatUsersRef.current.map(u => 
            String(u._id) === String(updatedGroup._id) ? { ...u, ...updatedGroup } : u
          )));
        }

        // If the updated group is currently the selected chat, update it too
        const openUser = selectedUserRef.current;
        if (openUser && String(openUser._id) === String(updatedGroup._id)) {
          dispatch(setSelectedUser({ ...openUser, ...updatedGroup }));
        }
      });

      socketio.on('removed_from_group', ({ conversationId }) => {
        dispatch(clearChat(conversationId));
        const openUser = selectedUserRef.current;
        if (openUser && String(openUser._id) === String(conversationId)) {
          dispatch(setSelectedUser(null));
          toast.error("You are no longer a member of this group");
        }
      });

      socketio.on('postCommentAdded', ({ postId, comment }) => {
        dispatch(addPostComment({ postId, comment }));
        dispatch(updateUserProfilePostStats({ postId, comment }));
      });

      return () => {
        socketio.disconnect();
        dispatch(setSocket(null));
        api.interceptors.response.eject(interceptor);
      };
    } else {
      if (socket) {
        socket.disconnect();
        dispatch(setSocket(null));
      }
      api.interceptors.response.eject(interceptor);
    }
  }, [user, dispatch]);

  return (
    <>
      <RouterProvider router={browserRouter} />
    </>
  )
}

export default App


