import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

const AuthenticatedRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    
    if (user) {
        return <Navigate to="/" replace />;
    }
    
    return children;
}

export default AuthenticatedRoute;
