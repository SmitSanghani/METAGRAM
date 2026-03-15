import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const GlowWrapper = ({ 
    children, 
    color = "#32b096", 
    spread = 150, 
    blur = 20, 
    proximity = 200, 
    glow = true,
    className = "" 
}) => {
    const mouseX = useMotionValue(-1000);
    const mouseY = useMotionValue(-1000);
    const containerRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);

    // Smooth physics for the glow follow
    const smoothX = useSpring(mouseX, { damping: 30, stiffness: 300 });
    const smoothY = useSpring(mouseY, { damping: 30, stiffness: 300 });

    const handleMouseMove = useCallback((e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    }, [mouseX, mouseY]);

    const background = useTransform(
        [smoothX, smoothY],
        ([x, y]) => `radial-gradient(${spread}px circle at ${x}px ${y}px, ${color}22, transparent 80%)`
    );

    const borderMask = useTransform(
        [smoothX, smoothY],
        ([x, y]) => `radial-gradient(${proximity}px circle at ${x}px ${y}px, white, transparent)`
    );

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`relative group ${className}`}
        >
            {glow && (
                <motion.div
                    className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        background: background,
                    }}
                />
            )}
            
            {/* Edge Glow Effect */}
            {glow && (
                <motion.div
                    className="pointer-events-none absolute inset-0 z-[1]"
                    style={{
                        opacity: isHovered ? 1 : 0,
                        WebkitMaskImage: borderMask,
                        maskImage: borderMask,
                    }}
                >
                    <div 
                        className="absolute inset-[1px] rounded-[inherit] border border-[#32b096]/50"
                        style={{ boxShadow: `0 0 ${blur}px ${color}` }}
                    />
                </motion.div>
            )}

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};

export default GlowWrapper;
