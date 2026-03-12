import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col md:flex-row font-inter bg-[#f7faf9]">
            {/* Left Side: Branding and floating cards */}
            <div className="hidden md:flex flex-1 flex-col justify-center px-12 lg:px-24 bg-gradient-to-br from-[#f7faf9] via-[#e6f4f1] to-[#d4ebe6] relative overflow-hidden">
                <div className="z-10 max-w-xl mt-5">
                    <h1 className="text-[56px] leading-[1.1] font-bold font-space-grotesk text-black mb-6">
                        See your digital identity, <span className="text-[#32b096]">redefined.</span>
                    </h1>
                    <p className="text-xl text-gray-600 font-medium">
                        Connect, share, and verify your persona in the new era of social trust.
                    </p>
                </div>

                {/* Floating Social Cards */}
                <div className="mt-20 relative h-[450px] w-full flex items-center justify-center">
                    {/* Card 1: Back Left */}
                    <div className="absolute left-0 top-10 w-[220px] bg-white rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-4 z-10 animate-float-1 transform -rotate-[5deg] scale-95">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-100">
                                <img src="/abstract_card.png" alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-sm text-gray-800">alex_cyber</span>
                        </div>
                        <div className="h-40 rounded-xl bg-gray-100 mb-3 overflow-hidden border border-gray-50">
                            <img src="/abstract_card.png" alt="post" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center gap-3 mb-1">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <div className="text-xs font-bold text-gray-500">842 likes</div>
                    </div>

                    {/* Card 2: Front Center */}
                    <div className="absolute left-2/3 -translate-x-1/2 top-4 w-[260px] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 z-30 animate-float-2">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden ring-2 ring-gray-50">
                                    <img src="/portrait_card.png" alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-gray-800 flex items-center gap-1">
                                        meta_identity
                                        <svg className="w-3.5 h-3.5 text-[#32b096]" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">Verified Creator</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-52 rounded-xl bg-gray-100 mb-3 overflow-hidden border border-gray-50 shadow-inner">
                            <img src="/portrait_card.png" alt="post" className="w-full h-full object-cover transition-transform hover:scale-105 duration-700" />
                        </div>
                        <div className="flex items-center gap-3 mb-1">
                            <svg className="w-5 h-5 text-[#ff3040]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <div className="text-xs font-bold text-gray-800">2,493 likes</div>
                    </div>

                    {/* Card 3: Back Right */}
                    <div className="absolute right-0 top-16 w-[230px] bg-white rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.1)] p-4 z-20 animate-float-3 transform rotate-[4deg] scale-90">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden ring-1 ring-gray-100">
                                <img src="/digital_art_card.png" alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-bold text-sm text-gray-800">pixel_june</span>
                        </div>
                        <div className="h-36 rounded-xl bg-gray-100 mb-3 overflow-hidden border border-gray-50">
                            <img src="/digital_art_card.png" alt="post" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center gap-3 mb-1">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        </div>
                        <div className="text-xs font-bold text-gray-500">1,104 likes</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white md:bg-[#f7faf9]">
                <div className="w-full max-w-[450px] bg-[#0f0f10] rounded-[28px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    {/* Dotted Grid Background */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}>
                    </div>

                    <div className="relative z-10">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold font-space-grotesk tracking-tight text-white mb-1">METAGRAM</h2>
                            <p className="text-[9px] tracking-[0.3em] text-gray-500 font-bold uppercase transition-all">DIGITAL IDENTITY</p>
                        </div>

                        {children}
                    </div>
                </div>

                <div className="mt-8 flex gap-6 text-[12px] text-gray-400 font-medium">
                    <Link to="/privacy" className="hover:text-black">Privacy</Link>
                    <Link to="/terms" className="hover:text-black">Terms</Link>
                    <Link to="/help" className="hover:text-black">Help</Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes float-1 {
                    0%, 100% { transform: translateY(0) rotate(-5deg) scale(0.95); }
                    50% { transform: translateY(-15px) rotate(-5deg) scale(0.95); }
                }
                @keyframes float-2 {
                    0%, 100% { transform: translate(-50%, 0); }
                    50% { transform: translate(-50%, -15px); }
                }
                @keyframes float-3 {
                    0%, 100% { transform: translateY(0) rotate(4deg) scale(0.9); }
                    50% { transform: translateY(-15px) rotate(4deg) scale(0.9); }
                }
                .animate-float-1 {
                    animation: float-1 6s ease-in-out infinite;
                }
                .animate-float-2 {
                    animation: float-2 5s ease-in-out infinite;
                    animation-delay: 0.5s;
                }
                .animate-float-3 {
                    animation: float-3 7s ease-in-out infinite;
                    animation-delay: 1s;
                }
                .font-space-grotesk { font-family: 'Space Grotesk', sans-serif; }
                .font-inter { font-family: 'Inter', sans-serif; }
            `}} />
        </div>
    );
};

export default AuthLayout;
