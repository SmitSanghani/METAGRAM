import { useEffect } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setReels } from "../redux/reelSlice";

const useGetReels = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchReels = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/v1/reels/feed?page=1&limit=20", { withCredentials: true });
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
