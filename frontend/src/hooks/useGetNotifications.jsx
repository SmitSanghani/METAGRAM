import { setNotifications } from "@/redux/notificationSlice";
import api from "@/api";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const useGetNotifications = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(store => store.auth);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await api.get("/notification");
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
