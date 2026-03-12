import React, { useState } from 'react';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import axios from 'axios';

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const validate = () => {
        if (!email) {
            setError("Identity email is required");
            return false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Please enter a valid email address");
            return false;
        }
        setError(null);
        return true;
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:8000/api/v1/auth/send-otp', { email });
            if (res.data.success) {
                toast.success(res.data.message);
                navigate("/verify-otp", { state: { email } });
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
                <Link to="/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </Link>
                <h3 className="text-xl font-bold text-white mb-2 font-space-grotesk">Reset your key</h3>
                <p className="text-gray-500 text-sm">Enter your email and we'll send you an OTP to reset your password.</p>
            </div>

            <form onSubmit={submitHandler} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-500 tracking-wider uppercase ml-1">REGISTERED EMAIL</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-[#9ca3af] group-focus-within:text-[#32b096] transition-colors" />
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="name@metagram.io"
                            className={`block w-full pl-12 pr-4 py-3 bg-[#1c1c1c] border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#32b096]'} rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500/25' : 'focus:ring-[#32b096]/25'} transition-all shadow-lg text-sm`}
                        />
                    </div>
                    {error && <p className="text-[10px] text-red-500 font-bold tracking-wide mt-1 ml-1 uppercase">{error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-white hover:bg-gray-100 text-black font-bold rounded-xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm" // Changed py-3 to py-2
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send OTP"}
                </button>
            </form>
        </AuthLayout>
    );
};

export default ForgotPassword;
