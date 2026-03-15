import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo2.png';

import GlowWrapper from './ui/GlowWrapper';
import InteractiveDots from './ui/InteractiveDots';

const AuthLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex items-center justify-center font-inter bg-gradient-to-br from-[#f7faf9] via-[#e6f4f1] to-[#d4ebe6] px-6 py-6 relative overflow-hidden">
            <InteractiveDots />
            <div className="w-full max-w-[450px] flex flex-col items-center relative z-10">
                <GlowWrapper
                    color="#32b096"
                    spread={200}
                    blur={5}
                    proximity={300}
                    className="w-full bg-[#0f0f10] rounded-[28px] cursor-pointer shadow-2xl relative overflow-hidden"
                >
                    <div className="p-6 md:p-8">
                        <div className="relative z-10">
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <img src={logo} alt="logo" className="w-12 h-12 object-contain" />
                                    <h2 className="text-2xl font-bold font-space-grotesk tracking-tight text-white">METAGRAM</h2>
                                </div>
                                <p className="text-[8px] tracking-[0.3em] text-gray-500 font-bold uppercase transition-all">DIGITAL IDENTITY</p>
                            </div>

                            {children}
                        </div>
                    </div>
                </GlowWrapper>

                <div className="mt-8 flex gap-6 text-[11px] text-gray-400 font-medium">
                    <Link to="/privacy" className="hover:text-gray-900 hover:underline cursor-pointer transition-all">Privacy</Link>
                    <Link to="/terms" className="hover:text-gray-900 hover:underline cursor-pointer transition-all">Terms</Link>
                    <Link to="/help" className="hover:text-gray-900 hover:underline cursor-pointer transition-all">Help</Link>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .font-space-grotesk { font-family: 'Space Grotesk', sans-serif; }
                .font-inter { font-family: 'Inter', sans-serif; }
            `}} />
        </div>
    );
};

export default AuthLayout;
