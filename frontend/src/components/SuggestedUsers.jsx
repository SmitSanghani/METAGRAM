// import React from 'react'
// import { useSelector } from 'react-redux';
// import { Link } from 'react-router-dom';
// import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

// const SuggestedUsers = () => {

//     const { suggestedUsers } = useSelector(store => store.auth);

//     return (
//         <div className='my-10'>
//             <div className='flex items-center justify-between text-sm'>
//                 <h1 className='font-semibold text-gray-600'>Suggested for you</h1>
//                 <span className='ml-3 font-medium cursor-pointer'>See All</span>            {/* ml-3 */}
//             </div>
//             {
//                 suggestedUsers.map((user) => {
//                     return (
//                         <div key={user._id} className='flex items-center justify-between my-5'>
//                             <div className='flex items-center gap-2'>
//                                 <Link to={`/profile/${user?._id}`}>
//                                     <Avatar className="w-8 h-8">
//                                         <AvatarImage src={user?.profilePicture} alt="post_image" />
//                                         <AvatarFallback>CN</AvatarFallback>
//                                     </Avatar>
//                                 </Link>
//                                 <div>
//                                     <h1 className='font-semibold text-sm'><Link to={`/profile/${user?._id}`}>{user?.username}</Link></h1>
//                                     <span className='text-gray-600 text-sm'>{user?.bio || 'Bio here...'}</span>
//                                 </div>
//                             </div>
//                             <span className='text-[#3BADF8] text-sm font-bold cursor-pointer hover:text-[#3495d6] '>Follow</span>
//                         </div>
//                     )
//                 })
//             }

//         </div>
//     )
// }

// export default SuggestedUsers




import React from 'react'
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser, updateSuggestedUser } from '@/redux/authSlice';

const SuggestedUsers = () => {
    const { suggestedUsers = [], user } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    const handleFollowUnfollow = async (targetUserId) => {
        const isCurrentlyFollowing = user?.following?.includes(targetUserId);
        if (isCurrentlyFollowing) {
            if (!window.confirm("Do you want to unfollow this user?")) return;
        }
        try {
            const res = await axios.post(`http://localhost:8000/api/v1/user/followorunfollow/${targetUserId}`, {}, { withCredentials: true });
            if (res.data.success) {
                let updatedFollowing = [...(user.following || [])];

                if (res.data.status === 'followed') {
                    updatedFollowing.push(targetUserId);
                } else if (res.data.status === 'unfollowed') {
                    updatedFollowing = updatedFollowing.filter(id => id !== targetUserId);
                } else if (res.data.status === 'requested') {
                    const targetUser = suggestedUsers.find(u => u._id === targetUserId);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: [...(targetUser.followRequests || []), user._id] }
                        }));
                    }
                } else if (res.data.status === 'canceled') {
                    const targetUser = suggestedUsers.find(u => u._id === targetUserId);
                    if (targetUser) {
                        dispatch(updateSuggestedUser({
                            targetUserId,
                            updates: { followRequests: (targetUser.followRequests || []).filter(id => id !== user._id) }
                        }));
                    }
                }

                dispatch(setAuthUser({ ...user, following: updatedFollowing }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to action');
        }
    };

    // Top 5 suggestions only
    const topSuggestions = (suggestedUsers || []).slice(0, 5);

    return (
        <div className='flex flex-col gap-4'>
            {/* Creative Header */}
            <div className='flex items-center justify-between px-1 mb-2'>
                <h1 className='font-bold text-[14px] text-[#262626] tracking-tight'>Suggested for you</h1>
                <span className='text-[12px] font-bold text-[#262626] hover:text-[#8e8e8e] cursor-pointer transition-colors'>See All</span>
            </div>

            {/* Users List */}
            <div className='flex flex-col gap-1'>
                {
                    topSuggestions.map((suggestedUser) => {
                        const isFollowing = user?.following?.includes(suggestedUser?._id);
                        const isFollower = user?.followers?.includes(suggestedUser?._id) || suggestedUser?.following?.includes(user?._id);
                        const hasRequested = suggestedUser?.followRequests?.includes(user?._id);

                        let buttonState = 'Follow';
                        if (isFollowing) {
                            buttonState = 'Following';
                        } else if (hasRequested) {
                            buttonState = 'Requested';
                        } else if (isFollower) {
                            buttonState = 'Follow Back';
                        }

                        return (
                            <div
                                key={suggestedUser._id}
                                className='group flex items-center justify-between p-2 rounded-[13px] hover:bg-[#fafafa] transition-all duration-300'
                            >
                                <div className='flex items-center gap-3'>
                                    <Link to={`/profile/${suggestedUser?._id}`}>
                                        <Avatar className="w-[44px] h-[44px] border border-[#efefef] transition-transform duration-300 group-hover:scale-110 shadow-sm">
                                            <AvatarImage src={suggestedUser?.profilePicture} alt="user_image" className="object-cover" />
                                            <AvatarFallback className="bg-[#f5f5f5] text-[#262626] font-bold">
                                                {suggestedUser?.username?.charAt(0)?.toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>

                                    <div className='flex flex-col'>
                                        <h1 className='font-bold text-[13px] text-[#262626] hover:underline cursor-pointer'>
                                            <Link to={`/profile/${suggestedUser?._id}`}>
                                                {suggestedUser?.username}
                                            </Link>
                                        </h1>
                                        <span className='text-[#8e8e8e] text-[12px] font-medium max-w-[120px] truncate'>
                                            {suggestedUser?.bio || 'Suggested for you'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleFollowUnfollow(suggestedUser?._id)}
                                    className={`text-[12px] font-bold transition-all duration-200 px-4 py-1.5 rounded-[8px] ${buttonState === 'Following' || buttonState === 'Requested'
                                        ? 'text-[#262626] bg-[#efefef] hover:bg-[#dbdbdb]'
                                        : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                                        }`}
                                >
                                    {buttonState}
                                </button>
                            </div>
                        )
                    })
                }
            </div>

            {topSuggestions.length === 0 && (
                <div className="py-4 text-center">
                    <span className="text-[13px] text-[#8e8e8e]">No suggestions at the moment</span>
                </div>
            )}
        </div>
    )
}

export default SuggestedUsers