import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PhoneOff } from 'lucide-react';
import { cn, getAvatarColor } from '@/lib/utils';
import { audioGenerator } from '@/utils/audioGenerator';

const OutgoingCallModal = ({ onCancel }) => {
    const { remoteUser, callType } = useSelector(store => store.call);
    const audioRef = useRef(null);

    useEffect(() => {
        // Play dial tone
        const audio = new Audio('/dialtone.mp3');
        audio.loop = true;
        audioRef.current = audio;

        const fallbackTimeout = setTimeout(() => {
            console.log("Dialtone file loading slow, switching to generator");
            audioGenerator.startDialTone();
        }, 1500);

        audio.play().then(() => {
            clearTimeout(fallbackTimeout);
        }).catch(e => {
            clearTimeout(fallbackTimeout);
            console.log("Dialtone file missing or blocked, using generated dial tone");
            audioGenerator.startDialTone();
        });

        return () => {
            clearTimeout(fallbackTimeout);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = ""; // Clear src to stop loading
                audioRef.current = null;
            }
            audioGenerator.stop();
        };
    }, []);

    if (!remoteUser) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-lg animate-in fade-in duration-300">
            <div className="flex flex-col items-center w-full max-w-[400px]">
                <div className="text-[14px] font-black text-white/60 uppercase tracking-[0.4em] mb-12 animate-pulse">
                    Calling...
                </div>

                <div className="relative mb-10">
                    <div className="absolute inset-0 rounded-full bg-white/10 animate-[ping_2s_infinite]"></div>
                    <Avatar className="w-36 h-36 border-4 border-white/20 shadow-2xl relative z-10 scale-110">
                        <AvatarImage src={remoteUser?.profilePicture} className="object-cover" />
                        <AvatarFallback className={cn("text-5xl font-black", getAvatarColor(remoteUser?.username))}>
                            {remoteUser?.username?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <h2 className="text-[36px] font-black text-white tracking-tight mb-2">
                    {remoteUser?.username}
                </h2>
                <p className="text-white/40 font-bold text-[14px] mb-20 uppercase tracking-widest">{callType} Call</p>

                <button
                    onClick={() => onCancel(remoteUser._id)}
                    className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-2xl shadow-red-500/40 hover:bg-red-600 active:scale-90 transition-all"
                >
                    <PhoneOff size={32} />
                </button>
            </div>
        </div>
    );
};

export default OutgoingCallModal;
