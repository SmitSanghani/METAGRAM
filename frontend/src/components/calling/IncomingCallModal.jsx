import React, { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { cn, getAvatarColor } from '@/lib/utils';
import { setIncomingCall } from '@/redux/callSlice';
import { audioGenerator } from '@/utils/audioGenerator';

const IncomingCallModal = ({ onAccept, onReject }) => {
    const { remoteUser, callType } = useSelector(store => store.call);
    if (!remoteUser) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[40px] w-full max-w-[360px] p-10 flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-500 border border-white/20">
                <div className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-8 animate-pulse">
                    Incoming {callType} Call
                </div>

                <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping"></div>
                    <Avatar className="w-28 h-28 border-4 border-white shadow-xl relative z-10">
                        <AvatarImage src={remoteUser?.profilePicture} className="object-cover" />
                        <AvatarFallback className={cn("text-3xl font-black", getAvatarColor(remoteUser?.username))}>
                            {remoteUser?.username?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <h2 className="text-[28px] font-black text-[#111] tracking-tight mb-2">
                    {remoteUser?.username}
                </h2>
                <p className="text-gray-400 font-bold text-[14px] mb-12 uppercase tracking-widest">Metagram Call</p>

                <div className="flex gap-8 w-full justify-center">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReject();
                        }}
                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200 hover:bg-red-600 active:scale-90 transition-all cursor-pointer z-20 group"
                    >
                        <PhoneOff size={28} className="group-hover:rotate-12 transition-transform" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAccept();
                        }}
                        className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 hover:bg-green-600 active:scale-90 transition-all cursor-pointer z-20 group"
                    >
                        {callType === 'video' ? 
                            <Video size={28} className="group-hover:scale-110 transition-transform" /> : 
                            <Phone size={28} className="group-hover:rotate-12 transition-transform" />
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCallModal;
