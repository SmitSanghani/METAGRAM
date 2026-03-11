import { setSuggestedUsers } from "@/redux/authSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetSuggestedUsers = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchSuggestedUsers = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/v1/user/chatusers", { withCredentials: true });
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