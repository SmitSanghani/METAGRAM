import { useWebRTC as useWebRTCContext } from '../context/WebRTCContext';

/**
 * Hook for WebRTC calling functionality.
 * This now redirects to the global WebRTCContext to ensure all components
 * share the same connection state and media streams.
 */
export const useWebRTC = () => {
    return useWebRTCContext();
};
