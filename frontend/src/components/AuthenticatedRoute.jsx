import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

const AuthenticatedRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const location = useLocation();
    const isLinkFlow = location.search.includes('link=true');
    
    if (user && !isLinkFlow) {
        return <Navigate to="/animation" replace />;
    }
    
    return children;
}

export default AuthenticatedRoute;
