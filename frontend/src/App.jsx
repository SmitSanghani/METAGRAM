import Home from "./components/Home"
import Login from "./components/Login"
import MainLayout from "./components/MainLayout"
import Profile from "./components/Profile"
import Signup from "./components/Signup"
import ChatPage from "./components/ChatPage"
import Reels from "./components/Reels"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { io } from "socket.io-client";
import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSocket } from "./redux/socketSlice";
import { setOnlineUsers, incrementUnreadCount, setBulkUnreadCounts, updateLastMessage, addMessage, updateMessageStatus, reorderUsers } from "./redux/chatSlice";
import { addNotification, setNotifications } from "./redux/notificationSlice";
import { updateReelLikes, addReelComment, deleteReelComment, editReelComment, updateReelViews, updateReelCommentLikes } from "./redux/reelSlice";
import { setPosts, updatePostCommentLikes, deletePostComment, addPostComment } from "./redux/postSlice";
import { setAuthUser, updateUserProfileReelStats, removeUserProfileReelComment, editUserProfileReelComment, updateUserProfileReelCommentLikes } from "./redux/authSlice";
import { useLocation } from "react-router-dom";
import axios from "axios";

const browserRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: '/',
        index: true,
        element: <Home />
      },
      {
        path: '/profile/:id',
        element: <Profile />
      },
      {
        path: '/chat',
        element: <ChatPage />
      },
      {
        path: '/reels',
        element: <Reels />
      },
      {
        path: '/reels/:id',
        element: <Reels />
      },
    ]
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },
])

function App() {
  const { user } = useSelector(store => store.auth);
  const { socket } = useSelector(store => store.socketio);
  const { selectedUser } = useSelector(store => store.chat || {});
  const selectedUserRef = useRef(null);
  const audioRef = useRef(new Audio('/notification.mp3'));
  const dispatch = useDispatch();

  useEffect(() => {
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
        transports: ['websocket'],
      });

      dispatch(setSocket(socketio));
      console.log("Socket connected:", socketio.id);

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

      socketio.on('message_received', (newMessage) => {
        const isFromMe = String(newMessage.senderId) === String(user._id);
        const targetUserId = isFromMe ? String(newMessage.receiverId) : String(newMessage.senderId);

        // 1. sidebar preview update
        dispatch(updateLastMessage({ userId: targetUserId, message: newMessage }));

        // 2. globally reorder user list
        dispatch(reorderUsers(targetUserId));

        // 3. Add to messages if current chat is open
        const isCurrentChat = selectedUserRef.current && String(selectedUserRef.current._id) === targetUserId;
        if (isCurrentChat) {
          dispatch(addMessage(newMessage));
        }

        if (!isFromMe) {
          // 4. Play sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          
          // 5. Browser Notification
          if (document.visibilityState !== 'visible' || window.location.pathname !== '/chat' || !isCurrentChat) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`New Message from ${newMessage.senderUsername || 'User'}`, {
                body: newMessage.message || "Sent a media file",
                icon: "/logo.png"
              });
            }
          }

          // 6. Unread badge management
          const isViewingNow = window.location.pathname === '/chat' && isCurrentChat;
          if (!isViewingNow) {
            dispatch(incrementUnreadCount(newMessage.senderId));
          } else {
            axios.get(`http://localhost:8000/api/v1/message/seen/${newMessage.senderId}`, { withCredentials: true }).catch(() => {});
          }
        }
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


