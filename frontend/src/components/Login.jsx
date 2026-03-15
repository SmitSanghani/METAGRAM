import React, { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch } from 'react-redux';
import { setAuthUser, setToken } from '../redux/authSlice';

const Login = () => {
    const [input, setInput] = useState({
        email: "",
        password: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const validate = () => {
        let newErrors = {};
        if (!input.email) newErrors.email = "Identity email is required";
        else if (!/\S+@\S+\.\S+/.test(input.email)) newErrors.email = "Please enter a valid email address";

        if (!input.password) newErrors.password = "Secured key is required";
        else if (input.password.length < 4) newErrors.password = "Key must be at least 4 characters";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    }

    const loginHandler = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            const res = await api.post('/user/login', input, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.data.success) {
                const loggedInUser = res.data.user;
                const token = res.data.token;

                dispatch(setAuthUser(loggedInUser));
                if (token) {
                    dispatch(setToken(token));
                }

                // Persist account for quick switching
                try {
                    const ACCOUNTS_KEY = 'metagram_accounts';
                    const existingRaw = localStorage.getItem(ACCOUNTS_KEY);
                    const existing = existingRaw ? JSON.parse(existingRaw) : [];

                    const newAccount = {
                        userId: loggedInUser?._id,
                        username: loggedInUser?.username,
                        profilePicture: loggedInUser?.profilePicture || null,
                        email: loggedInUser?.email || input.email,
                        token: token || null,
                        user: loggedInUser
                    };

                    const withoutCurrent = existing.filter(
                        (acc) => acc.userId !== newAccount.userId
                    );

                    const updatedAccounts = [newAccount, ...withoutCurrent].slice(0, 5);
                    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
                } catch (e) {
                    // fail silently if localStorage is not available
                }

                // Show a small delay to ensure Redux state is updated before navigation
                setTimeout(() => {
                    navigate("/animation");
                }, 500);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={loginHandler} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">IDENTITY</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-[#9ca3af] group-focus-within:text-[#32b096] transition-colors" />
                        </div>
                        <input
                            type="email"
                            name="email"
                            value={input.email}
                            onChange={changeEventHandler}
                            placeholder="name@metagram.io"
                            className={`block w-full pl-12 pr-4 py-3 bg-[#1c1c1c] border ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">KEY</label>
                        <Link to="/forgot-password" size="sm" className="text-[11px] font-bold text-gray-500 hover:text-white transition-colors">
                            Forgot your key?
                        </Link>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-[#9ca3af] group-focus-within:text-[#32b096] transition-colors" />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={input.password}
                            onChange={changeEventHandler}
                            placeholder="••••••••••••"
                            className={`block w-full pl-12 pr-12 py-3 bg-[#1c1c1c] border ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.password && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.password}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                </button>

                <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        <Lock className="w-3 h-3" />
                        <span>Encryption Active</span>
                    </div>

                    <p className="text-gray-500 text-xs font-medium">
                        Don't have an account? <Link to="/signup" className="text-[#32b096] hover:underline font-bold">Join us</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Login;
