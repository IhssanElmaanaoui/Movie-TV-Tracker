import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import {
  Users, Shield, Activity, UserX, UserCheck, ShieldOff,
  Trash2, Lock, Unlock, Pin, X, AlertCircle, CheckCircle,
  RefreshCw, Search, ChevronDown
} from 'lucide-react';
import adminService from '../services/adminService';
import { userStorage } from '../services/authService';

const getUserStatus = (u) => {
  if (!u.isActive) return 'BANNED';
  if (u.isSuspended) return 'SUSPENDED';
  if (u.role === 'ADMIN') return 'ADMIN';
  return 'ACTIVE';
};

const STATUS_CONFIG = {
  ACTIVE:    { label: 'Active',    className: 'bg-green-500/10 text-green-400 border border-green-500/20' },
  SUSPENDED: { label: 'Suspended', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
  BANNED:    { label: 'Banned',    className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  ADMIN:     { label: 'Admin',     className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20' },
};

function Toast({ message, type, onClose }) {
  return (
    <div className={`fixed top-24 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border text-sm font-medium animate-fadeIn max-w-sm
      ${type === 'success' ? 'bg-gray-900 border-green-500/40 text-white' : 'bg-gray-900 border-red-500/40 text-white'}`}>
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
        : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function AdminCommunityMonitor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'users');

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // userId being acted on

  const [toast, setToast] = useState(null);
  const [moderationLog, setModerationLog] = useState([]);

  // Modals
  const [suspendModal, setSuspendModal] = useState(null);
  const [banModal, setBanModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendHours, setSuspendHours] = useState(24);
  const [banReason, setBanReason] = useState('');

  // Add Admin form
  const [addAdminForm, setAddAdminForm] = useState({ username: '', email: '', password: '' });
  const [addAdminError, setAddAdminError] = useState(null);
  const [addAdminLoading, setAddAdminLoading] = useState(false);

  const stompClientRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Guard
  useEffect(() => {
    const u = userStorage.getUser();
    if (!u?.id || u.role !== 'ADMIN') navigate('/');
  }, [navigate]);

  // Load users
  const loadUsers = () => {
    setLoading(true);
    adminService.getAllUsers()
      .then(r => { setUsers(r.data); setFilteredUsers(r.data); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  // Filter users when search/filter changes
  useEffect(() => {
    let result = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(u => getUserStatus(u) === statusFilter);
    }
    setFilteredUsers(result);
  }, [search, statusFilter, users]);

  // WebSocket
  useEffect(() => {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', '');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/admin/moderation', (msg) => {
          const action = JSON.parse(msg.body);
          const now = new Date();
          setModerationLog(prev => [
            { ...action, time: now.toLocaleTimeString() },
            ...prev.slice(0, 49),
          ]);
          setUsers(prev => prev.map(u => {
            if (u.id !== action.userId) return u;
            if (action.action === 'SUSPENDED') return { ...u, isSuspended: true, suspendedUntil: action.suspendedUntil, banReason: action.reason };
            if (action.action === 'BANNED')    return { ...u, isActive: false, isSuspended: false, banReason: action.reason };
            if (action.action === 'UNBANNED')  return { ...u, isActive: true, isSuspended: false, suspendedUntil: null, banReason: null };
            return u;
          }));
        });
      },
    });
    client.activate();
    stompClientRef.current = client;
    return () => client.deactivate();
  }, []);

  // Actions
  const handleSuspend = async () => {
    if (!suspendReason.trim()) return;
    setActionLoading(suspendModal.userId);
    try {
      await adminService.suspendUser(suspendModal.userId, suspendReason, suspendHours);
      setSuspendModal(null); setSuspendReason(''); setSuspendHours(24);
      showToast(`@${suspendModal.username} suspended for ${suspendHours}h`);
    } catch(e) { showToast(e.response?.data?.message || 'Failed to suspend', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleBan = async () => {
    if (!banReason.trim()) return;
    setActionLoading(banModal.userId);
    try {
      await adminService.banUser(banModal.userId, banReason);
      setBanModal(null); setBanReason('');
      showToast(`@${banModal.username} has been permanently banned`);
    } catch(e) { showToast(e.response?.data?.message || 'Failed to ban', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleUnban = async (u) => {
    setActionLoading(u.id);
    try {
      await adminService.unbanUser(u.id);
      showToast(`@${u.username} restrictions lifted`);
    } catch(e) { showToast(e.response?.data?.message || 'Failed to unban', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddAdminError(null);
    setAddAdminLoading(true);
    try {
      const r = await adminService.addAdmin(addAdminForm);
      setUsers(prev => [r.data, ...prev]);
      setAddAdminForm({ username: '', email: '', password: '' });
      showToast(`Admin @${r.data.username} created successfully`);
      setTab('users');
    } catch(e) { setAddAdminError(e.response?.data?.message || 'Failed to create admin'); }
    finally { setAddAdminLoading(false); }
  };

  const currentUser = userStorage.getUser();

  return (
    <div className="min-h-screen bg-slate-950 pt-28 pb-20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Community Monitor</h1>
              <span className="bg-purple-600/20 text-purple-400 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide border border-purple-600/30">
                Admin
              </span>
            </div>
            <p className="text-gray-400 text-sm">{users.length} total members</p>
          </div>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 bg-gray-900 border border-gray-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-gray-400 hover:text-white text-sm font-medium px-4 py-2 rounded-md transition-colors hover:bg-gray-800"
          >
            Dashboard
          </button>
          {['users', 'add-admin', 'log'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              {t === 'users' ? 'Users' : t === 'add-admin' ? 'Add Admin' : (
                <span className="flex items-center gap-2">
                  Live Log
                  {moderationLog.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {moderationLog.length > 9 ? '9+' : moderationLog.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ─────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg text-sm focus:outline-none focus:border-purple-600"
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="BANNED">Banned</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="p-16 text-center text-gray-400">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-16 text-center">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Joined</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map(u => {
                      const status = getUserStatus(u);
                      const sc = STATUS_CONFIG[status];
                      const isMe = String(u.id) === String(currentUser?.id);
                      const busy = actionLoading === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-400 text-xs font-bold">{u.username[0].toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{u.username}</p>
                                <p className="text-gray-500 text-xs sm:hidden">{u.email}</p>
                                {u.banReason && <p className="text-red-400 text-xs mt-0.5 truncate max-w-[150px]">Reason: {u.banReason}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-gray-400 text-sm">{u.email}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.className}`}>
                                {sc.label}
                              </span>
                              {u.isSuspended && u.suspendedUntil && (
                                <p className="text-gray-500 text-xs mt-1">
                                  Until {new Date(u.suspendedUntil).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-gray-500 text-sm">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isMe || status === 'ADMIN' ? (
                              <span className="text-gray-600 text-xs flex justify-end">Protected</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {status === 'ACTIVE' && (
                                  <>
                                    <button
                                      onClick={() => { setSuspendModal({ userId: u.id, username: u.username }); setSuspendReason(''); setSuspendHours(24); }}
                                      disabled={busy}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                      title="Suspend user"
                                    >
                                      <ShieldOff className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Suspend</span>
                                    </button>
                                    <button
                                      onClick={() => { setBanModal({ userId: u.id, username: u.username }); setBanReason(''); }}
                                      disabled={busy}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                      title="Ban user"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Ban</span>
                                    </button>
                                  </>
                                )}
                                {status === 'SUSPENDED' && (
                                  <>
                                    <button
                                      onClick={() => { setBanModal({ userId: u.id, username: u.username }); setBanReason(''); }}
                                      disabled={busy}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Ban</span>
                                    </button>
                                    <button
                                      onClick={() => handleUnban(u)}
                                      disabled={busy}
                                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Lift</span>
                                    </button>
                                  </>
                                )}
                                {status === 'BANNED' && (
                                  <button
                                    onClick={() => handleUnban(u)}
                                    disabled={busy}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-40"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    {busy ? 'Lifting...' : <><span className="hidden sm:inline">Unban</span></>}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer count */}
            {!loading && (
              <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
                Showing {filteredUsers.length} of {users.length} users
              </div>
            )}
          </div>
        )}

        {/* ── ADD ADMIN TAB ──────────────────────────────────── */}
        {tab === 'add-admin' && (
          <div className="max-w-lg">
            <div className="bg-gray-900 border border-gray-700 rounded-lg">
              <div className="p-5 border-b border-gray-700">
                <h2 className="text-white font-semibold">Create Admin Account</h2>
                <p className="text-gray-400 text-sm mt-1">New admin will have full moderation access</p>
              </div>
              <form onSubmit={handleAddAdmin} className="p-5 space-y-4">
                {addAdminError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{addAdminError}
                  </div>
                )}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Username</label>
                  <input
                    required
                    value={addAdminForm.username}
                    onChange={e => setAddAdminForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="adminuser"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Email</label>
                  <input
                    required type="email"
                    value={addAdminForm.email}
                    onChange={e => setAddAdminForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="admin@example.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Password</label>
                  <input
                    required type="password"
                    value={addAdminForm.password}
                    onChange={e => setAddAdminForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddAdminForm({ username: '', email: '', password: '' })}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={addAdminLoading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addAdminLoading ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── LIVE LOG TAB ──────────────────────────────────── */}
        {tab === 'log' && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Real-time Moderation Log</h2>
                <p className="text-gray-400 text-sm mt-0.5">Actions appear instantly via WebSocket</p>
              </div>
              {moderationLog.length > 0 && (
                <button
                  onClick={() => setModerationLog([])}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {moderationLog.length === 0 ? (
              <div className="p-16 text-center">
                <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No moderation actions yet</p>
                <p className="text-gray-600 text-xs mt-1">Actions will appear here in real time</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {moderationLog.map((entry, i) => {
                  const actionColors = {
                    SUSPENDED: 'text-yellow-400',
                    BANNED: 'text-red-400',
                    UNBANNED: 'text-green-400',
                  };
                  return (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/40 transition-colors">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        entry.action === 'BANNED' ? 'bg-red-400' :
                        entry.action === 'SUSPENDED' ? 'bg-yellow-400' : 'bg-green-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <span className="text-gray-400">Admin #{entry.performedByAdminId}</span>
                          {' '}
                          <span className={`font-semibold ${actionColors[entry.action] || 'text-white'}`}>
                            {entry.action.toLowerCase()}
                          </span>
                          {' '}
                          <span className="font-medium">@{entry.username}</span>
                          {entry.reason && (
                            <span className="text-gray-500"> — {entry.reason}</span>
                          )}
                        </p>
                      </div>
                      <span className="text-gray-600 text-xs flex-shrink-0">{entry.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SUSPEND MODAL ───────────────────────────────────── */}
      {suspendModal && (
        <Modal title={`Suspend @${suspendModal.username}`} onClose={() => setSuspendModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Reason <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Spam, inappropriate content..."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Duration (hours)</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {[1, 6, 24, 72, 168].map(h => (
                  <button key={h} onClick={() => setSuspendHours(h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${suspendHours === h ? 'bg-purple-600 border-purple-600 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'}`}>
                    {h < 24 ? `${h}h` : `${h/24}d`}
                  </button>
                ))}
              </div>
              <input
                type="number" min="1"
                value={suspendHours}
                onChange={e => setSuspendHours(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-600"
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setSuspendModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || actionLoading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Suspending...' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── BAN MODAL ──────────────────────────────────────── */}
      {banModal && (
        <Modal title={`Permanently Ban @${banModal.username}`} onClose={() => setBanModal(null)}>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
              ⚠️ This will permanently disable the account. The user will not be able to log in or post.
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">Reason <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="e.g. Harassment, repeated violations..."
                className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || actionLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? 'Banning...' : 'Confirm Permanent Ban'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
