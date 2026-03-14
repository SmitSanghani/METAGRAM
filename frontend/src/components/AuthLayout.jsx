import React from 'react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex items-center justify-center font-inter bg-gradient-to-br from-[#f7faf9] via-[#e6f4f1] to-[#d4ebe6] px-6">
            <div className="w-full max-w-[450px] flex flex-col items-center">
                <div className="w-full bg-[#0f0f10] rounded-[28px] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                    {/* Dotted Grid Background */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}>
                    </div>

                    <div className="relative z-10">
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="flex items-center gap-3 mb-1">
                                <img src="./src/assets/logo2.png" alt="logo" className="w-13 h-13 object-contain" />
                                <h2 className="text-3xl font-bold font-space-grotesk tracking-tight text-white">METAGRAM</h2>
                            </div>
                            <p className="text-[9px] tracking-[0.3em] text-gray-500 font-bold uppercase transition-all">DIGITAL IDENTITY</p>
                        </div>

                        {children}
                    </div>
                </div>

                <div className="mt-8 flex gap-6 text-[12px] text-gray-400 font-medium">
                    <Link to="/privacy" className="hover:text-black hover:font-bold transition-all">Privacy</Link>
                    <Link to="/terms" className="hover:text-black hover:font-bold transition-all">Terms</Link>
                    <Link to="/help" className="hover:text-black hover:font-bold transition-all">Help</Link>
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
