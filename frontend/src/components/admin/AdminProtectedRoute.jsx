import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
    const { user } = useSelector(store => store.auth);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate("/admin/login");
        } else if (user.role !== 'admin') {
            navigate("/");
        }
    }, [user, navigate]);

    // Show nothing while checking/redirecting if user is not an admin
    if (!user || user.role !== 'admin') {
        return null;
    }

    return <>{children}</>;
};

export default AdminProtectedRoute;
