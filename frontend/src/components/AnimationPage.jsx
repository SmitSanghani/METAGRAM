import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import animationVideo from '../assets/animation_video.mp4';
import { useSelector } from 'react-redux';

const AnimationPage = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const { user } = useSelector(store => store.auth);

    useEffect(() => {
        // Set a maximum timeout as a fallback (slightly shorter for a logo animation)
        const timer = setTimeout(() => {
            if (user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        }, 6000); 

        return () => clearTimeout(timer);
    }, [navigate, user]);

    const handleVideoEnd = () => {
        if (user?.role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/');
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
            <div className="relative flex flex-col items-center justify-center w-full px-4">
                {/* Logo Animation Container - Smaller and without borders/shadows */}
                <div className="w-full max-w-[250px] sm:max-w-[300px] md:max-w-[350px] aspect-video flex items-center justify-center overflow-hidden relative bg-white">
                    <video 
                        ref={videoRef}
                        className="w-full h-full object-cover scale-[1.3]" 
                        autoPlay 
                        muted 
                        playsInline
                        onEnded={handleVideoEnd}
                    >
                        <source src={animationVideo} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    
                    {/* Watermark hide layers */}
                    <div className="absolute bottom-0 right-0 w-[20%] h-[15%] bg-white"></div>
                    <div className="absolute top-0 right-0 w-[15%] h-[10%] bg-white"></div>
                </div>
            </div>
        </div>
    );
};

export default AnimationPage;
