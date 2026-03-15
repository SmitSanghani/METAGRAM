import React, { useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { readFileAsDataURL } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch, useSelector } from 'react-redux';
import { setPosts } from '@/redux/postSlice';

const CreatePost = ({ open, setOpen }) => {

    const imageRef = useRef();
    const [file, setFile] = useState("");
    const [caption, setCaption] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const [allowComments, setAllowComments] = useState(true);
    const [loading, setLoading] = useState(false);
    const { user } = useSelector((store) => store.auth);
    const { posts } = useSelector((store) => store.post);
    const dispatch = useDispatch();

    const fileChangeHandler = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file);
            const dataUrl = await readFileAsDataURL(file);
            setImagePreview(dataUrl);
        }
    }


    const createPostHandler = async (e) => {
        const formData = new FormData();
        formData.append("caption", caption);
        formData.append("allowComments", allowComments);
        if (imagePreview) formData.append("image", file);
        try {
            setLoading(true);
            const res = await api.post("/post/addpost", formData, {
                headers: {
                    "Content-Type": "multipart/form-data"
                }
            });
            if (res.data.success) {
                dispatch(setPosts([res.data.post, ...posts]));      // [1] -> [1,2] -> total element = 2 
                toast.success(res.data.message);
                setOpen(false);
                setCaption("");
                setImagePreview("");
                setFile("");
            }
        } catch (error) {
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="bg-white rounded-2xl p-0 border-none shadow-2xl overflow-hidden max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader className='relative flex-none flex-row items-center justify-between py-4 px-4 border-b border-[#efefef] m-0 bg-white'>
                    <div className="w-8" /> {/* Spacer */}
                    <DialogTitle className='text-center font-bold text-[16px] text-[#262626]'>Create new post</DialogTitle>
                    <DialogDescription className="sr-only">Upload a photo and write a caption for your new post</DialogDescription>
                    <button 
                        onClick={() => setOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
                    >
                        <X size={20} />
                    </button>
                </DialogHeader>
                <div className='p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar flex-1 bg-white'>
                    <div className='flex gap-3 items-center'>
                        <Avatar className="w-10 h-10 border border-[#efefef]">
                            <AvatarImage src={user?.profilePicture} alt="img" className="object-cover" />
                            <AvatarFallback>{user?.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className='font-bold text-[14px] text-[#262626]'>{user?.username}</h1>
                        </div>
                    </div>

                    <Textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="focus-visible:ring-0 border-none bg-white p-0 text-[15px] resize-none min-h-[100px] placeholder:text-[#9CA3AF] transition-all"
                        placeholder="Write a caption..."
                    />

                    {
                        imagePreview && (
                            <div className='w-full aspect-square flex items-center justify-center rounded-lg overflow-hidden bg-black/5'>
                                <img src={imagePreview} alt="Preview_img" className="w-full h-full object-cover" />
                            </div>
                        )
                    }

                    <div className="flex items-center justify-between py-2 border-t border-gray-50 mt-2">
                        <span className="text-[14px] font-medium text-gray-700">Allow comments</span>
                        <div
                            onClick={() => setAllowComments(!allowComments)}
                            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${allowComments ? 'bg-[#4F46E5]' : 'bg-gray-300'}`}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${allowComments ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    <input ref={imageRef} type="file" className='hidden' onChange={fileChangeHandler} />

                    {!imagePreview && (
                        <div
                            onClick={() => imageRef.current.click()}
                            className="w-full h-[220px] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-gray-50 transition-all group"
                        >
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                                <svg aria-label="Icon to represent media such as images or videos" fill="currentColor" height="40" role="img" viewBox="0 0 97.6 77.3" width="40"><path d="M16.3 24h.3c2.8-.2 4.9-2.6 4.8-5.4-.2-2.8-2.6-4.9-5.4-4.8s-4.9 2.6-4.8 5.4c.1 2.7 2.4 4.8 5.1 4.8zm-2.4-7.2c.5-.6 1.3-1 2.1-1h.2c1.7 0 3.1 1.4 3.1 3.1 0 1.7-1.4 3.1-3.1 3.1-1.7 0-3.1-1.4-3.1-3.1 0-.8.3-1.5.8-2.1z" fill="currentColor"></path><path d="M84.7 18.4L58 16.9l-.2-3c-.3-5.7-5.2-10.1-11-9.8L12.9 6c-5.7.3-10.1 5.3-9.8 11L5 51c.3 5.7 5.2 10.1 11 9.8l34.3-2c1.9 0 3.7-.7 5.2-2L84.7 18.4zm-38 34.1L12.8 54.6c-3.1.2-5.7-2.1-5.9-5.2l-1.9-34c-.2-3.1 2.1-5.7 5.2-5.9l33.8-2c3.1-.2 5.7 2.1 5.9 5.2l1.9 34c.2 3.2-2.1 5.8-5.2 6zm33.3-33L54.6 47.1l-1.6-28.8c-.3-4.8-4.5-8.5-9.3-8.2l-30.5 1.8 30.2-1.8c3.1-.2 5.7 2.1 5.9 5.2l.2 3 24.8 1.4c3.1.2 5.5 2.8 5.3 5.9s-2.8 5.5-5.9 5.3z" fill="currentColor"></path></svg>
                            </div>
                            <span className="text-[#262626] font-medium text-[16px]">Select from computer</span>
                            <Button className="bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold rounded-lg px-4 h-9">
                                Select from computer
                            </Button>
                        </div>
                    )}

                    {
                        imagePreview && (
                            loading ? (
                                <Button disabled className="w-full bg-[#0095F6]/70 text-white font-bold h-10 rounded-lg mt-4">
                                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                                    Please wait...
                                </Button>
                            ) : (
                                <Button onClick={createPostHandler} type="submit" className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-bold h-10 rounded-lg mt-4 shadow-none">Post</Button>
                            )
                        )
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default CreatePost
