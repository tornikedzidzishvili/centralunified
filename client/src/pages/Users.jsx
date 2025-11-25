import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, UserPlus, Building2, Users as UsersIcon, Pencil, Trash2, X, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Users({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', role: 'officer', branches: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [changingPasswordUser, setChangingPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.username.trim()) return;
    setLoading(true);
    try {
      await api.post('/users', newUser);
      fetchUsers();
      setNewUser({ username: '', role: 'officer', branches: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await api.post('/users', editingUser);
      fetchUsers();
      setEditingUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (e) {
      alert('Cannot delete user: ' + e.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('პაროლები არ ემთხვევა');
      return;
    }
    
    if (newPassword.length < 4) {
      setPasswordError('პაროლი უნდა იყოს მინიმუმ 4 სიმბოლო');
      return;
    }
    
    setLoading(true);
    try {
      await api.post(`/users/${changingPasswordUser.id}/change-password`, { 
        newPassword, 
        adminId: user.id 
      });
      alert('პაროლი წარმატებით შეიცვალა');
      setChangingPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setPasswordError(e.response?.data?.error || 'შეცდომა პაროლის შეცვლისას');
    } finally {
      setLoading(false);
    }
  };

  const verifyADUser = async () => {
    if (!newUser.username.trim()) {
      setVerifyResult({ success: false, message: 'შეიყვანეთ მომხმარებლის სახელი' });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await api.post('/users/verify-ad', { username: newUser.username });
      setVerifyResult(res.data);
      // If found, optionally update the username to the AD sAMAccountName
      if (res.data.success && res.data.user?.sAMAccountName) {
        setNewUser(prev => ({ ...prev, username: res.data.user.sAMAccountName }));
      }
    } catch (e) {
      setVerifyResult({ success: false, message: 'ვერიფიკაცია ვერ მოხერხდა' });
    } finally {
      setVerifying(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      officer: 'bg-green-100 text-green-700'
    };
    return badges[role] || 'bg-slate-100 text-slate-700';
  };

  const branchOptions = [
    'საბურთალოს სერვისცენტრი',
    'გლდანის ფილიალი',
    'დიდუბის ფილიალი',
    'ბათუმის ფილიალი',
    'All'
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Central MFO</h1>
                <p className="text-xs text-slate-500">User Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <ArrowLeft size={16} /> Dashboard
              </Link>
              <button onClick={onLogout} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add User Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Add New User</h2>
          </div>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username (AD)</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white" 
                    placeholder="e.g. t.genelidze" 
                    value={newUser.username} 
                    onChange={e => { setNewUser({...newUser, username: e.target.value}); setVerifyResult(null); }} 
                    required
                  />
                  <button
                    type="button"
                    onClick={verifyADUser}
                    disabled={verifying || !newUser.username.trim()}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="შეამოწმეთ AD-ში"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
                {verifyResult && (
                  <div className={`mt-2 text-sm flex items-center gap-1 ${verifyResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {verifyResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {verifyResult.message}
                    {verifyResult.user?.displayName && <span className="text-slate-500 ml-1">({verifyResult.user.displayName})</span>}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white" 
                  value={newUser.role} 
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="officer">Credit Officer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branches</label>
                <select 
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white" 
                  value={newUser.branches} 
                  onChange={e => setNewUser({...newUser, branches: e.target.value})}
                >
                  <option value="">Select branch...</option>
                  {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">Or type multiple: Branch1, Branch2</p>
              </div>
              <div className="flex items-end">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Add User'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Edit User: {editingUser.username}</h3>
                <button onClick={() => setEditingUser(null)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleEditUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    value={editingUser.role} 
                    onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  >
                    <option value="officer">Credit Officer</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branches</label>
                  <select 
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    value={editingUser.branches} 
                    onChange={e => setEditingUser({...editingUser, branches: e.target.value})}
                  >
                    <option value="">Select branch...</option>
                    {branchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {changingPasswordUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">პაროლის შეცვლა: {changingPasswordUser.username}</h3>
                <button onClick={() => { setChangingPasswordUser(null); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ახალი პაროლი</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">გაიმეორეთ პაროლი</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={4}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setChangingPasswordUser(null); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50">
                    გაუქმება
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50">
                    {loading ? 'იცვლება...' : 'შეცვლა'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">All Users</h3>
            <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-sm">{users.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Branches</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-200' : u.role === 'manager' ? 'bg-blue-200' : 'bg-slate-200'}`}>
                          <span className="text-sm font-medium text-slate-600">{u.username[0].toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-800">{u.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadge(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.branches || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setEditingUser(u)} 
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {user.role === 'admin' && (
                          <button 
                            onClick={() => setChangingPasswordUser(u)} 
                            className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="პაროლის შეცვლა"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteUser(u.id, u.username)} 
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                          disabled={u.username === user.username}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
