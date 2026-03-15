import React from 'react';
import GlowWrapper from './GlowWrapper';

const GlowCard = ({ children, color = "#32b096", spread = 180, blur = 15, proximity = 250, className = "" }) => {
    return (
        <GlowWrapper 
            color={color} 
            spread={spread} 
            blur={blur} 
            proximity={proximity}
            className={`bg-[#0f0f10] rounded-2xl cursor-pointer border border-white/5 ${className}`}
        >
            <div className="p-6">
                {children}
            </div>
        </GlowWrapper>
    );
};

export default GlowCard;
