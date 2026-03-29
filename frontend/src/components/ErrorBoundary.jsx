import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw, Home, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';

const ErrorBoundary = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  
  console.error("Application Error:", error);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 relative">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
          <AlertTriangle size={40} className="text-red-500 relative z-10" />
        </div>

        {/* Text Content */}
        <h1 className="text-2xl font-black text-[#262626] mb-3 tracking-tight">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-8">
          The application encountered an unexpected error. Don't worry, your data is safe. Try refreshing or navigating back home.
        </p>

        {/* Error Detail (Mini) */}
        {error && (
          <div className="w-full bg-gray-50 rounded-2xl p-4 mb-8 text-left border border-gray-100">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1">Error Detail</p>
            <p className="text-[13px] text-gray-600 font-mono break-all line-clamp-2">
              {error.message || error.statusText || "Unknown Error"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3 w-full">
          <Button 
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RefreshCcw size={18} />
            Refresh App
          </Button>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="h-12 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Home size={18} />
              Home
            </Button>
            <Button 
              onClick={() => navigate('/chat')}
              variant="outline"
              className="h-12 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <MessageSquare size={18} />
              Chat
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-[11px] font-bold text-gray-300 uppercase tracking-[0.2em]">
          Metagram System Protection
        </p>
      </div>
    </div>
  );
};

export default ErrorBoundary;
