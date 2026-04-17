import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import FeedCard from './FeedCard';
import useGetUserProfile from '@/hooks/useGetUserProfile'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AtSign, Heart, MessageCircle, UserPlus, MoreHorizontal, Grid, PlaySquare, Contact, Link, ChevronDown, Trash2, Bookmark, Plus, Settings, Search, CheckCircle2, Mic, Lightbulb, LogOut } from 'lucide-react'
import api from '@/api';
import { cn, getAvatarColor } from '@/lib/utils';
import StoryViewer from './StoryViewer'
import EditProfile from './EditProfile'
import UserListModal from './UserListModal'
import { setAuthUser, setUserProfile, setFollowRelationship } from '@/redux/authSlice'
import { toast } from 'sonner'
import StoryAvatar from './StoryAvatar'
import CloseFriendsModal from './CloseFriendsModal'
import { Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import ReelCommentsModal from './ReelCommentsModal'
import CommentDialog from './CommentDialog'
import PostModal from './PostModal'
import { setSelectedPost, setPosts } from '@/redux/postSlice'
import { setSelectedUser, addChatUser } from '@/redux/chatSlice'
import Swal from 'sweetalert2';

const Profile = () => {
  const { selectedPost } = useSelector(store => store.post);
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id;
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');

  const { userProfile, user, isProfileLoading, isFollowing: storeIsFollowing, isFollower: storeIsFollower, requestPending: storeRequestPending } = useSelector(store => store.auth);

  // We should also verify the profile belongs to the URL ID to avoid stale data flicker
  const isCorrectProfile = userProfile?._id === userId;

  const isLoggedInUserProfile = String(user?._id) === String(userProfile?._id);
  const isFollowing = user?.following?.some(u => String(u._id || u) === String(userProfile?._id)) || storeIsFollowing;
  const isFollower = userProfile?.following?.some(u => String(u._id || u) === String(user?._id)) || user?.followers?.some(u => String(u._id || u) === String(userProfile?._id)) || storeIsFollower;
  const requestPending = userProfile?.followRequests?.some(id => String(id) === String(user?._id)) || storeRequestPending;
  const isPrivateAndNotFollowing = userProfile?.isPrivate && !isFollowing && !isLoggedInUserProfile;

  const isBlockedByMe = user?.blockedUsers?.some(id => String(id._id || id) === String(userProfile?._id));

  let buttonState = 'Follow';
  if (isBlockedByMe) {
    buttonState = 'Unblock';
  } else if (isFollowing) {
    buttonState = 'Following';
  } else if (requestPending) {
    buttonState = 'Requested';
  } else if (isFollower) {
    buttonState = 'Follow Back';
  } else {
    buttonState = 'Follow';
  }

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [isCloseFriendsModalOpen, setIsCloseFriendsModalOpen] = useState(false);
  const [isFollowingMenuOpen, setIsFollowingMenuOpen] = useState(false);
  const [isUnfollowConfirmOpen, setIsUnfollowConfirmOpen] = useState(false);

  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [openPostModal, setOpenPostModal] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [selectedReelForComments, setSelectedReelForComments] = useState(null);
  const [selectedItemForLikes, setSelectedItemForLikes] = useState(null);

  const dispatch = useDispatch();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  }

  const [userStories, setUserStories] = useState([]);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);

  const followAndUnfollowHandler = async () => {
    try {
      const res = await api.post(`/user/followorunfollow/${userProfile._id}`, {});
      if (res.data.success) {

        let updatedFollowing = [...(user?.following || [])];
        let updatedFollowers = [...(userProfile?.followers || [])];
        let updatedRequests = [...(userProfile?.followRequests || [])];

        const targetIdStr = String(userProfile?._id);
        const myIdStr = String(user?._id);

        if (res.data.status === 'unfollowed') {
          updatedFollowing = updatedFollowing.filter(u => String(u._id || u) !== targetIdStr);
          updatedFollowers = updatedFollowers.filter(u => String(u._id || u) !== myIdStr);
        } else if (res.data.status === 'followed') {
          if (!updatedFollowing.some(u => String(u._id || u) === targetIdStr)) updatedFollowing.push(userProfile);
          if (!updatedFollowers.some(u => String(u._id || u) === myIdStr)) updatedFollowers.push(user);
        } else if (res.data.status === 'canceled') {
          updatedRequests = updatedRequests.filter(u => String(u._id || u) !== myIdStr);
        } else if (res.data.status === 'requested') {
          if (!updatedRequests.some(u => String(u._id || u) === myIdStr)) updatedRequests.push(myIdStr);
        }

        // Update relationship flags in Redux
        dispatch(setFollowRelationship({
          isFollowing: res.data.isFollowing,
          isFollower: res.data.isFollower,
          requestPending: res.data.requestPending
        }));

        // Update auth user data (current user's following list)
        dispatch(setAuthUser({ ...user, following: updatedFollowing }));

        // Update the profile user's data locally
        if (userProfile) {
          dispatch(setUserProfile({
            ...userProfile,
            followers: updatedFollowers,
            followRequests: updatedRequests
          }));
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to act');
    }
  };

  const handleButtonClick = () => {
    if (buttonState === 'Following') {
      setIsFollowingMenuOpen(true);
    } else if (buttonState === 'Unblock') {
      unblockUserHandler();
    } else {
      followAndUnfollowHandler();
    }
  };

  const handleMessageClick = () => {
    if (!userProfile) return;
    
    // Add user to chat list and set as selected
    dispatch(addChatUser(userProfile));
    dispatch(setSelectedUser(userProfile));
    
    // Redirect to chat
    navigate('/chat');
  };

  const logoutHandler = async () => {
    try {
      const res = await api.get('/user/logout');
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setSelectedPost(null));
        dispatch(setPosts([]));

        navigate("/login");
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Logout failed");
    }
  }

  const confirmUnfollow = () => {
    followAndUnfollowHandler();
    setIsUnfollowConfirmOpen(false);
  };

  const fetchUserStories = async () => {
    try {
      if (!userId) return;
      const res = await api.get(`/story/user/${userId}`);
      if (res.data.success) {
        setUserStories(res.data.stories);
      }
    } catch (error) {
      console.error("Error fetching user stories:", error);
    }
  };

  const blockUserHandler = async () => {
    try {
      const res = await api.post(`/user/block/${userProfile._id}`);
      if (res.data.success) {
        toast.success(res.data.message);

        // Update local auth user state (add to blockedUsers)
        const updatedAuthUser = { ...user, blockedUsers: [...(user.blockedUsers || []), userProfile._id] };
        dispatch(setAuthUser(updatedAuthUser));

        // Since we blocked them, we should technically redirect or show they are blocked
        // But common behavior is to stay and show an "Unblock" button
        dispatch(setUserProfile({ ...userProfile, blockedBy: [...(userProfile.blockedBy || []), user._id] }));

        setIsBlockConfirmOpen(false);
        setIsOptionsMenuOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  const unblockUserHandler = async () => {
    try {
      const res = await api.post(`/user/unblock/${userProfile._id}`);
      if (res.data.success) {
        toast.success(res.data.message);

        // Update local auth user state (remove from blockedUsers)
        const updatedAuthUser = {
          ...user,
          blockedUsers: (user.blockedUsers || []).filter(id => (id._id || id).toString() !== userProfile._id.toString())
        };
        dispatch(setAuthUser(updatedAuthUser));

        if (userProfile) {
          dispatch(setUserProfile({
            ...userProfile,
            blockedBy: (userProfile.blockedBy || []).filter(id => (id._id || id).toString() !== user._id.toString())
          }));
        }

        setIsOptionsMenuOpen(false);
      }
    } catch (error) {
      console.error("Unblock Error:", error);
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied to clipboard");
    setIsOptionsMenuOpen(false);
  };

  React.useEffect(() => {
    fetchUserStories();
  }, [userId]);

  const hasStory = userStories.length > 0;

  const deleteReelHandler = async (reelId, e) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'Delete Reel?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it!',
      background: '#ffffff',
      borderRadius: '24px',
      customClass: {
        container: 'z-[9999]',
        popup: 'rounded-[24px]',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/reels/delete/${reelId}`);
        if (res.data.success) {
          toast.success("Reel deleted successfully");
          dispatch(setUserProfile({
            ...userProfile,
            reels: userProfile.reels.filter(r => r._id !== reelId)
          }));
        }
      } catch (error) {
        toast.error("Failed to delete reel");
      }
    }
  };

  const deletePostHandler = async (postId, e) => {
    e.stopPropagation();
    
    const result = await Swal.fire({
      title: 'Delete Post?',
      text: "This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it!',
      background: '#ffffff',
      borderRadius: '24px',
      customClass: {
        container: 'z-[9999]',
        popup: 'rounded-[24px]',
        confirmButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs',
        cancelButton: 'rounded-xl px-6 py-2.5 font-bold uppercase tracking-wider text-xs'
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await api.delete(`/post/delete/${postId}`);
        if (res.data.success) {
          toast.success("Post deleted successfully");
          dispatch(setUserProfile({
            ...userProfile,
            posts: userProfile.posts.filter(p => p._id !== postId)
          }));
        }
      } catch (error) {
        toast.error("Failed to delete post");
      }
    }
  };

  const displayedPost =
    activeTab === "posts" ? userProfile?.posts
      : activeTab === "saved" ? userProfile?.bookmarks
        : activeTab === "saved_reels" ? userProfile?.savedReels
          : activeTab === "reels" ? userProfile?.reels
            : userProfile?.posts;

  return (
    <div className='min-h-screen bg-[rgb(248,252,252)] py-4 sm:py-10 px-2 sm:px-4'>
      {isProfileLoading ? (
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-40 bg-white rounded-[13px] border border-[#efefef] shadow-sm">
           <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading profile...</p>
        </div>
      ) : (!userProfile || !isCorrectProfile) ? (
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-20 bg-white rounded-[13px] border border-[#efefef] shadow-sm">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <AtSign size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-500 mb-8">The link you followed may be broken, or the user may have blocked you.</p>
          <Button
            onClick={() => navigate('/')}
            className="bg-[#0095F6] hover:bg-[#1877F2] text-white rounded-[13px] h-10 px-8 font-bold"
          >
            Go to Home
          </Button>
        </div>
      ) : (
        <>
            {/* Mobile Specialized Header */}
            <div className='flex sm:hidden items-center justify-between px-4 py-3 bg-white border-b border-[#efefef] fixed top-0 left-0 right-0 z-[50]'>
                <h1 className='text-[20px] font-bold text-[#262626] font-display tracking-tight'>The Gallery</h1>
                <div className='flex items-center gap-4'>
                    <div className='relative ring-2 ring-transparent hover:ring-indigo-100 ring-offset-1 rounded-full p-[1px] transition-all cursor-pointer'>
                      <Avatar className='w-8 h-8'>
                          <AvatarImage src={user?.profilePicture} className="object-cover" />
                          <AvatarFallback className='bg-indigo-50 text-indigo-500 font-bold text-[10px]'>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white flex items-center justify-center' />
                    </div>
                    <Search size={22} className='text-[#262626] cursor-pointer' />
                </div>
            </div>

            <div className='max-w-5xl mx-auto flex flex-col gap-6 sm:mt-0 mt-14'>

            {/* Section 1 & 2: Header & Highlights Combined Card */}
            <div className='bg-white rounded-none sm:rounded-[13px] border-b sm:border border-[#efefef] p-0 sm:p-6 shadow-none sm:shadow-sm flex flex-col gap-0 sm:gap-10'>
              <div className='flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-12 md:gap-20 pt-8 sm:pt-0 pb-6 sm:pb-0'>
                {/* Avatar Section */}
                <section className='flex items-center justify-center shrink-0 relative'>
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => ((isLoggedInUserProfile || isFollowing) && userStories.length > 0) && setIsStoryViewerOpen(true)}
                  >
                    <StoryAvatar
                      user={userProfile}
                      currentUser={user}
                      stories={(isLoggedInUserProfile || isFollowing) ? userStories : []}
                      size={window.innerWidth < 768 ? 120 : 168}
                      isYourStory={isLoggedInUserProfile}
                      strokeWidth={4}
                    />
                    {/* Verified Badge for Mobile (Bottom Right of Avatar) */}
                    <div className='absolute bottom-4 right-6 sm:hidden bg-indigo-600 rounded-full p-1.5 border-[3px] border-white shadow-lg'>
                      <CheckCircle2 size={14} className='text-white fill-current' strokeWidth={3} />
                    </div>
                  </div>
                </section>

                {/* Profile Info Section */}
                <section className='flex flex-col w-full items-center sm:items-start px-6 sm:px-0'>
                  {/* Header Row: Username + Actions */}
                  <div className='flex flex-col sm:flex-row items-center gap-4 mb-4 sm:mb-5'>
                    <div className="flex items-center gap-3">
                      <h1 className='text-[32px] sm:text-[28px] font-bold text-[#262626] tracking-tight'>{userProfile?.username}</h1>
                      {!isLoggedInUserProfile && (
                        <div
                          onClick={() => setIsOptionsMenuOpen(true)}
                          className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors order-first sm:order-last"
                        >
                          <MoreHorizontal size={24} className="text-[#262626]" />
                        </div>
                      )}
                    </div>
                    <div className='flex gap-2 items-center w-full sm:w-auto justify-center'>
                      {isLoggedInUserProfile ? (
                        <div className="flex flex-col items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-3 w-full justify-center">
                            <Button
                              onClick={() => setEditProfileOpen(true)}
                              className='bg-[#F0EDFF] hover:bg-[#E5E0FF] text-[#5849FF] h-10 px-8 sm:px-10 text-[14px] font-bold shadow-none rounded-full transition-all border-0 w-max'
                            >
                              Edit profile
                            </Button>
                            <div 
                               onClick={() => navigate('/settings')}
                               className='sm:hidden w-10 h-10 rounded-full bg-[#f8f6ff] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-[#5849FF] border border-[#eee]'
                            >
                               <Settings size={20} strokeWidth={2.5} />
                            </div>
                            <div 
                               onClick={logoutHandler}
                               className='sm:hidden w-10 h-10 rounded-full bg-red-50 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-red-500 border border-red-100'
                            >
                               <LogOut size={20} strokeWidth={2.5} />
                            </div>
                          </div>
                          
                          <Button
                            onClick={logoutHandler}
                            className='hidden sm:flex bg-red-50 hover:bg-red-100 text-red-500 h-9 px-6 text-[13px] font-bold shadow-none rounded-full transition-all border-0 w-max'
                          >
                            <LogOut size={16} className="mr-2" />
                            Logout
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button onClick={handleButtonClick} className={`h-9 px-6 text-[14px] font-bold shadow-none rounded-[13px] transition-all ${buttonState === 'Following' || buttonState === 'Requested' ? 'bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626]' : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'}`}>
                            {buttonState}
                          </Button>

                          <Button 
                            onClick={handleMessageClick}
                            className='bg-white hover:bg-gray-50 text-[#262626] h-9 px-6 text-[14px] font-bold shadow-none rounded-[13px] transition-all border border-[#dbdbdb]'
                          >
                            Message
                          </Button>

                          <Button className='bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] h-9 w-9 p-0 flex items-center justify-center rounded-[13px] border-0'>
                            <UserPlus size={18} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className='flex items-center justify-center sm:justify-start gap-8 sm:gap-8 mb-6 w-full'>
                    <div className='flex flex-col items-center sm:flex-row gap-0 sm:gap-1.5'>
                      <span className='font-bold text-[20px] sm:text-[16px] text-[#262626]'>{userProfile?.posts?.length || 0}</span>
                      <span className='text-[#8e8e8e] text-[11px] sm:text-[15px] uppercase font-bold tracking-wider sm:normal-case sm:font-normal'>Posts</span>
                    </div>
                    <div className='flex flex-col items-center sm:flex-row gap-0 sm:gap-1.5'>
                      <span className='font-bold text-[20px] sm:text-[16px] text-[#262626]'>{userProfile?.reels?.length || 0}</span>
                      <span className='text-[#8e8e8e] text-[11px] sm:text-[15px] uppercase font-bold tracking-wider sm:normal-case sm:font-normal'>Reels</span>
                    </div>
                    <div onClick={() => setShowFollowers(true)} className='flex flex-col items-center sm:flex-row gap-0 sm:gap-1.5 cursor-pointer'>
                      <span className='font-bold text-[20px] sm:text-[16px] text-[#262626]'>{userProfile?.followers?.length || 0}</span>
                      <span className='text-[#8e8e8e] text-[11px] sm:text-[15px] uppercase font-bold tracking-wider sm:normal-case sm:font-normal'>Followers</span>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div className='flex flex-col items-center sm:items-start gap-1.5 text-[15px] text-[#262626] mb-8 sm:mb-0'>
                    <p className='text-[#777] leading-relaxed max-w-[500px] font-medium text-center sm:text-left'>
                      {userProfile?.bio || 'No bio yet.'}
                    </p>

                    {userProfile?.link && (
                      <div className='flex items-center gap-1.5 text-[#5849FF] font-semibold cursor-pointer hover:underline mt-1'>
                        <Link size={14} strokeWidth={2.5} />
                        <span className="text-[14px]">{userProfile?.link}</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Highlights Sub-section within the same card */}
              <div className='border-t border-[#efefef] pt-8 pb-10 sm:pb-0'>
                <div className='flex items-center space-x-6 sm:space-x-12 px-6 overflow-x-auto no-scrollbar'>
                  {[
                    { label: 'Blog', icon: <Grid size={24} />, color: '#F8F6FF' },
                    { label: 'Podcast', icon: <Mic size={24} />, color: '#F0EDFF' },
                    { label: 'Tips', icon: <Lightbulb size={24} />, color: '#F8F6FF' },
                    { label: 'New', icon: <Plus size={24} />, color: '#FFFFFF', dashed: true }
                  ].map((item, idx) => (
                    <div key={idx} className='flex flex-col items-center gap-3 shrink-0 cursor-pointer group'>
                      <div className={cn(
                        'w-[70px] h-[70px] sm:w-[77px] sm:h-[77px] rounded-full p-[2px] bg-white border border-[#eee] group-hover:bg-gray-50 transition-colors shadow-sm',
                        item.dashed && 'border-dashed border-2'
                      )}>
                        <div 
                          className='w-full h-full rounded-full flex items-center justify-center bg-[#F8F6FF] border border-[#f0f0f0] shadow-inner text-[#5849FF]'
                          style={{ backgroundColor: item.color }}
                        >
                          {item.icon}
                        </div>
                      </div>
                      <span className='text-[12px] font-bold text-[#262626] tracking-tight'>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Posts Section */}
            <div className='bg-white sm:rounded-[13px] border-t sm:border border-[#efefef] p-0 sm:p-6 sm:shadow-sm mb-10'>
              {/* Tabs */}
              <div className='flex items-center sm:justify-center justify-start gap-8 sm:gap-12 sm:mb-8 border-b border-[#efefef] overflow-x-auto no-scrollbar px-4 sm:px-0'>
                <div
                  className={`pb-3 shrink-0 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'posts' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                  onClick={() => handleTabChange('posts')}
                >
                  <Grid size={16} strokeWidth={activeTab === 'posts' ? 2.5 : 2} />
                  <span className='text-[13px] font-bold tracking-[0.5px] uppercase'>Posts</span>
                </div>

                <div
                  className={`pb-3 shrink-0 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'reels' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                  onClick={() => setActiveTab('reels')}
                >
                  <PlaySquare size={16} strokeWidth={activeTab === 'reels' ? 2.5 : 2} />
                  <span className='text-[13px] font-bold tracking-[0.5px] uppercase'>Reels</span>
                </div>

                {isLoggedInUserProfile && (
                  <>
                    <div
                      className={`pb-3 shrink-0 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'saved' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                      onClick={() => setActiveTab('saved')}
                    >
                      <Grid size={16} strokeWidth={activeTab === 'saved' ? 2.5 : 2} />
                      <span className='text-[13px] font-bold tracking-[0.5px] uppercase truncate max-w-[100px]'>Saved Posts</span>
                    </div>
                    <div
                      className={`pb-3 shrink-0 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'saved_reels' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                      onClick={() => setActiveTab('saved_reels')}
                    >
                      <Bookmark size={16} strokeWidth={activeTab === 'saved_reels' ? 2.5 : 2} />
                      <span className='text-[13px] font-bold tracking-[0.5px] uppercase truncate max-w-[100px]'>Saved Reels</span>
                    </div>
                  </>
                )}
              </div>

              {/* Grid Section */}
              {isPrivateAndNotFollowing ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[13px] border border-[#efefef]">
                  <div className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <h2 className="text-xl font-bold mb-2">This account is private</h2>
                  <p className="text-gray-500 font-medium">Follow this account to see their photos and videos.</p>
                </div>
              ) : (
                <div className={`grid gap-[2px] sm:gap-6 profile-posts-grid ${(activeTab === 'reels' || activeTab === 'saved_reels') ? 'grid-cols-3 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-3 md:grid-cols-3'}`}>
                  {
                    displayedPost?.map((item) => (
                      <FeedCard 
                        key={item?._id} 
                        item={item} 
                        type={(activeTab === 'reels' || activeTab === 'saved_reels' || item.videoUrl) ? 'reel' : 'post'} 
                        onDelete={isLoggedInUserProfile ? (item.videoUrl ? deleteReelHandler : deletePostHandler) : undefined}
                      />
                    ))
                  }
                  {displayedPost?.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-50 italic">
                      No {activeTab} yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {isStoryViewerOpen && hasStory && (
            <StoryViewer
              stories={userStories}
              onClose={() => setIsStoryViewerOpen(false)}
              onStoryDeleted={fetchUserStories}
            />
          )}

          {editProfileOpen && (
            <EditProfile
              isOpen={editProfileOpen}
              onClose={() => setEditProfileOpen(false)}
            />
          )}

          {showFollowers && (
            <UserListModal
              isOpen={showFollowers}
              onClose={() => setShowFollowers(false)}
              title="Followers"
              users={userProfile?.followers}
            />
          )}

          {showFollowing && (
            <UserListModal
              isOpen={showFollowing}
              onClose={() => setShowFollowing(false)}
              title="Following"
              users={userProfile?.following}
            />
          )}

          {isCloseFriendsModalOpen && (
            <CloseFriendsModal
              isOpen={isCloseFriendsModalOpen}
              onClose={() => setIsCloseFriendsModalOpen(false)}
              user={user}
              onUpdate={() => { }}
            />
          )}

          {selectedReelForComments && (
            <ReelCommentsModal
              open={!!selectedReelForComments}
              setOpen={(isOpen) => !isOpen && setSelectedReelForComments(null)}
              reelId={selectedReelForComments?._id}
              comments={selectedReelForComments?.comments}
              reelData={selectedReelForComments}
            />
          )}

          {selectedItemForLikes && (
            <UserListModal
              isOpen={!!selectedItemForLikes}
              onClose={() => setSelectedItemForLikes(null)}
              title="Likes"
              users={selectedItemForLikes?.likes}
            />
          )}

          <CommentDialog open={openCommentDialog} setOpen={setOpenCommentDialog} />

          <PostModal open={openPostModal} setOpen={setOpenPostModal} post={selectedPost} onOpenComment={() => { setOpenPostModal(false); setOpenCommentDialog(true); }} />

          {/* Following Dropdown Menu (Step 1) */}
          <Dialog open={isFollowingMenuOpen} onOpenChange={setIsFollowingMenuOpen}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
              <DialogTitle className="sr-only">Following Options</DialogTitle>
              <DialogDescription className="sr-only">Manage your relationship with {userProfile?.username}</DialogDescription>
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsFollowingMenuOpen(false);
                    setIsUnfollowConfirmOpen(true);
                  }}
                  className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
                >
                  Unfollow
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsFollowingMenuOpen(false)}
                  className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] rounded-none h-auto transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Unfollow Confirmation Dialog (Step 2) */}
          <Dialog open={isUnfollowConfirmOpen} onOpenChange={setIsUnfollowConfirmOpen}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
              <DialogTitle className="sr-only">Unfollow Confirmation</DialogTitle>
              <DialogDescription className="sr-only">Confirm if you want to unfollow @{userProfile?.username}</DialogDescription>
              <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[#efefef]">
                <Avatar className="w-[90px] h-[90px] mb-6">
                  <AvatarImage src={userProfile?.profilePicture} className="object-cover" />
                  <AvatarFallback className={cn("text-xl uppercase font-black", getAvatarColor(userProfile?.username))}>
                    {userProfile?.username?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-[14px] text-center text-[#262626] leading-relaxed">
                  Unfollow <span className="font-bold">@{userProfile?.username}</span>?
                </p>
              </div>
              <div className="flex flex-col items-center">
                <Button
                  variant="ghost"
                  onClick={confirmUnfollow}
                  className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
                >
                  Unfollow
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsUnfollowConfirmOpen(false)}
                  className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] rounded-none h-auto transition-colors"
                >
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Profile Options Menu */}
      <Dialog open={isOptionsMenuOpen} onOpenChange={setIsOptionsMenuOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
          <DialogTitle className="sr-only">Profile Options</DialogTitle>
          <DialogDescription className="sr-only">Additional actions for this profile</DialogDescription>
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              onClick={() => {
                toast.info("Report feature coming soon");
                setIsOptionsMenuOpen(false);
              }}
              className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Report
            </Button>

            {isBlockedByMe ? (
              <Button
                variant="ghost"
                onClick={unblockUserHandler}
                className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
              >
                Unblock
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsBlockConfirmOpen(true)}
                className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
              >
                Block
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={copyProfileLink}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Copy Profile Link
            </Button>

            <Button
              variant="ghost"
              onClick={() => setIsOptionsMenuOpen(false)}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] rounded-none h-auto transition-colors"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <Dialog open={isBlockConfirmOpen} onOpenChange={setIsBlockConfirmOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
          <DialogTitle className="sr-only">Block Confirmation</DialogTitle>
          <DialogDescription className="sr-only">Confirm if you want to block {userProfile?.username}</DialogDescription>
          <div className="flex flex-col items-center pt-8 pb-6 px-8 border-b border-[#efefef]">
            <h2 className="text-[18px] font-bold text-[#262626] mb-4">Block {userProfile?.username}?</h2>
            <p className="text-[14px] text-center text-gray-500 leading-relaxed">
              They will not be able to find your profile, see your posts or reels, or send you messages. Metagram won't let them know you blocked them.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              onClick={blockUserHandler}
              className="w-full py-6 text-[14px] font-bold text-[#ED4956] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Block
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsBlockConfirmOpen(false)}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] rounded-none h-auto transition-colors"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Profile
