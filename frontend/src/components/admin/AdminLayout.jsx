import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

const AdminLayout = () => {
    return (
        <div className="min-h-screen bg-white">
            <AdminNavbar />
            <div className="flex">
                <AdminSidebar />
                <main className="flex-1 bg-gray-50/50 p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
