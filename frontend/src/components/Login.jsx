import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from './ui/input'
import { Button } from './ui/button'
import axios from 'axios';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { setAuthUser } from '@/redux/authSlice';
import { useDispatch } from 'react-redux';

const Login = () => {
    const [input, setInput] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();


    const changeEventhandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value })
    }

    const signupHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:8000/api/v1/user/login', input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                dispatch(setAuthUser(res.data.user));
                navigate('/');
                toast.success(res.data.message);
                setInput({
                    email: '',
                    password: ''
                })
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response.data.message);
        } finally {
            setLoading(false);
        }

    }

    return (
        <div className='flex items-center w-screen h-screen justify-center bg-[rgb(218,242,242)] relative overflow-hidden'>
            {/* Minimalist subtle grain or glow could go here, but keeping it pure black for now */}

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className='relative z-10 w-full max-w-sm mx-4'
            >
                <form
                    onSubmit={signupHandler}
                    className='bg-black flex flex-col gap-8 p-12 rounded-[2rem] border border-zinc-800 shadow-[0_0_50px_rgba(255,255,255,0.02)]'
                >
                    <div className='text-center space-y-2'>
                        <h1 className='text-4xl font-black tracking-tighter text-white'>
                            METAGRAM
                        </h1>
                        <p className='text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]'>
                            Digital Identity
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-1">
                            <label className='text-[10px] font-bold uppercase tracking-widest text-zinc-100 ml-1'>Identity</label>
                            <Input
                                type="email"
                                name="email"
                                value={input.email}
                                onChange={changeEventhandler}
                                placeholder="Email address"
                                className="h-12 bg-transparent border-zinc-800 focus:border-white focus:ring-0 text-white rounded-xl transition-all placeholder:text-zinc-700 text-sm"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className='text-[10px] font-bold uppercase tracking-widest text-zinc-100 ml-1'>Key</label>
                            <Input
                                type="password"
                                name="password"
                                value={input.password}
                                onChange={changeEventhandler}
                                placeholder="Password"
                                className="h-12 bg-transparent border-zinc-800 focus:border-white focus:ring-0 text-white rounded-xl transition-all placeholder:text-zinc-700 text-sm"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <Button disabled className="h-12 bg-zinc-900 border border-zinc-800 text-white rounded-xl flex items-center justify-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                            Verifying
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            className="h-12 bg-white text-black hover:bg-zinc-200 font-black rounded-xl transition-all active:scale-[0.97]"
                        >
                            Sign In
                        </Button>
                    )}

                    <div className='flex items-center gap-4'>
                        <div className='h-[1px] bg-zinc-900 flex-1'></div>
                        <span className='text-[9px] font-bold text-zinc-100 uppercase tracking-widest'>Encryption active</span>
                        <div className='h-[1px] bg-zinc-900 flex-1'></div>
                    </div>

                    <p className='text-center text-zinc-100 text-xs font-medium'>
                        Don't have an account? <Link to="/signup" className="text-white hover:underline transition-all">Join us</Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
}

export default Login
