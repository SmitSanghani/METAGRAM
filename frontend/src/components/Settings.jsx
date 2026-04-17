import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TrendingUp, BarChart2, User, Bell, Moon, Sun, ChevronRight, Activity as ActivityIcon, Key, UserX, Trash2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import YourActivity from './YourActivity';
import BlockedAccounts from './BlockedAccounts';
import ReactECharts from 'echarts-for-react';
import { setAuthUser, setToken } from '@/redux/authSlice';
import api from '@/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const Settings = () => {
    const [activeSection, setActiveSection] = useState('insights');
    const { user } = useSelector(store => store.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handlePrivacyToggle = async (checked) => {
        try {
            const formData = new FormData();
            formData.append('isPrivate', checked);
            
            const res = await api.post('/user/profile/edit', formData);
            if (res.data.success) {
                setIsPrivate(checked);
                dispatch(setAuthUser({ ...user, isPrivate: checked }));
                toast.success(`Account is now ${checked ? 'private' : 'public'}`);
            }
        } catch (error) {
            toast.error("Failed to update privacy settings");
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== `@${user?.username}`) {
            toast.error("Username does not match correctly.");
            return;
        }

        try {
            setIsDeleting(true);
            const res = await api.delete('/user/delete-account');
            if (res.data.success) {
                toast.success("Account deleted successfully");
                dispatch(setAuthUser(null));
                dispatch(setToken(null));
                localStorage.removeItem('token');
                localStorage.removeItem('metagram_accounts');
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete account");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const menuItems = [
        { id: 'insights', icon: <BarChart2 size={20} />, label: 'Follower Insights' },
        { id: 'activity', icon: <ActivityIcon size={20} />, label: 'Your Activity' },
        { id: 'account', icon: <User size={20} />, label: 'Account Settings' },
        { id: 'blocked', icon: <UserX size={20} />, label: 'Blocked Accounts' },
        { id: 'danger', icon: <Trash2 size={20} />, label: 'Danger Zone', className: 'text-rose-500 hover:bg-rose-50 hover:text-rose-600' },
    ];

    // Mock Followers Growth Data for ECharts
    const getFollowersOption = () => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
        // Generate some realistic growth data based on actual follower count
        const currentFollowers = user?.followers?.length || 0;
        const data = [10, 25, 45, 80, 120, 180, 250, currentFollowers + 300].slice(0, months.length);
        
        return {
            title: {
                text: 'Follower Growth',
                left: 'center',
                textStyle: {
                    color: '#111827',
                    fontWeight: 'bold',
                    fontSize: 16
                }
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                textStyle: { color: '#111827' },
                borderWidth: 1,
                borderColor: '#e5e7eb'
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: months,
                axisLine: { lineStyle: { color: '#e5e7eb' } },
                axisLabel: { color: '#6b7280' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#f3f4f6' } },
                axisLabel: { color: '#6b7280' }
            },
            series: [{
                name: 'Followers',
                type: 'line',
                smooth: true,
                data: data,
                itemStyle: { color: '#3b82f6' },
                lineStyle: { width: 3, shadowColor: 'rgba(59, 130, 246, 0.3)', shadowBlur: 10, shadowOffsetY: 5 },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                        ]
                    }
                },
                symbol: 'circle',
                symbolSize: 8
            }]
        };
    };

    const getDistributionOption = () => {
        return {
            title: {
                text: 'Follower Distribution',
                left: 'center',
                top: 10,
                textStyle: { fontSize: 16, fontWeight: 'bold' }
            },
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'center',
                padding: [0, 0, 0, 20]
            },
            series: [
                {
                    name: 'Followers',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 20,
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: [
                        { value: 45, name: 'Male', itemStyle: { color: '#3b82f6' } },
                        { value: 55, name: 'Female', itemStyle: { color: '#ec4899' } }
                    ]
                }
            ]
        };
    };

    return (
        <div className='flex justify-center w-full min-h-screen bg-[#f8fafc] sm:pt-8 pt-0 px-0 sm:px-4 md:px-8'>
            <div className='flex w-full max-w-[1200px] bg-white sm:rounded-3xl rounded-none sm:shadow-xl shadow-none overflow-hidden border-0 sm:border border-gray-100 mb-10'>
                {/* Settings Sidebar */}
                <div className='w-[320px] border-r border-gray-100 bg-gray-50/50 p-6 hidden md:block'>
                    <h2 className='text-xl font-bold text-gray-900 mb-8 px-2'>Settings</h2>
                    <div className='flex flex-col gap-2'>
                        {menuItems.map((item) => (
                            <button
                                 key={item.id}
                                 onClick={() => setActiveSection(item.id)}
                                 className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                                     activeSection === item.id 
                                     ? activeSection === 'danger' ? 'bg-rose-50 text-rose-600 font-bold' : 'bg-[#3b82f6]/10 text-[#3b82f6] font-bold' 
                                     : item.className || 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                 }`}
                             >
                                 {activeSection === item.id && (
                                     <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${activeSection === 'danger' ? 'bg-rose-500' : 'bg-[#3b82f6]'} rounded-r-full`} />
                                 )}
                                 <div className={`transition-transform duration-200 ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                     {item.icon}
                                 </div>
                                 <span className="text-[15px]">{item.label}</span>
                                 {activeSection === item.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
                             </button>
                         ))}
                     </div>
                 </div>
 
                 {/* Main Content Area */}
                 <div className='flex-1 flex flex-col min-h-[700px] bg-white overflow-y-auto'>
                     {activeSection === 'danger' && (
                         <div className='p-4 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-500'>
                             <div className='mb-8 flex items-center gap-4'>
                                 <button 
                                     onClick={() => navigate(-1)}
                                     className='md:hidden p-2 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-all'
                                 >
                                     <ArrowLeft size={20} />
                                 </button>
                                 <div>
                                     <h1 className='text-2xl font-bold text-gray-900'>Danger Zone</h1>
                                     <p className='text-gray-500 text-sm'>Irreversible actions and account deletion.</p>
                                 </div>
                             </div>
 
                             <div className='max-w-2xl'>
                                 <div className='p-8 bg-rose-50 border border-rose-100 rounded-[32px]'>
                                     <div className='flex items-start gap-5'>
                                         <div className='p-4 bg-rose-100 text-rose-600 rounded-2xl'>
                                             <AlertTriangle size={32} />
                                         </div>
                                         <div className='flex-1'>
                                             <h3 className='text-lg font-bold text-rose-900 mb-2'>Delete Account</h3>
                                             <p className='text-rose-700/80 text-[15px] leading-relaxed mb-6'>
                                                 Once you delete your account, there is no going back. All your posts, followers, chat history, and profile data will be permanently wiped from our servers.
                                             </p>
                                             <Button 
                                                 variant="destructive" 
                                                 onClick={() => setShowDeleteModal(true)}
                                                 className="rounded-xl h-12 px-8 font-bold bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200"
                                             >
                                                 Permanently Delete My Account
                                             </Button>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}

                     {showDeleteModal && (
                         <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                             <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                                 <div className="bg-rose-50 p-6 flex flex-col items-center gap-4 border-b border-rose-100">
                                     <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
                                         <Trash2 size={32} />
                                     </div>
                                     <div className="text-center">
                                         <h2 className="text-xl font-bold text-rose-900">Are you absolutely sure?</h2>
                                         <p className="text-sm text-rose-700/70 mt-1">This action cannot be undone.</p>
                                     </div>
                                 </div>
                                 
                                 <div className="p-6 space-y-6">
                                     <div className="space-y-3">
                                         <p className="text-[13px] font-medium text-gray-600">
                                             Please type <span className="font-bold text-gray-900">@{user?.username}</span> to confirm deletion.
                                         </p>
                                         <input 
                                             type="text"
                                             value={deleteConfirmText}
                                             onChange={(e) => setDeleteConfirmText(e.target.value)}
                                             placeholder={`@${user?.username}`}
                                             className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-sm font-medium"
                                         />
                                     </div>

                                     <div className="flex flex-col gap-3">
                                         <Button 
                                             onClick={handleDeleteAccount}
                                             disabled={isDeleting || deleteConfirmText !== `@${user?.username}`}
                                             className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-200 disabled:opacity-50"
                                         >
                                             {isDeleting ? <Loader2 className="animate-spin mr-2" /> : "I understand, delete my account"}
                                         </Button>
                                         <Button 
                                             variant="ghost" 
                                             onClick={() => {
                                                 setShowDeleteModal(false);
                                                 setDeleteConfirmText('');
                                             }}
                                             className="w-full h-12 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                                         >
                                             Cancel
                                         </Button>
                                     </div>
                                 </div>
                             </DialogContent>
                         </Dialog>
                     )}
                    {activeSection === 'insights' && (
                        <div className='p-4 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-500'>
                            <div className='mb-6 sm:mb-8 flex items-center gap-4'>
                                <button 
                                    onClick={() => navigate(-1)}
                                    className='md:hidden p-2 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-all'
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className='text-2xl font-bold text-gray-900'>Follower Insights</h1>
                                    <p className='text-gray-500 text-sm'>Understand your audience and growth.</p>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8'>
                                {/* Growth Chart */}
                                <div className='p-4 sm:p-6 bg-white border border-gray-100 rounded-[20px] sm:rounded-3xl shadow-sm hover:shadow-md transition-shadow'>
                                    <ReactECharts 
                                        option={getFollowersOption()} 
                                        style={{ height: '300px', sm: { height: '350px' }, width: '100%' }}
                                        opts={{ renderer: 'svg' }}
                                    />
                                </div>

                                {/* Distribution Chart */}
                                <div className='p-4 sm:p-6 bg-white border border-gray-100 rounded-[20px] sm:rounded-3xl shadow-sm hover:shadow-md transition-shadow'>
                                    <ReactECharts 
                                        option={getDistributionOption()} 
                                        style={{ height: '300px', sm: { height: '350px' }, width: '100%' }}
                                        opts={{ renderer: 'svg' }}
                                    />
                                </div>

                                {/* Stats Overview */}
                                <div className='lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6'>
                                    {[
                                        { label: 'Total Followers', value: user?.followers?.length || 0, trend: '+12%', color: 'text-blue-600' },
                                        { label: 'Average Engagement', value: '4.8%', trend: '+0.5%', color: 'text-green-600' },
                                        { label: 'Profile Visits', value: '1.2k', trend: '+15%', color: 'text-purple-600' },
                                    ].map((stat, i) => (
                                        <div key={i} className='p-6 bg-gray-50 rounded-3xl border border-gray-100'>
                                            <p className='text-sm font-medium text-gray-500 mb-2'>{stat.label}</p>
                                            <div className='flex items-end gap-3'>
                                                <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.value}</h3>
                                                <span className='text-xs font-bold text-green-500 mb-1'>{stat.trend}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'activity' && (
                        <div className='animate-in fade-in slide-in-from-right-4 duration-500 relative'>
                            <button 
                                onClick={() => navigate(-1)}
                                className='md:hidden fixed top-3 left-4 z-[60] p-2 rounded-full bg-white/80 backdrop-blur-md text-gray-600 shadow-md active:scale-95 transition-all'
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <YourActivity inSettings={true} />
                        </div>
                    )}

                    {activeSection === 'account' && (
                        <div className='p-4 sm:p-8 animate-in fade-in slide-in-from-right-4 duration-500'>
                            <div className='mb-8 flex items-center gap-4'>
                                <button 
                                    onClick={() => navigate(-1)}
                                    className='md:hidden p-2 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-all'
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div>
                                    <h1 className='text-2xl font-bold text-gray-900'>Account Settings</h1>
                                    <p className='text-gray-500 text-sm'>Manage your account security and privacy.</p>
                                </div>
                            </div>

                            <div className='flex flex-col gap-6 max-w-2xl'>
                                <div className='p-6 bg-white border border-gray-100 rounded-3xl shadow-sm'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex-1 pr-8'>
                                            <h3 className='font-bold text-gray-900 mb-1'>Private Account</h3>
                                            <p className='text-sm text-gray-500'>
                                                When your account is public, your profile and posts can be seen by anyone. When private, only the followers you approve can see what you share.
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer scale-110">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isPrivate}
                                                onChange={(e) => handlePrivacyToggle(e.target.checked)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3b82f6]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {activeSection === 'blocked' && (
                        <BlockedAccounts />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
