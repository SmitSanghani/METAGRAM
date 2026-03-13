import { useEffect } from "react";
import api from "../api";
import { useDispatch } from "react-redux";
import { setReels } from "../redux/reelSlice";

const useGetReels = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchReels = async () => {
            try {
                const res = await api.get("/reels/feed?page=1&limit=20");
                if (res.data.success) {
                    dispatch(setReels(res.data.reels));
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchReels();
    }, [dispatch]);
}

export default useGetReels;
