import { setChatUsers } from "@/redux/chatSlice";
import api from "@/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetChatUsers = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchChatUsers = async () => {
            try {
                const res = await api.get("/user/chatusers");
                if (res.data.success) {
                    dispatch(setChatUsers(res.data.users));
                }
            } catch (error) {
                console.log(error);
            }
        }
        fetchChatUsers();
    }, [dispatch]);
};

export default useGetChatUsers;
