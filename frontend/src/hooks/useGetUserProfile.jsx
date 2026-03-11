import { setFollowRelationship, setUserProfile } from "@/redux/authSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetUserProfile = (userId) => {

    const dispatch = useDispatch();


    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await axios.get(`http://localhost:8000/api/v1/user/${userId}/profile`, { withCredentials: true });
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

            }
        }
        fetchUserProfile();
    }, [userId]);
};

export default useGetUserProfile;