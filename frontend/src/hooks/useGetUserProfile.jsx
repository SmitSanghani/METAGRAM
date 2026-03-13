import { setFollowRelationship, setUserProfile } from "@/redux/authSlice";
import api from "@/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetUserProfile = (userId) => {

    const dispatch = useDispatch();


    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await api.get(`/user/${userId}/profile`);
                if (res.data.success) {
                    dispatch(setUserProfile(res.data.user));
                    dispatch(setFollowRelationship({
                        isFollowing: res.data.isFollowing,
                        isFollower: res.data.isFollower,
                        requestPending: res.data.requestPending
                    }));
                }
            } catch (error) {
                console.log(error);
                dispatch(setUserProfile(null));
            }
        }
        fetchUserProfile();
    }, [userId]);
};

export default useGetUserProfile;