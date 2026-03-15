import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { setAuthUser, setToken } from '@/redux/authSlice';
import api from '@/api';
import { toast } from 'sonner';

const ACCOUNTS_KEY = 'metagram_accounts';

const SwitchAccountModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector(store => store.auth);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setAccounts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAccounts([]);
    }
  }, [isOpen]);

  const handleSwitch = (account) => {
    if (!account?.user) return;
    dispatch(setAuthUser(account.user));
    if (account.token) {
      dispatch(setToken(account.token));
    }
    toast.success(`Switched to @${account.username || account.user?.username}`);
    onClose();
    navigate('/');
  };

  const handleLogoutCurrent = async () => {
    try {
      const res = await api.get('/user/logout');
      if (res.data.success) {
        dispatch(setAuthUser(null));
        dispatch(setToken(null));
        toast.success(res.data.message || 'Logged out from this account');
        onClose();
        navigate('/login');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to logout');
    }
  };

  const handleAddAccount = () => {
    // Clear current auth state so /login does NOT auto-redirect
    dispatch(setAuthUser(null));
    dispatch(setToken(null));
    onClose();
    navigate('/login');
  };

  const currentAccount = accounts.find(acc => acc.userId === currentUser?._id) || null;
  const otherAccounts = accounts.filter(acc => acc.userId !== currentUser?._id);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm sm:rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-gray-100">
          <DialogTitle className="text-center text-sm font-black tracking-[0.18em] uppercase text-gray-800">
            Switch Accounts
          </DialogTitle>
          <DialogDescription className="sr-only">
            Quickly switch between your saved Metagram accounts
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 flex flex-col gap-4">
          {currentAccount && (
            <div className="mb-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-white shadow-sm">
                  <AvatarImage src={currentAccount.profilePicture || currentUser?.profilePicture} alt="current" className="object-cover" />
                  <AvatarFallback className="bg-white text-indigo-500 font-bold">
                    {(currentAccount.username || currentUser?.username || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-[13px] font-bold text-gray-900 leading-tight">
                    {currentAccount.username || currentUser?.username}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wide">
                    Current account
                  </span>
                </div>
              </div>
            </div>
          )}
          {otherAccounts.length === 0 && (
            <div className="py-6 text-center text-[13px] text-gray-400">
              No other accounts saved yet.
            </div>
          )}

          {otherAccounts.map(account => (
            <button
              key={account.userId}
              onClick={() => handleSwitch(account)}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 border border-gray-100">
                  <AvatarImage src={account.profilePicture} alt="account" className="object-cover" />
                  <AvatarFallback className="bg-gray-100 text-gray-800 font-bold">
                    {(account.username || account.user?.username || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-[13px] font-bold text-gray-900 leading-tight">
                    {account.username || account.user?.username}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {account.email || account.user?.email}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#3b82f6] uppercase tracking-wide">
                Switch
              </span>
            </button>
          ))}

          <div className="mt-1 flex flex-col gap-2">
            <button
              onClick={handleAddAccount}
              className="w-full py-2.5 text-[13px] font-bold rounded-xl border border-gray-200 text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              Add account
            </button>
            <button
              onClick={handleLogoutCurrent}
              className="w-full py-2.5 text-[13px] font-bold rounded-xl border border-red-100 text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              Log out from this account
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SwitchAccountModal;

