import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import axios from 'axios';

const ResetPassword = () => {
    const [input, setInput] = useState({
        password: "",
        confirmPassword: ""
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const { email, otp } = location.state || {};

    const validate = () => {
        let newErrors = {};
        if (!input.password) newErrors.password = "New key is required";
        else if (input.password.length < 4) newErrors.password = "Key must be at least 4 characters";

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

    const resetHandler = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);
            const res = await axios.post('http://localhost:8000/api/v1/auth/reset-password', {
                email,
                otp,
                password: input.password
            });
            if (res.data.success) {
                toast.success(res.data.message);
                navigate("/login");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthLayout>
            <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2 font-space-grotesk">Secure your account</h3>
                <p className="text-gray-500 text-sm">Choose a strong new key for your Metagram identity.</p>
            </div>

            <form onSubmit={resetHandler} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">NEW KEY</label>
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
                            className={`block w-full pl-12 pr-12 py-3 bg-[#1c1c1c] border ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
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
                            className={`block w-full pl-12 pr-12 py-3 bg-[#1c1c1c] border ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${errors.confirmPassword ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
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

                <div className="space-y-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Reset Password"}
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest pt-4">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Identity Security Active</span>
                    </div>
                </div>
            </form>
        </AuthLayout>
    );
};

export default ResetPassword;
