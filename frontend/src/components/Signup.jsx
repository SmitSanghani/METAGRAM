import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import api from '@/api';
import { useDispatch } from 'react-redux';
import { setAuthUser, setToken } from '../redux/authSlice';

const Signup = () => {
    const [input, setInput] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        gender: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);

    useEffect(() => {
        const checkAvailability = async () => {
            if (input.username.length >= 3) {
                setIsCheckingUsername(true);
                try {
                    const res = await api.get(`/user/check-username/${input.username}`);
                    if (res.data.success && !res.data.available) {
                        setErrors(prev => ({ ...prev, username: res.data.message }));
                    } else {
                        setErrors(prev => ({ ...prev, username: null }));
                    }
                } catch (error) {
                    console.error("Error checking username", error);
                } finally {
                    setIsCheckingUsername(false);
                }
            }
        };

        const timeoutId = setTimeout(checkAvailability, 500);
        return () => clearTimeout(timeoutId);
    }, [input.username]);

    const validate = () => {
        let newErrors = {};
        if (!input.username) newErrors.username = "Alias name is required";
        else if (input.username.length < 3) newErrors.username = "Name must be at least 3 characters";
        else if (errors.username) newErrors.username = errors.username;

        if (!input.email) newErrors.email = "Identity email is required";
        else if (!/\S+@\S+\.\S+/.test(input.email)) newErrors.email = "Please enter a valid email address";

        if (!input.password) newErrors.password = "Secured key is required";
        else if (input.password.length < 6) newErrors.password = "Key must be at least 6 characters";

        if (input.password !== input.confirmPassword) {
            newErrors.confirmPassword = "Keys do not match";
        }

        if (!input.gender) newErrors.gender = "Please select your identity gender";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const changeEventHandler = (e) => {
        setInput({ ...input, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: null });
        }
    }

    const signupHandler = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            const res = await api.post('/user/register', {
                username: input.username,
                email: input.email,
                password: input.password,
                gender: input.gender
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (res.data.success) {
                // Auto-login after successful registration
                try {
                    const loginRes = await api.post('/user/login', {
                        email: input.email,
                        password: input.password
                    });
                    if (loginRes.data.success) {
                        dispatch(setAuthUser(loginRes.data.user));
                        if (loginRes.data.token) {
                            dispatch(setToken(loginRes.data.token));
                        }
                        // Added delay for smoother transition to animation page
                        setTimeout(() => {
                            navigate("/animation");
                        }, 500);
                    } else {
                        navigate("/login");
                        toast.success(res.data.message);
                    }
                } catch (loginError) {
                    console.error("Auto-login failed:", loginError);
                    navigate("/login");
                    toast.success(res.data.message);
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={signupHandler} className="space-y-2.5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase ml-1">USERNAME</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-[#9ca3af] group-focus-within:text-[#32b096] transition-colors" />
                        </div>
                        <input
                            type="text"
                            name="username"
                            value={input.username}
                            onChange={changeEventHandler}
                            placeholder="lex_cyber"
                            className={`block w-full pl-12 pr-12 py-2.5 bg-[#1c1c1c] border ${errors.username ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.username ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                        {isCheckingUsername && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <Loader2 className="h-4 w-4 text-[#32b096] animate-spin" />
                            </div>
                        )}
                    </div>
                    {errors.username && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.username}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase ml-1">EMAIL</label>
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
                            className={`block w-full pl-12 pr-4 py-2.5 bg-[#1c1c1c] border ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase ml-1">KEY</label>
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
                            className={`block w-full pl-12 pr-12 py-2.5 bg-[#1c1c1c] border ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
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

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase ml-1">CONFIRM KEY</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-[#9ca3af] group-focus-within:text-[#32b096] transition-colors" />
                        </div>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={input.confirmPassword}
                            onChange={changeEventHandler}
                            placeholder="••••••••••••"
                            className={`block w-full pl-12 pr-12 py-2.5 bg-[#1c1c1c] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.confirmPassword ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                        >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {errors.confirmPassword && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.confirmPassword}</p>}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-500 tracking-wider uppercase ml-1">GENDER</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setInput({ ...input, gender: 'male' })}
                            className={`flex items-center justify-center gap-2 py-2 rounded-2xl border transition-all ${input.gender === 'male' ? 'bg-[#32b096]/10 border-[#32b096] text-[#32b096]' : 'bg-[#1c1c1c] border-white/10 text-gray-400 hover:border-white/20'}`}
                        >
                            <span className={`w-3 h-3 rounded-full border ${input.gender === 'male' ? 'bg-[#32b096] border-[#32b096]' : 'border-gray-600'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">Male</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setInput({ ...input, gender: 'female' })}
                            className={`flex items-center justify-center gap-2 py-2 rounded-2xl border transition-all ${input.gender === 'female' ? 'bg-[#32b096]/10 border-[#32b096] text-[#32b096]' : 'bg-[#1c1c1c] border-white/10 text-gray-400 hover:border-white/20'}`}
                        >
                            <span className={`w-3 h-3 rounded-full border ${input.gender === 'female' ? 'bg-[#32b096] border-[#32b096]' : 'border-gray-600'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">Female</span>
                        </button>
                    </div>
                    {errors.gender && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-0.5 ml-1 uppercase">{errors.gender}</p>}
                </div>

                <div className="pt-1">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-white hover:bg-gray-100 text-black font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
                    </button>
                </div>

                <div className="mt-6 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                        <Lock className="w-3 h-3" />
                        <span>Encryption Active</span>
                    </div>

                    <p className="text-gray-500 text-[11px] font-medium">
                        Already have an account? <Link to="/login" className="text-[#32b096] hover:underline font-bold">Sign In</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Signup;
