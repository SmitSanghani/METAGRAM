import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { setAuthUser } from '../../redux/authSlice';
import { Loader2, Mail, Lock, ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
    const [input, setInput] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
    };

    const loginHandler = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await api.post('/user/login', input, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.data.success) {
                const user = res.data.user;
                if (user.role === 'admin') {
                    dispatch(setAuthUser(user));
                    toast.success(res.data.message);
                    navigate('/admin');
                } else {
                    toast.error('Access denied. Admin privileges required.');
                    // Optionally log them out immediately if they are not an admin
                    await api.get('/user/logout');
                }
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center flex-col items-center gap-2">
                    <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center border-2 border-sky-200 shadow-inner">
                        <ShieldCheck className="w-8 h-8 text-sky-500" />
                    </div>
                    <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
                        Admin Portal
                    </h2>
                    <p className="text-center text-sm text-gray-500">
                        Sign in to access the Metagram control panel
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl shadow-sky-100/50 sm:rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={loginHandler}>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    name="email"
                                    value={input.email}
                                    onChange={changeEventHandler}
                                    className="block w-full pl-12 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all shadow-sm"
                                    placeholder="admin@gmail.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    value={input.password}
                                    onChange={changeEventHandler}
                                    className="block w-full pl-12 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-all shadow-sm"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !input.email || !input.password}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-sky-500/30 text-sm font-bold text-white bg-sky-500 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                        Authenticating...
                                    </>
                                ) : (
                                    'Access Admin Dashboard'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
                <div className="mt-6 text-center">
                    <button onClick={() => navigate('/login')} className="text-sm font-medium text-sky-600 hover:text-sky-500 transition-colors">
                        &larr; Return to main site
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
