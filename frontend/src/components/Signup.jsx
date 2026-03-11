import React, { useState } from 'react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import axios from 'axios';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Signup = () => {
    const [input, setInput] = useState({
        username: '',
        email: '',
        password: '',
        isPrivate: false
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const changeEventhandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value })
    }

    const signupHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:8000/api/v1/user/register', input, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                navigate('/login');
                toast.success(res.data.message);
                setInput({
                    username: '',
                    email: '',
                    password: '',
                    isPrivate: false
                })
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || "Registration failed");
        } finally {
            setLoading(false);
        }

    }

    return (
        <div className='flex items-center w-screen h-screen justify-center bg-[rgb(218,242,242)]'>
            <form onSubmit={signupHandler} className='shadow-lg flex flex-col gap-5 p-8 bg-white rounded-xl w-full max-w-md'>
                <div className='my-4'>
                    <h1 className='text-center font-bold text-xl'>
                        Metagram
                    </h1>
                    <p className='text-sm text-center mt-3'>Sign up to see photos & videos from your friends profile</p>
                </div>

                <div>
                    <span className='font-medium'>Username</span>
                    <Input
                        type="text"
                        name="username"
                        value={input.username}
                        onChange={changeEventhandler}
                        className="focus-visible:ring-transparent my-2"
                        required
                    />
                </div>

                <div>
                    <span className='font-medium'>Email</span>
                    <Input type="email"
                        name="email"
                        value={input.email}
                        onChange={changeEventhandler}
                        className="focus-visible:ring-transparent my-2"
                        required
                    />
                </div>

                <div>
                    <span className='font-medium'>Password</span>
                    <Input
                        type="password"
                        name="password"
                        value={input.password}
                        onChange={changeEventhandler}
                        className="focus-visible:ring-transparent my-2 "
                        required
                    />
                </div>

                <div className='mt-2'>
                    <span className='font-medium mb-3 block'>Account Type</span>
                    <div className='flex items-center gap-6'>
                        <label className='flex items-center gap-2 cursor-pointer'>
                            <input
                                type='radio'
                                name='isPrivate'
                                value='false'
                                checked={!input.isPrivate}
                                onChange={() => setInput({ ...input, isPrivate: false })}
                                className='w-4 h-4 text-blue-600 focus:ring-blue-500'
                            />
                            <span className='text-sm'>Public Account</span>
                        </label>
                        <label className='flex items-center gap-2 cursor-pointer'>
                            <input
                                type='radio'
                                name='isPrivate'
                                value='true'
                                checked={input.isPrivate}
                                onChange={() => setInput({ ...input, isPrivate: true })}
                                className='w-4 h-4 text-blue-600 focus:ring-blue-500'
                            />
                            <span className='text-sm'>Private Account</span>
                        </label>
                    </div>
                </div>

                {
                    loading ? (
                        <Button disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Please wait...
                        </Button>
                    ) : (
                        <Button type="submit">SignUp</Button>
                    )
                }
                <span className='text-center'>Already have an account? <Link to="/login" className="text-blue-600">Login</Link> </span>

            </form>
        </div>
    )
}

export default Signup
