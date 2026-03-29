import p1 from '../assets/p1.png';
import p2 from '../assets/p2.png';
import p3 from '../assets/p3.png';
import p4 from '../assets/p4.png';
import p5 from '../assets/p5.png';
import p6 from '../assets/p6.png';
import p7 from '../assets/p7.jpg';
import p8 from '../assets/p8.jpg';
import p9 from '../assets/p9.jpg';

export const THEMES = [
    {
        id: 'default',
        name: 'Default',
        backgroundImage: null,
        bubbleColor: 'bg-indigo-600',
        receivedColor: 'bg-white',
        textColor: 'text-white',
        receivedTextColor: 'text-[#262626]',
        isDark: false
    },
    {
        id: 'theme1',
        name: 'Royal Garden',
        backgroundImage: p1,
        bubbleColor: 'bg-emerald-600/95',
        receivedColor: 'bg-black/20 backdrop-blur-xl',
        textColor: 'text-white',
        receivedTextColor: 'text-white/90',
        isDark: true
    },
    {
        id: 'theme2',
        name: 'Ocean breeze',
        backgroundImage: p2,
        bubbleColor: 'bg-blue-600/95',
        receivedColor: 'bg-black/20 backdrop-blur-xl',
        textColor: 'text-white',
        receivedTextColor: 'text-white/90',
        isDark: true
    },
    {
        id: 'theme3',
        name: 'Night City',
        backgroundImage: p3,
        bubbleColor: 'bg-fuchsia-600/95',
        receivedColor: 'bg-black/30 backdrop-blur-xl border border-white/5',
        textColor: 'text-white font-bold',
        receivedTextColor: 'text-white/90',
        isDark: true
    },
    {
        id: 'theme4',
        name: 'Cyber Punk',
        backgroundImage: p4,

        // sender bubble
        bubbleColor: 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 shadow-[0_0_12px_rgba(236,72,153,0.8)]',

        // receiver bubble
        receivedColor: 'bg-black/40 backdrop-blur-xl border border-pink-500/20',

        // sender text
        textColor: 'text-white font-semibold',

        // receiver text
        receivedTextColor: 'text-white/80',

        isDark: true
    },
    {
        id: 'theme5',
        name: 'Desert sunset',
        backgroundImage: p5,
        bubbleColor: 'bg-orange-500/95',
        receivedColor: 'bg-white/10 backdrop-blur-xl border border-white/10',
        textColor: 'text-white shadow-sm',
        receivedTextColor: 'text-white/90 font-medium',
        isDark: true
    },
    {
        id: 'theme6',
        name: 'Royal King',
        backgroundImage: p6,

        // sender message
        bubbleColor: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 shadow-[0_0_12px_rgba(234,179,8,0.7)]',

        // received message
        receivedColor: 'bg-black/40 backdrop-blur-xl border border-yellow-500/20',

        // sender text
        textColor: 'text-black font-semibold',

        // received text
        receivedTextColor: 'text-yellow-100',

        isDark: true
    },
    {
    id: 'theme7',
    name: 'Gangster Cat',
    backgroundImage: p7,

    // sender bubble
    bubbleColor: 'bg-white/90',

    // received bubble
    receivedColor: 'bg-black/40 backdrop-blur-xl border border-white/10',

    // sender text
    textColor: 'text-black font-semibold',

    // received text
    receivedTextColor: 'text-white/90',

    isDark: true
},
{
    id: 'theme8',
    name: 'Dark Eyes',
    backgroundImage: p8,

    // sender bubble
    bubbleColor: 'bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.2)]',

    // received bubble
    receivedColor: 'bg-black/50 backdrop-blur-xl border border-white/10',

    // sender text
    textColor: 'text-black font-semibold',

    // received text
    receivedTextColor: 'text-white/90',

    isDark: true
},
{
    id: 'theme9',
    name: 'Apple Dark',
    backgroundImage: p9,

    // sender bubble (gradient)
    bubbleColor: 'bg-gradient-to-r from-gray-700 via-gray-800 to-black shadow-[0_0_10px_rgba(0,0,0,0.6)]',

    // received bubble
    receivedColor: 'bg-white/10 backdrop-blur-xl border border-white/10',

    // sender text
    textColor: 'text-white font-medium',

    // received text
    receivedTextColor: 'text-white/90',

    isDark: true
}
];
