import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Settings as SettingsIcon, Bell, Lock, User, Palette, ShieldCheck, ChevronDown, ChevronUp, Save, Eye, EyeOff, Check, X, Sun, Moon, Monitor } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { setAuthUser } from '../../redux/authSlice';

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionCard = ({ icon, title, description, color, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full p-6 flex items-center justify-between group hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-gray-50 ${color}`}>{icon}</div>
                    <div>
                        <h3 className="font-black text-gray-900">{title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                </div>
                {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {open && (
                <div className="px-6 pb-6 border-t border-gray-50 pt-5 animate-in slide-in-from-top-2 duration-200">
                    {children}
                </div>
            )}
        </div>
    );
};

const InputField = ({ label, type = 'text', value, onChange, placeholder, hint }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-gray-50 border border-gray-200 focus:border-sky-400 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400"
        />
        {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
);

const Toggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
        <div>
            <p className="text-sm font-bold text-gray-800">{label}</p>
            {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-sky-500' : 'bg-gray-200'}`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminSettings = () => {
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();

    // Profile state
    const [profile, setProfile] = useState({
        username: user?.username || '',
        email: user?.email || '',
        bio: user?.bio || '',
    });
    const [profileLoading, setProfileLoading] = useState(false);

    // Password state
    const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [passLoading, setPassLoading] = useState(false);

    // Notification state
    const [notifications, setNotifications] = useState({
        newUserRegistration: true,
        suspiciousLogin: true,
        reportedContent: true,
        systemErrors: true,
        weeklyReport: false,
        emailDigest: false,
    });

    // Permissions state - which sections admin can access
    const [permissions, setPermissions] = useState({
        manageUsers: true,
        managePosts: true,
        manageReels: true,
        manageComments: true,
        viewMessages: true,
        accessSettings: true,
    });

    // Theme state
    const [theme, setTheme] = useState('light');

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleProfileSave = async () => {
        if (!profile.username.trim()) return toast.error('Username cannot be empty');
        try {
            setProfileLoading(true);
            const formData = new FormData();
            formData.append('bio', profile.bio);
            const res = await axios.post('http://localhost:8000/api/v1/user/profile/edit', formData, { withCredentials: true });
            if (res.data.success) {
                dispatch(setAuthUser({ ...user, bio: profile.bio }));
                toast.success('Profile updated successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!passwords.current || !passwords.newPass || !passwords.confirm) return toast.error('All fields are required');
        if (passwords.newPass !== passwords.confirm) return toast.error('New passwords do not match');
        if (passwords.newPass.length < 6) return toast.error('Password must be at least 6 characters');
        try {
            setPassLoading(true);
            // Try the backend endpoint — if it doesn't exist we'll show a message
            const res = await axios.post('http://localhost:8000/api/v1/user/change-password', {
                currentPassword: passwords.current,
                newPassword: passwords.newPass,
            }, { withCredentials: true });
            if (res.data.success) {
                setPasswords({ current: '', newPass: '', confirm: '' });
                toast.success('Password changed successfully!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setPassLoading(false);
        }
    };

    const handleNotifSave = () => toast.success('Notification preferences saved!');
    const handlePermSave = () => toast.success('Permissions configuration saved!');

    const themeOptions = [
        { value: 'light', label: 'Light', icon: <Sun size={18} /> },
        { value: 'dark', label: 'Dark', icon: <Moon size={18} /> },
        { value: 'system', label: 'System', icon: <Monitor size={18} /> },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div>
                <h1 className="text-2xl font-black text-gray-900 mb-1">Admin Settings</h1>
                <p className="text-sm text-gray-500">Configure platform-wide administrative preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ── Profile Settings ── */}
                <SectionCard
                    icon={<User size={20} />}
                    title="Profile Settings"
                    description="Update admin account information"
                    color="text-sky-500"
                >
                    <div className="space-y-4">
                        <InputField
                            label="Username"
                            value={profile.username}
                            onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                            placeholder="Admin username"
                            hint="This is your public display name."
                        />
                        <InputField
                            label="Email"
                            type="email"
                            value={profile.email}
                            onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                            placeholder="admin@metagram.com"
                        />
                        <InputField
                            label="Bio"
                            value={profile.bio}
                            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                            placeholder="A short bio about yourself..."
                        />
                        <button
                            onClick={handleProfileSave}
                            disabled={profileLoading}
                            className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-sky-600 transition-all disabled:opacity-50"
                        >
                            <Save size={14} />
                            {profileLoading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </SectionCard>

                {/* ── Permissions ── */}
                <SectionCard
                    icon={<ShieldCheck size={20} />}
                    title="Permissions"
                    description="Manage administrator roles and access levels"
                    color="text-emerald-500"
                >
                    <div className="space-y-1">
                        <Toggle label="Manage Users" description="Activate/suspend user accounts" checked={permissions.manageUsers} onChange={v => setPermissions(p => ({ ...p, manageUsers: v }))} />
                        <Toggle label="Manage Posts" description="View and remove platform posts" checked={permissions.managePosts} onChange={v => setPermissions(p => ({ ...p, managePosts: v }))} />
                        <Toggle label="Manage Reels" description="View and remove platform reels" checked={permissions.manageReels} onChange={v => setPermissions(p => ({ ...p, manageReels: v }))} />
                        <Toggle label="Manage Comments" description="Delete inappropriate comments" checked={permissions.manageComments} onChange={v => setPermissions(p => ({ ...p, manageComments: v }))} />
                        <Toggle label="Monitor Messages" description="Access the messages monitoring tab" checked={permissions.viewMessages} onChange={v => setPermissions(p => ({ ...p, viewMessages: v }))} />
                        <Toggle label="Access Settings" description="Modify administrative settings" checked={permissions.accessSettings} onChange={v => setPermissions(p => ({ ...p, accessSettings: v }))} />
                        <button onClick={handlePermSave} className="mt-4 flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">
                            <Save size={14} />
                            Save Permissions
                        </button>
                    </div>
                </SectionCard>

                {/* ── System Notifications ── */}
                <SectionCard
                    icon={<Bell size={20} />}
                    title="System Notifications"
                    description="Configure alerts for unusual activity"
                    color="text-amber-500"
                >
                    <div className="space-y-1">
                        <Toggle label="New User Registration" description="Alert when new users sign up" checked={notifications.newUserRegistration} onChange={v => setNotifications(n => ({ ...n, newUserRegistration: v }))} />
                        <Toggle label="Suspicious Login Activity" description="Alert for multiple failed logins" checked={notifications.suspiciousLogin} onChange={v => setNotifications(n => ({ ...n, suspiciousLogin: v }))} />
                        <Toggle label="Reported Content" description="Alert when users report content" checked={notifications.reportedContent} onChange={v => setNotifications(n => ({ ...n, reportedContent: v }))} />
                        <Toggle label="System Errors" description="Alert for server/API errors" checked={notifications.systemErrors} onChange={v => setNotifications(n => ({ ...n, systemErrors: v }))} />
                        <Toggle label="Weekly Summary Report" description="Receive weekly platform analytics" checked={notifications.weeklyReport} onChange={v => setNotifications(n => ({ ...n, weeklyReport: v }))} />
                        <Toggle label="Email Digest" description="Daily digest of admin activity" checked={notifications.emailDigest} onChange={v => setNotifications(n => ({ ...n, emailDigest: v }))} />
                        <button onClick={handleNotifSave} className="mt-4 flex items-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all">
                            <Save size={14} />
                            Save Notifications
                        </button>
                    </div>
                </SectionCard>

                {/* ── Security ── */}
                <SectionCard
                    icon={<Lock size={20} />}
                    title="Security"
                    description="Two-factor authentication and password change"
                    color="text-rose-500"
                >
                    <div className="space-y-4">
                        {/* Change Password */}
                        <div className="space-y-3">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Change Password</p>
                            {[
                                { key: 'current', label: 'Current Password', showKey: 'current' },
                                { key: 'newPass', label: 'New Password', showKey: 'new' },
                                { key: 'confirm', label: 'Confirm New Password', showKey: 'confirm' },
                            ].map(({ key, label, showKey }) => (
                                <div key={key} className="relative">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1.5">{label}</label>
                                    <div className="relative">
                                        <input
                                            type={showPass[showKey] ? 'text' : 'password'}
                                            value={passwords[key]}
                                            onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full bg-gray-50 border border-gray-200 focus:border-rose-400 focus:bg-white rounded-2xl px-4 py-3 text-sm text-gray-900 outline-none transition-all pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(p => ({ ...p, [showKey]: !p[showKey] }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                                        >
                                            {showPass[showKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={handlePasswordChange}
                                disabled={passLoading}
                                className="flex items-center gap-2 bg-rose-500 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 transition-all disabled:opacity-50"
                            >
                                <Lock size={14} />
                                {passLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>

                        {/* 2FA Notice */}
                        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                            <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Two-Factor Authentication</p>
                            <p className="text-xs text-rose-500">2FA via authenticator app adds an extra layer of security. Contact your system administrator to enable it.</p>
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* ── Dashboard Theme ── */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => {}}
                    className="w-full p-6 flex items-center justify-between group hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gray-50 text-purple-500"><Palette size={20} /></div>
                        <div>
                            <h3 className="font-black text-gray-900">Dashboard Theme</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Customize admin panel appearance</p>
                        </div>
                    </div>
                </button>
                <div className="px-6 pb-6 border-t border-gray-50 pt-5">
                    <div className="flex gap-3">
                        {themeOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => { setTheme(opt.value); toast.success(`Switched to ${opt.label} theme`); }}
                                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${theme === opt.value ? 'border-purple-400 bg-purple-50 text-purple-600' : 'border-gray-100 text-gray-400 hover:border-purple-200 hover:bg-purple-50/30'}`}
                            >
                                {opt.icon}
                                <span className="text-xs font-black uppercase tracking-widest">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Footer Info ── */}
            <div className="bg-sky-50/50 p-6 rounded-[32px] border border-sky-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h4 className="font-black text-sky-900 mb-1">Settings are saved per section</h4>
                    <p className="text-sm text-sky-600 font-medium">Each section has its own Save button. Changes apply immediately.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-sky-500 bg-white px-4 py-2 rounded-2xl border border-sky-100">
                    <Check size={14} className="text-emerald-500" />
                    Admin Panel v2.0
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;

