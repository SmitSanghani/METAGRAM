import React, { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { toast } from 'sonner';
import api from '@/api';

const VerifyOTP = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate("/forgot-password");
        }
    }, [email, navigate]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    }

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace if current input is empty
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    }

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return; // Only allow numbers

        const newOtp = [...otp];
        const digits = pastedData.split('');

        digits.forEach((digit, i) => {
            if (i < 6) newOtp[i] = digit;
        });

        setOtp(newOtp);

        // Focus the appropriate input
        const targetIndex = digits.length < 6 ? digits.length : 5;
        inputRefs.current[targetIndex].focus();
    };

    const verifyHandler = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length < 6) {
            toast.error("Please enter the full 6-digit OTP");
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/auth/verify-otp', { email, otp: otpValue });
            if (res.data.success) {
                toast.success(res.data.message);
                navigate("/reset-password", { state: { email, otp: otpValue } });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    const resendOTP = async () => {
        try {
            const res = await api.post('/auth/send-otp', { email });
            if (res.data.success) {
                toast.success("New OTP sent to your email");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resend OTP");
        }
    }

    return (
        <AuthLayout>
            <div className="mb-6 text-center">
                <Link to="/forgot-password" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold mb-6 self-start">
                    <ArrowLeft className="w-4 h-4" />
                    Change Email
                </Link>
                <h3 className="text-xl font-bold text-white mb-2 font-space-grotesk">Check your email</h3>
                <p className="text-gray-500 text-sm">We've sent a 6-digit code to <span className="text-white font-medium">{email}</span></p>
            </div>

            <form onSubmit={verifyHandler} className="space-y-8">
                <div className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="w-12 h-14 bg-[#1c1c1c] border border-white/10 rounded-2xl text-white text-2xl font-bold text-center focus:outline-none focus:border-[#32b096] focus:ring-2 focus:ring-[#32b096]/25 transition-all shadow-lg"
                        />
                    ))}
                </div>

                <div className="space-y-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-2xl transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify OTP"}
                    </button>

                    <p className="text-center text-gray-500 text-sm font-medium">
                        Didn't receive the code? <button type="button" onClick={resendOTP} className="text-[#32b096] hover:underline font-bold">Resend</button>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
};

export default VerifyOTP;
