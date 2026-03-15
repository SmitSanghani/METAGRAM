import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/login");
        } else if (user.role !== 'admin' || user.email !== 'admin@gmail.com') {
            navigate("/");
        }
    }, [user, navigate]);

    // Show nothing while checking/redirecting if user is not authorized
    if (!user || user.role !== 'admin' || user.email !== 'admin@gmail.com') {
        return null;
    }

    return <>{children}</>;
};

export default AdminProtectedRoute;
