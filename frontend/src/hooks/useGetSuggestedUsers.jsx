import { setSuggestedUsers } from "@/redux/authSlice";
import api from "@/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetSuggestedUsers = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchSuggestedUsers = async () => {
            try {
                const res = await api.get("/user/chatusers");
                if (res.data.users) {
                    dispatch(setSuggestedUsers(res.data.users));
                }
            } catch (error) {
                console.log(error);

            }
        }
        fetchSuggestedUsers();
    }, []);
};

export default useGetSuggestedUsers;