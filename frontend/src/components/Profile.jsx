import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import useGetUserProfile from '@/hooks/useGetUserProfile'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { AtSign, Heart, MessageCircle, UserPlus, MoreHorizontal, Grid, PlaySquare, Contact, Link, ChevronDown, Trash2, Bookmark, Plus } from 'lucide-react'
import api from '@/api';
import StoryViewer from './StoryViewer'
import EditProfile from './EditProfile'
import UserListModal from './UserListModal'
import { setAuthUser, setUserProfile, setFollowRelationship } from '@/redux/authSlice'
import { toast } from 'sonner'
import StoryAvatar from './StoryAvatar'
import CloseFriendsModal from './CloseFriendsModal'
import { Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader } from './ui/dialog'
import ReelCommentsModal from './ReelCommentsModal'
import CommentDialog from './CommentDialog'
import { setSelectedPost } from '@/redux/postSlice'

const Profile = () => {
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id;
  useGetUserProfile(userId);
  const [activeTab, setActiveTab] = useState('posts');

  const { userProfile, user, isFollowing: storeIsFollowing, isFollower: storeIsFollower, requestPending: storeRequestPending } = useSelector(store => store.auth);

  const isLoggedInUserProfile = user?._id === userProfile?._id;
  const isFollowing = user?.following?.includes(userProfile?._id) || storeIsFollowing;
  const isFollower = userProfile?.following?.some(f => (f._id || f) === user?._id) || user?.followers?.some(f => (f._id || f) === userProfile?._id) || storeIsFollower;
  const requestPending = userProfile?.followRequests?.some(f => (f._id || f) === user?._id) || storeRequestPending;
  const isPrivateAndNotFollowing = userProfile?.isPrivate && !isFollowing && !isLoggedInUserProfile;

  // Metagram button logic cases:
  let buttonState = 'Follow';
  if (isFollowing) {
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

  const [selectedReelForComments, setSelectedReelForComments] = useState(null);
  const [selectedItemForLikes, setSelectedItemForLikes] = useState(null);
  const [openCommentDialog, setOpenCommentDialog] = useState(false);

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

        if (res.data.status === 'unfollowed') {
          updatedFollowing = updatedFollowing.filter(id => (id._id || id) !== userProfile._id);
          updatedFollowers = updatedFollowers.filter(f => (f._id || f) !== user._id);
        } else if (res.data.status === 'followed') {
          updatedFollowing.push(userProfile._id);
          updatedFollowers.push(user);
        } else if (res.data.status === 'canceled') {
          updatedRequests = updatedRequests.filter(id => (id._id || id) !== user._id);
        } else if (res.data.status === 'requested') {
          updatedRequests.push(user._id);
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
    } else {
      followAndUnfollowHandler();
    }
  };

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

  React.useEffect(() => {
    fetchUserStories();
  }, [userId]);

  const hasStory = userStories.length > 0;

  const deleteReelHandler = async (reelId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this reel?")) {
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

  const displayedPost =
    activeTab === "posts" ? userProfile?.posts
      : activeTab === "saved" ? userProfile?.bookmarks
        : activeTab === "saved_reels" ? userProfile?.savedReels
          : activeTab === "reels" ? userProfile?.reels
            : userProfile?.posts;

  return (
    <div className='min-h-screen bg-[rgb(248,252,252)] py-10 px-4'>
      <div className='max-w-5xl mx-auto flex flex-col gap-6'>

        {/* Section 1 & 2: Header & Highlights Combined Card */}
        <div className='bg-white rounded-[13px] border border-[#efefef] p-6 shadow-sm flex flex-col gap-10'>
          <div className='flex items-start gap-12 md:gap-20'>
            {/* Avatar Section */}
            <section className='flex items-center justify-center shrink-0'>
                <div
                  className="relative group cursor-pointer"
                  onClick={() => ((isLoggedInUserProfile || isFollowing) && userStories.length > 0) && setIsStoryViewerOpen(true)}
                >
                  <StoryAvatar
                    user={userProfile}
                    currentUser={user}
                    stories={(isLoggedInUserProfile || isFollowing) ? userStories : []}
                    size={window.innerWidth < 768 ? 100 : 168}
                    isYourStory={isLoggedInUserProfile}
                    strokeWidth={4}
                  />
                </div>
            </section>

            {/* Profile Info Section */}
            <section className='flex flex-col w-full'>
              {/* Header Row: Username + Actions */}
              <div className='flex flex-wrap items-center gap-4 mb-5 pt-2'>
                <h1 className='text-[28px] font-bold text-[#262626]'>{userProfile?.username}</h1>
                <div className='flex gap-2 items-center ml-2'>
                  {isLoggedInUserProfile ? (
                    <Button
                      onClick={() => setEditProfileOpen(true)}
                      className='bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626] h-9 px-6 text-[14px] font-bold shadow-none rounded-[13px] transition-all border-0'
                    >
                      Edit profile
                    </Button>
                  ) : (
                    <>
                      <Button onClick={handleButtonClick} className={`h-9 px-6 text-[14px] font-bold shadow-none rounded-[13px] transition-all ${buttonState === 'Following' || buttonState === 'Requested' ? 'bg-[#efefef] hover:bg-[#dbdbdb] text-[#262626]' : 'bg-[#0095F6] hover:bg-[#1877F2] text-white'}`}>
                        {buttonState}
                      </Button>

                      <Button className='bg-white hover:bg-gray-50 text-[#262626] h-9 px-6 text-[14px] font-bold shadow-none rounded-[13px] transition-all border border-[#dbdbdb]'>
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
              <div className='flex items-center gap-8 mb-6'>
                <div className='flex items-center gap-1.5'><span className='font-bold text-[16px] text-[#262626]'>{userProfile?.posts?.length || 0}</span><span className='text-[#8e8e8e] text-[15px]'>Posts</span></div>
                <div className='flex items-center gap-1.5'><span className='font-bold text-[16px] text-[#262626]'>{userProfile?.reels?.length || 0}</span><span className='text-[#8e8e8e] text-[15px]'>Reels</span></div>
                <div onClick={() => setShowFollowers(true)} className='flex items-center gap-1.5 cursor-pointer'><span className='font-bold text-[16px] text-[#262626]'>{userProfile?.followers?.length || 0}</span><span className='text-[#8e8e8e] text-[15px]'>Followers</span></div>
                <div onClick={() => setShowFollowing(true)} className='flex items-center gap-1.5 cursor-pointer'><span className='font-bold text-[16px] text-[#262626]'>{userProfile?.following?.length || 0}</span><span className='text-[#8e8e8e] text-[15px]'>Following</span></div>
              </div>

              {/* Bio Section */}
              <div className='flex flex-col gap-1.5 text-[15px] text-[#262626]'>
                <p className='text-[#262626] leading-relaxed max-w-[500px] font-medium'>
                  {userProfile?.bio || 'No bio yet.'}
                </p>

                {userProfile?.link && (
                  <div className='flex items-center gap-1.5 text-[#0095F6] font-semibold cursor-pointer hover:underline mt-1'>
                    <Link size={14} strokeWidth={2.5} />
                    <span className="text-[14px]">{userProfile?.link}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Highlights Sub-section within the same card */}
          <div className='border-t border-[#efefef] pt-8'>
            <div className='flex items-center space-x-12 px-2 overflow-x-auto no-scrollbar'>
              {['Blog', 'Podcast', 'Tips', 'Updates', 'Features', 'Events'].map((item, idx) => (
                <div key={idx} className='flex flex-col items-center gap-2 shrink-0 cursor-pointer group'>
                  <div className='w-[77px] h-[77px] rounded-full p-[3px] bg-white border border-[#dbdbdb] group-hover:bg-gray-50 transition-colors'>
                    <div className={`w-full h-full rounded-full flex items-center justify-center text-3xl bg-[#fafafa] border border-[#efefef] shadow-inner`}>
                      {['💻', '🎙️', '💡', '📱', '🚀', '📅'][idx]}
                    </div>
                  </div>
                  <span className='text-[12px] font-semibold text-[#262626]'>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Posts Section */}
        <div className='bg-white rounded-[13px] border border-[#efefef] p-6 shadow-sm mb-10'>
          {/* Tabs */}
          <div className='flex items-center justify-center gap-12 mb-8 border-b border-[#efefef]'>
            <div
              className={`pb-3 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'posts' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
              onClick={() => handleTabChange('posts')}
            >
              <Grid size={14} strokeWidth={activeTab === 'posts' ? 2.5 : 2} />
              <span className='text-[12px] font-bold tracking-[1px] uppercase'>Posts</span>
            </div>

            <div
              className={`pb-3 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'reels' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
              onClick={() => setActiveTab('reels')}
            >
              <PlaySquare size={14} strokeWidth={activeTab === 'reels' ? 2.5 : 2} />
              <span className='text-[12px] font-bold tracking-[1px] uppercase'>Reels</span>
            </div>

            {isLoggedInUserProfile && (
              <>
                <div
                  className={`pb-3 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'saved' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                  onClick={() => setActiveTab('saved')}
                >
                  <Grid size={14} strokeWidth={activeTab === 'saved' ? 2.5 : 2} />
                  <span className='text-[12px] font-bold tracking-[1px] uppercase'>Saved Posts</span>
                </div>
                <div
                  className={`pb-3 cursor-pointer flex items-center gap-2 transition-all border-b-2 ${activeTab === 'saved_reels' ? 'border-[#262626] text-[#262626]' : 'border-transparent text-[#8e8e8e] hover:text-[#262626]'}`}
                  onClick={() => setActiveTab('saved_reels')}
                >
                  <Bookmark size={14} strokeWidth={activeTab === 'saved_reels' ? 2.5 : 2} />
                  <span className='text-[12px] font-bold tracking-[1px] uppercase'>Saved Reels</span>
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
            <div className={`grid gap-6 ${(activeTab === 'reels' || activeTab === 'saved_reels') ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
              {
                displayedPost?.map((item) => {
                  return (
                    <div
                      key={item?._id}
                      className='flex flex-col bg-white rounded-[13px] overflow-hidden border border-[#efefef] shadow-sm hover:shadow-md transition-all duration-300'
                    >
                      <div className={`relative cursor-pointer overflow-hidden ${item.videoUrl ? 'aspect-[9/16]' : 'aspect-square'}`}>
                        {item.videoUrl ? (
                          <div onClick={() => navigate('/reels', { state: { initialReel: item } })} className="w-full h-full relative group cursor-pointer">
                            {isLoggedInUserProfile && (
                              <button
                                onClick={(e) => deleteReelHandler(item._id, e)}
                                className="absolute top-2 left-2 bg-black/40 hover:bg-red-500 backdrop-blur-md text-white p-2 rounded-full shadow-lg transition-all z-20 active:scale-90"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <video src={item.videoUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <PlaySquare size={30} className="text-white fill-white/20" />
                            </div>
                            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md p-2 rounded-full shadow-lg">
                              <PlaySquare size={14} className="text-[#E2FF4E]" />
                            </div>
                            <div className="absolute bottom-3 left-3 bg-[#E2FF4E]/90 text-black px-2 py-0.5 rounded-[4px] text-[10px] font-black flex items-center gap-1 shadow-lg">
                              <PlaySquare size={10} strokeWidth={3} />
                              {item.viewsCount || 0}
                            </div>
                          </div>
                        ) : (
                          <img
                            src={item.image}
                            alt="postimage"
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        )}
                      </div>
                      {/* Interaction Stats */}
                      <div className='p-3 flex items-center justify-between bg-white border-t border-gray-100 group-hover:bg-gray-50 transition-colors'>
                        <div className="flex gap-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedItemForLikes(item); }}
                            className='flex items-center gap-1.5 group/btn'
                          >
                            <div className="p-1.5 rounded-full bg-gray-50 group-hover/btn:bg-red-50 transition-colors">
                              <Heart size={16} className='text-gray-400 group-hover/btn:text-red-500 group-hover/btn:fill-red-500 transition-all active:scale-75' />
                            </div>
                            <span className="text-[12px] font-black text-gray-700">{item?.likes?.length || 0}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.videoUrl) setSelectedReelForComments(item);
                              else {
                                dispatch(setSelectedPost(item));
                                setOpenCommentDialog(true);
                              }
                            }}
                            className='flex items-center gap-1.5 group/btn'
                          >
                            <div className="p-1.5 rounded-full bg-gray-50 group-hover/btn:bg-indigo-50 transition-colors">
                              <MessageCircle size={16} className='text-gray-400 group-hover/btn:text-indigo-500 group-hover/btn:fill-indigo-500 transition-all active:scale-75' />
                            </div>
                            <span className="text-[12px] font-black text-gray-700">{item?.comments?.length || 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
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

      {/* Following Dropdown Menu (Step 1) */}
      <Dialog open={isFollowingMenuOpen} onOpenChange={setIsFollowingMenuOpen}>
        <DialogContent className="max-w-[400px] p-0 overflow-hidden border-0 bg-white sm:rounded-xl shadow-2xl">
          <div className="flex flex-col items-center">
            <Button
              variant="ghost"
              onClick={() => {
                setIsFollowingMenuOpen(false);
                setIsCloseFriendsModalOpen(true);
              }}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Add to Close Friends
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsFollowingMenuOpen(false);
                toast.info("Mute feature coming soon");
              }}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Mute
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsFollowingMenuOpen(false);
                toast.info("Restrict feature coming soon");
              }}
              className="w-full py-6 text-[14px] font-medium text-[#262626] hover:bg-[#fafafa] border-b border-[#efefef] rounded-none h-auto transition-colors"
            >
              Restrict
            </Button>
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
          <div className="flex flex-col items-center pt-8 pb-6 px-6 border-b border-[#efefef]">
            <Avatar className="w-[90px] h-[90px] mb-6">
              <AvatarImage src={userProfile?.profilePicture} className="object-cover" />
              <AvatarFallback className="text-xl">{userProfile?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
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
    </div>
  )
}

export default Profile
