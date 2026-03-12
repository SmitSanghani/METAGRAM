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
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
import { setSocket } from "./redux/socketSlice";
import { setOnlineUsers, incrementUnreadCount, setBulkUnreadCounts, updateLastMessage, addMessage, updateMessageStatus, reorderUsers, updateChatUserConversation, clearUnreadCount } from "./redux/chatSlice";
import { addNotification, setNotifications } from "./redux/notificationSlice";
import { updateReelLikes, addReelComment, deleteReelComment, editReelComment, updateReelViews, updateReelCommentLikes } from "./redux/reelSlice";
import { setPosts, updatePostCommentLikes, deletePostComment, addPostComment } from "./redux/postSlice";
import { setAuthUser, updateUserProfileReelStats, removeUserProfileReelComment, editUserProfileReelComment, updateUserProfileReelCommentLikes } from "./redux/authSlice";
import { useLocation } from "react-router-dom";
import axios from "axios";

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
    path: '/admin/login',
    element: <AdminLogin />
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

import useTheme from "./hooks/useTheme";

function App() {
  useTheme(); // Initialize theme sync
  const { user } = useSelector(store => store.auth);
  const { socket } = useSelector(store => store.socketio);
  const { selectedUser } = useSelector(store => store.chat || {});
  const selectedUserRef = useRef(null);
  const audioRef = useRef(null); // Changed: Initialize as null
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize audio only once on mount
    if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
    }
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

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
    // Global axios interceptor for 401 errors
    const interceptor = axios.interceptors.response.use(
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
            axios.get('http://localhost:8000/api/v1/message/unread-counts', { withCredentials: true }),
            axios.get('http://localhost:8000/api/v1/notification', { withCredentials: true })
          ]);
          
          if (msgRes.data.success) dispatch(setBulkUnreadCounts(msgRes.data.unreadCounts));
          if (notiRes.data.success) dispatch(setNotifications(notiRes.data.notifications));
        } catch (err) {
          console.error("Initial fetch error:", err);
        }
      };
      fetchInitialData();

      const socketio = io('http://localhost:8000', {
        query: { userId: user._id },
        withCredentials: true
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

      // 1. Room-specific message delivery (Fallback/Optimization for multi-tab or active rooms)
      socketio.on('receive_message', (newMessage) => {
        const currentUserId = String(user._id);
        const senderId = String(newMessage.senderId);
        const receiverId = String(newMessage.receiverId);
        const isFromMe = senderId === currentUserId;
        const targetUserId = isFromMe ? receiverId : senderId;

        console.log(`[Socket] Received "receive_message" (Room) - Content: ${newMessage.message} - Sender: ${senderId}`);

        // Update list previews & sync conversationId for the sidebar
        dispatch(updateLastMessage({ userId: targetUserId, message: newMessage }));
        dispatch(reorderUsers(targetUserId));
        if (newMessage.conversationId) {
          dispatch(updateChatUserConversation({ userId: targetUserId, conversationId: newMessage.conversationId }));
        }

        const openChatUser = selectedUserRef.current;
        const isViewingThisChat = openChatUser && String(openChatUser._id) === targetUserId;
        
        if (isViewingThisChat && !isFromMe) {
          console.log(`[Socket] Appending to active chat (Room delivery)`);
          dispatch(addMessage(newMessage));
          dispatch(clearUnreadCount(senderId));
          axios.get(`http://localhost:8000/api/v1/message/seen/${senderId}`, { withCredentials: true }).catch(() => {});
        }
      });

      // 2. Global direct notification delivery (Universal reliability)
      socketio.on('new_message_notification', (newMessage) => {
        const currentUserId = String(user._id);
        const senderId = String(newMessage.senderId);
        if (senderId === currentUserId) return; // Prevent echoing back to sender

        console.log(`[Socket] Received "new_message_notification" (Direct) - Content: ${newMessage.message} - From: ${senderId}`);

        const openChatUser = selectedUserRef.current;
        const isViewingThisChat = openChatUser && String(openChatUser._id) === senderId;

        if (isViewingThisChat) {
          console.log(`[Socket] Appending to active chat (Direct delivery)`);
          dispatch(addMessage(newMessage));
          dispatch(clearUnreadCount(senderId));
          axios.get(`http://localhost:8000/api/v1/message/seen/${senderId}`, { withCredentials: true }).catch(() => {});
        } else {
          // Play sound and show toast only if NOT looking at this chat
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          toast.custom((t) => (
            <div 
              onClick={() => { window.location.href = '/chat'; toast.dismiss(t); }}
              className="bg-white border border-indigo-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-all max-w-sm w-full"
            >
              <Avatar className="w-12 h-12 border-2 border-indigo-100 shrink-0">
                <AvatarImage src={newMessage.senderProfilePicture} className="object-cover" />
                <AvatarFallback className="bg-indigo-600 text-white font-black">{newMessage.senderUsername?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-black text-indigo-600 mb-0.5 uppercase tracking-tighter">New Message</span>
                <span className="text-[15px] font-black text-gray-900 leading-tight truncate">{newMessage.senderUsername || 'Someone'}</span>
                <p className="text-[13px] text-gray-500 truncate mt-0.5">
                  {newMessage.messageType === 'text' ? newMessage.message : `Sent a ${newMessage.messageType}`}
                </p>
              </div>
            </div>
          ), { id: `msg-${newMessage._id}`, duration: 4000, position: 'top-right' });

          if (document.visibilityState !== 'visible' && Notification.permission === "granted") {
            new Notification(`New Message from ${newMessage.senderUsername || 'User'}`, {
              body: newMessage.message || `Sent a ${newMessage.messageType}`,
              icon: "/logo.png"
            });
          }
          dispatch(incrementUnreadCount(senderId));
        }

        // Always keep the sidebar preview accurate
        dispatch(updateLastMessage({ userId: senderId, message: newMessage }));
        dispatch(reorderUsers(senderId));
      });

      socketio.on('message_seen_update', ({ receiverId }) => {
        dispatch(updateMessageStatus({ targetUserId: receiverId, status: { seen: true } }));
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

      socketio.on('newPostComment', ({ postId, comment }) => {
        dispatch(addPostComment({ postId, comment }));
      });

      return () => {
        socketio.disconnect();
        dispatch(setSocket(null));
        axios.interceptors.response.eject(interceptor);
      };
    } else {
      if (socket) {
        socket.disconnect();
        dispatch(setSocket(null));
      }
      axios.interceptors.response.eject(interceptor);
    }
  }, [user, dispatch]);

  return (
    <>
      <RouterProvider router={browserRouter} />
    </>
  )
}

export default App


