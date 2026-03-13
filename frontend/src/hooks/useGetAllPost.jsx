import { setPosts } from "@/redux/postSlice";
import api from "@/api";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

const useGetAllPost = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchAllPost = async () => {
            try {
                const res = await api.get("/post/all");
                if (res.data.success) {
                    console.log(res.data.posts);
                    dispatch(setPosts(res.data.posts));
                }
            } catch (error) {
                console.log(error);

            }
        }
        fetchAllPost();
    }, []);
};

export default useGetAllPost;