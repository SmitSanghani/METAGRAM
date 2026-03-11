import { setNotifications } from "@/redux/notificationSlice";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetNotifications = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/v1/notification", { withCredentials: true });
                if (res.data.success) {
                    dispatch(setNotifications(res.data.notifications));
                }
            } catch (error) {
                console.error("Error fetching notifications", error);
            }
        };
        if (user) {
            fetchNotifications();
        }
    }, [user, dispatch]);
};

export default useGetNotifications;
