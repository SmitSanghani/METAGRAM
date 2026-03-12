import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import axios from 'axios';

const Signup = () => {
    const [input, setInput] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validate = () => {
        let newErrors = {};
        if (!input.username) newErrors.username = "Alias name is required";
        else if (input.username.length < 3) newErrors.username = "Name must be at least 3 characters";

        if (!input.email) newErrors.email = "Identity email is required";
        else if (!/\S+@\S+\.\S+/.test(input.email)) newErrors.email = "Please enter a valid email address";
        
        if (!input.password) newErrors.password = "Secured key is required";
        else if (input.password.length < 6) newErrors.password = "Key must be at least 6 characters";

        if (input.password !== input.confirmPassword) {
            newErrors.confirmPassword = "Keys do not match";
        }

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
            const res = await axios.post('http://localhost:8000/api/v1/user/register', {
                username: input.username,
                email: input.email,
                password: input.password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            if (res.data.success) {
                navigate("/login");
                toast.success(res.data.message);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <form onSubmit={signupHandler} className="space-y-3">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">USERNAME</label>
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
                            className={`block w-full pl-12 pr-4 py-2.5 bg-[#1c1c1c] border ${errors.username ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.username ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                    </div>
                    {errors.username && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.username}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">EMAIL</label>
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
                            className={`block w-full pl-12 pr-4 py-2.5 bg-[#1c1c1c] border ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">KEY</label>
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
                            className={`block w-full pl-12 pr-12 py-2.5 bg-[#1c1c1c] border ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
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

                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">CONFIRM KEY</label>
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
                            className={`block w-full pl-12 pr-12 py-2.5 bg-[#1c1c1c] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.confirmPassword ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
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

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
                    </button>
                </div>

                <div className="mt-8 flex flex-col items-center">
                    <p className="text-gray-500 text-xs font-medium">
                        Already have an account? <Link to="/login" className="text-[#32b096] hover:underline font-bold">Sign In</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default Signup;
