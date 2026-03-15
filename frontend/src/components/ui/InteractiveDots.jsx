import React, { useEffect, useRef } from 'react';

const InteractiveDots = () => {
    const canvasRef = useRef(null);
    const mouse = useRef({ x: -1000, y: -1000 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        
        let dots = [];
        const spacing = 20;
        const baseDotSize = 0.8;
        const proximity = 150;

        const initDots = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            dots = [];
            
            // Calculate cols and rows based on actual viewport with extra buffer
            const cols = Math.ceil(canvas.width / spacing) + 2; 
            const rows = Math.ceil(canvas.height / spacing) + 2;
            
            for (let i = -1; i < cols; i++) {
                for (let j = -1; j < rows; j++) {
                    dots.push({
                        x: i * spacing + spacing / 2,
                        y: j * spacing + spacing / 2,
                    });
                }
            }
        };

        const onMouseMove = (e) => {
            mouse.current = { x: e.clientX, y: e.clientY };
        };

        const onMouseLeave = () => {
            mouse.current = { x: -1000, y: -1000 };
        };

        const render = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const mX = mouse.current.x;
            const mY = mouse.current.y;

            dots.forEach(dot => {
                // 1. Base size and opacity
                const baseSize = baseDotSize + 0.4;
                const baseOpacity = 0.12; 

                // 2. Mouse interaction - Full Viewport Range
                const dx = mX - dot.x;
                const dy = mY - dot.y;
                const distToMouse = Math.sqrt(dx * dx + dy * dy);
                
                let finalSize = baseSize;
                let finalOpacity = baseOpacity;

                if (distToMouse < proximity) {
                    const hoverForce = (proximity - distToMouse) / proximity;
                    finalSize = baseSize + (hoverForce * 2.2); 
                    finalOpacity = baseOpacity + (hoverForce * 0.6);
                }

                ctx.beginPath();
                ctx.arc(dot.x, dot.y, finalSize, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(32, 176, 150, ${finalOpacity})`; 
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        window.addEventListener('resize', initDots);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseleave', onMouseLeave);
        
        initDots();
        render();

        return () => {
            window.removeEventListener('resize', initDots);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-0"
        />
    );
};

export default InteractiveDots;
