import { useEffect, useState } from 'react';
import api from '../api';
import { CheckCircle, XCircle, Eye, Users, LogOut, FileText, Building2, RefreshCw, X, UserPlus, Calendar, TrendingUp, Clock, ThumbsUp, ThumbsDown, Settings, Lock, ShieldCheck, Search, ChevronLeft, ChevronRight, Hand, Bell, Phone, CreditCard, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ user, onLogout }) {
  const [loans, setLoans] = useState([]);
  const [users, setUsers] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [assigningLoan, setAssigningLoan] = useState(null);
  const [closingLoan, setClosingLoan] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [stats, setStats] = useState({ today: 0, month: 0, pending: 0, approved: 0, rejected: 0 });
  const [logoUrl, setLogoUrl] = useState('');
  const [noBranches, setNoBranches] = useState(false);
  
  // Pagination and search
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Assignment requests (for manager/admin)
  const [assignmentRequests, setAssignmentRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  
  // Loan search modal
  const [showLoanSearch, setShowLoanSearch] = useState(false);
  const [loanSearchMobile, setLoanSearchMobile] = useState('');
  const [loanSearchIdLast4, setLoanSearchIdLast4] = useState('');
  const [loanSearchResult, setLoanSearchResult] = useState(null);
  const [loanSearchLoading, setLoanSearchLoading] = useState(false);
  const [loanSearchError, setLoanSearchError] = useState('');

  useEffect(() => {
    fetchLoans();
    fetchLastSync();
    fetchStats();
    fetchLogo();
    if (user.role === 'manager' || user.role === 'admin') {
      fetchUsers();
      fetchAssignmentRequests();
    }
  }, [page, search]);

  const fetchLogo = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.logoUrl) {
        // Remove /api from URL for static file access
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api$/, '');
        setLogoUrl(`${baseUrl}${res.data.logoUrl}`);
      }
    } catch (e) {}
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/loans', { 
        params: { 
          userId: user.id, 
          role: user.role, 
          branches: user.branches,
          page,
          limit: 20,
          search
        } 
      });
      setLoans(res.data.loans);
      setPagination(res.data.pagination);
      setNoBranches(res.data.noBranches || false);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAssignmentRequests = async () => {
    try {
      const res = await api.get('/assignment-requests', { params: { branches: user.branches } });
      setAssignmentRequests(res.data);
    } catch (e) {
      console.error('Failed to fetch assignment requests');
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };
  
  const requestLoan = async (loanId) => {
    try {
      await api.post(`/loans/${loanId}/take`, { userId: user.id });
      alert('განაცხადი წარმატებით აიღეთ');
      fetchLoans();
    } catch (e) {
      alert(e.response?.data?.error || 'ვერ მოხერხდა');
    }
  };
  
  const handleAssignmentRequest = async (requestId, action) => {
    try {
      await api.post(`/assignment-requests/${requestId}/handle`, { 
        action, 
        handledById: user.id 
      });
      fetchAssignmentRequests();
      fetchLoans();
    } catch (e) {
      alert('შეცდომა: ' + e.message);
    }
  };

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
    // Filter officers for assignment
    setOfficers(res.data.filter(u => u.role === 'officer'));
  };

  const fetchLastSync = async () => {
    try {
      const res = await api.get('/sync/status');
      setLastSync(res.data.lastSyncTime);
    } catch (e) {
      console.error('Failed to fetch sync status');
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      params.append('role', user.role);
      params.append('branches', user.branches || '');
      const res = await api.get(`/loans/stats?${params.toString()}`);
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch stats');
    }
  };



  const assignLoan = async (loanId, officerId) => {
    try {
      await api.post(`/loans/${loanId}/assign`, { userId: officerId });
      fetchLoans();
      setAssigningLoan(null);
    } catch (e) {
      alert('Assignment failed: ' + e.message);
    }
  };

  const updateLoanStatus = async (loanId, status) => {
    try {
      await api.post(`/loans/${loanId}/status`, { status, userId: user.id });
      fetchLoans();
      fetchStats();
      setClosingLoan(null);
      setSelectedLoan(null);
    } catch (e) {
      alert('Status update failed: ' + e.message);
    }
  };

  const handleLoanSearch = async (e) => {
    e.preventDefault();
    if (!loanSearchMobile || !loanSearchIdLast4) {
      setLoanSearchError('შეავსეთ ორივე ველი');
      return;
    }
    if (loanSearchIdLast4.length !== 4) {
      setLoanSearchError('პირადი ნომრის ბოლო 4 ციფრი უნდა იყოს');
      return;
    }
    
    setLoanSearchLoading(true);
    setLoanSearchError('');
    setLoanSearchResult(null);
    
    try {
      const res = await api.get(`/loans/search-secure?mobile=${encodeURIComponent(loanSearchMobile)}&idLast4=${encodeURIComponent(loanSearchIdLast4)}`);
      if (res.data.found) {
        setLoanSearchResult(res.data.loan);
      } else {
        setLoanSearchError('განაცხადი ვერ მოიძებნა');
      }
    } catch (e) {
      setLoanSearchError('ძიება ვერ მოხერხდა: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoanSearchLoading(false);
    }
  };

  const resetLoanSearch = () => {
    setLoanSearchMobile('');
    setLoanSearchIdLast4('');
    setLoanSearchResult(null);
    setLoanSearchError('');
  };

  const canCloseLoan = (loan) => {
    // Admin, Manager, or assigned officer can close the loan
    if (user.role === 'admin' || user.role === 'manager') return true;
    if (user.role === 'officer' && loan.assignedToId === user.id) return true;
    return false;
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      officer: 'bg-green-100 text-green-700'
    };
    return badges[role] || 'bg-slate-100 text-slate-700';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      in_progress: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    return badges[status] || 'bg-slate-100 text-slate-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'მოლოდინში',
      in_progress: 'მიმდინარე',
      approved: 'დამტკიცებული',
      rejected: 'უარყოფილი'
    };
    return labels[status] || status;
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'მოლოდინში',
      in_progress: 'მიმდინარე',
      approved: 'დამტკიცებული',
      rejected: 'უარყოფილი'
    };
    return texts[status] || status;
  };

  const getShortBranch = (branch) => {
    if (!branch) return '-';
    const branchLower = branch.toLowerCase();
    if (branchLower.includes('საბურთალო')) return 'საბურთალო';
    if (branchLower.includes('დიდუბ')) return 'დიდუბე';
    if (branchLower.includes('გლდან')) return 'გლდანი';
    if (branchLower.includes('ბათუმ')) return 'ბათუმი';
    return branch.split(' ')[0]; // Return first word if no match
  };

  // Mask personal ID - show only last 4 digits if loan is not taken
  const maskPersonalId = (personalId, loan) => {
    if (!personalId) return '-';
    
    // Show full ID if loan is assigned (taken by an officer)
    if (loan?.assignedToId) {
      return personalId;
    }
    
    // Show full ID for admin/manager roles
    if (user.role === 'admin' || user.role === 'manager') {
      return personalId;
    }
    
    // Mask all but last 4 digits
    if (personalId.length <= 4) return personalId;
    const masked = '*'.repeat(personalId.length - 4) + personalId.slice(-4);
    return masked;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 sm:h-10 object-contain" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <div className="hidden xs:block">
                <h1 className="text-base sm:text-lg font-bold text-slate-800">Central MFO</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Unified Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium text-slate-600">{user.username[0].toUpperCase()}</span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-slate-700">{user.username}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadge(user.role)}`}>{user.role}</span>
                </div>
              </div>
              {(user.role === 'admin' || user.role === 'manager') && (
                <Link to="/users" className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                  <Users size={14} className="sm:w-4 sm:h-4" /> 
                  <span className="hidden sm:inline">მომხმარებლები</span>
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/settings" className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="პარამეტრები">
                  <Settings size={16} className="sm:w-[18px] sm:h-[18px]" />
                </Link>
              )}
              <button 
                onClick={() => { setShowLoanSearch(true); resetLoanSearch(); }} 
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="სესხის ძიება"
              >
                <Search size={14} className="sm:w-4 sm:h-4" /> 
                <span className="hidden md:inline">სესხის ძიება</span>
              </button>
              <button onClick={onLogout} className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut size={14} className="sm:w-4 sm:h-4" /> 
                <span className="hidden sm:inline">გასვლა</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Loan Search Modal */}
      {showLoanSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">სესხის ძიება</h3>
              <button onClick={() => setShowLoanSearch(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleLoanSearch} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  მობილური ნომერი
                </label>
                <input
                  type="text"
                  value={loanSearchMobile}
                  onChange={e => setLoanSearchMobile(e.target.value)}
                  placeholder="5XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <CreditCard size={14} className="inline mr-1" />
                  პირადი ნომრის ბოლო 4 ციფრი
                </label>
                <input
                  type="text"
                  value={loanSearchIdLast4}
                  onChange={e => setLoanSearchIdLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="XXXX"
                  maxLength={4}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              
              {loanSearchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {loanSearchError}
                </div>
              )}
              
              <button
                type="submit"
                disabled={loanSearchLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loanSearchLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                {loanSearchLoading ? 'იძებნება...' : 'ძიება'}
              </button>
            </form>
            
            {/* Search Result */}
            {loanSearchResult && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">ძიების შედეგი:</h4>
                <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">პროდუქტი:</span>
                    <span className="font-medium text-slate-800">{loanSearchResult.product || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">თანხა:</span>
                    <span className="font-medium text-slate-800">{loanSearchResult.amount ? `${loanSearchResult.amount} ₾` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">ექსპერტი:</span>
                    <span className="font-medium text-slate-800">{loanSearchResult.expert || 'არ არის მინიჭებული'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">სტატუსი:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(loanSearchResult.status)}`}>
                      {getStatusLabel(loanSearchResult.status)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{stats.today}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">დღის განაცხადები</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{stats.month}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">თვის განაცხადები</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{stats.pending}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">მოლოდინში</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{stats.approved}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">დამტკიცებული</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{stats.rejected}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 truncate">უარყოფილი</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Requests Notification for Manager/Admin */}
        {(user.role === 'manager' || user.role === 'admin') && assignmentRequests.length > 0 && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Bell className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-orange-800 text-sm sm:text-base">{assignmentRequests.length} მოთხოვნა მოლოდინშია</p>
                  <p className="text-xs text-orange-600">ექსპერტები ითხოვენ განაცხადების აღებას</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRequests(!showRequests)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-orange-700 self-start sm:self-auto"
              >
                {showRequests ? 'დამალვა' : 'ნახვა'}
              </button>
            </div>
            
            {showRequests && (
              <div className="mt-4 space-y-2">
                {assignmentRequests.map(req => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 bg-white p-3 rounded-lg border border-orange-100">
                    <div>
                      <p className="font-medium text-slate-800 text-sm sm:text-base">{req.loan.firstName} {req.loan.lastName}</p>
                      <p className="text-xs text-slate-500">
                        მოითხოვა: <span className="font-medium">{req.requestedBy.username}</span> • 
                        ფილიალი: {req.loan.branch}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAssignmentRequest(req.id, 'approve')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        დამტკიცება
                      </button>
                      <button 
                        onClick={() => handleAssignmentRequest(req.id, 'reject')}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-600 text-white rounded-lg text-xs sm:text-sm hover:bg-red-700"
                      >
                        უარყოფა
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">განაცხადები</h2>
              <p className="text-slate-500 text-sm mt-0.5">{pagination.total} განაცხადი ნაპოვნია</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 sm:flex-initial">
                <div className="relative flex-1 sm:flex-initial">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="ძებნა..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="w-full sm:w-40 md:w-48 pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium">
                  ძებნა
                </button>
                {search && (
                  <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300 font-medium">
                    გასუფთავება
                  </button>
                )}
              </form>
              <button onClick={() => { fetchLoans(); fetchStats(); fetchLastSync(); if (user.role !== 'officer') fetchAssignmentRequests(); }} className="flex items-center justify-center w-10 h-10 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {lastSync && (
            <span className="text-xs text-slate-500">
              ბოლო სინქრონიზაცია: {new Date(lastSync).toLocaleString('ka-GE')}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">სახელი / გვარი</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">მობილური</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">ფილიალი</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">სტატუსი</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">ექსპერტი</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">იტვირთება...</td></tr>
                ) : noBranches ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-amber-400" />
                      <p className="text-slate-700 font-medium mb-2">ფილიალი არ არის მინიჭებული</p>
                      <p className="text-slate-500 text-sm">გთხოვთ დაელოდოთ, ადმინისტრატორი მოგანიჭებთ ფილიალს</p>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />განაცხადები არ მოიძებნა</td></tr>
                ) : loans.map(loan => (
                  <tr key={loan.id} className={`hover:bg-slate-50 transition-colors ${loan.status === 'approved' ? 'bg-green-50/50' : loan.status === 'rejected' ? 'bg-red-50/50' : loan.status === 'in_progress' ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-xs sm:text-sm truncate">{loan.firstName} {loan.lastName}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500 truncate">{loan.email || ''}</p>
                        </div>
                        {loan.verificationStatus && (
                          <span title="CreditInfo ვერიფიცირებული" className="flex-shrink-0">
                            <ShieldCheck size={16} className="text-green-500" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-slate-600 text-xs sm:text-sm">{loan.mobile}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-100 text-slate-700 rounded-md text-[10px] sm:text-xs">{getShortBranch(loan.branch)}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusBadge(loan.status || 'pending')}`}>
                        {getStatusText(loan.status || 'pending')}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      {loan.assignedTo ? (
                        <span className="text-xs sm:text-sm text-slate-700">{loan.assignedTo.username}</span>
                      ) : (
                        <span className="text-slate-400 text-xs sm:text-sm">-</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-1">
                        <button 
                          className="p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          onClick={() => setSelectedLoan(loan)}
                          title="დეტალები"
                        >
                          <Eye size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        {/* Officer can directly take unassigned pending loans */}
                        {user.role === 'officer' && loan.status === 'pending' && !loan.assignedToId && (
                          <button 
                            className="p-1.5 sm:p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            onClick={() => requestLoan(loan.id)}
                            title="აღება"
                          >
                            <Hand size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {/* Manager/Admin can directly assign */}
                        {(user.role === 'admin' || user.role === 'manager') && loan.status === 'pending' && !loan.assignedToId && (
                          <button 
                            className="p-1.5 sm:p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            onClick={() => setAssigningLoan(loan)}
                            title="ექსპერტის მინიჭება"
                          >
                            <UserPlus size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        )}
                        {/* Close button for assigned officer or manager/admin on in_progress loans */}
                        {canCloseLoan(loan) && (loan.status === 'pending' || loan.status === 'in_progress') && (
                          <button 
                            className="p-1.5 sm:p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                            onClick={() => setClosingLoan(loan)}
                            title="დახურვა"
                          >
                            <Lock size={14} className="sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-slate-600">
                გვერდი {pagination.page} / {pagination.pages} (სულ {pagination.total})
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 sm:p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} className="sm:w-4 sm:h-4" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium ${
                        page === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="p-1.5 sm:p-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 flex justify-between items-center bg-blue-600 text-white">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h3 className="text-base sm:text-lg font-semibold">სესხის დეტალები</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedLoan.status || 'pending')}`}>
                    {getStatusText(selectedLoan.status || 'pending')}
                  </span>
                  {selectedLoan.verificationStatus && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-green-500 rounded-full text-xs font-medium">
                      <ShieldCheck size={14} /> ვერიფიცირებული
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedLoan(null)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {(() => {
                  const details = JSON.parse(selectedLoan.details || '{}');
                  return (
                    <div className="space-y-6">
                      {/* Customer Info */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">მომხმარებლის ინფორმაცია</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500">სახელი</p>
                            <p className="font-medium text-slate-800">{details['33'] || selectedLoan.firstName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">გვარი</p>
                            <p className="font-medium text-slate-800">{details['34'] || selectedLoan.lastName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">პირადი ნომერი</p>
                            <p className="font-medium text-slate-800">{maskPersonalId(details['31'], selectedLoan)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">მობილური</p>
                            <p className="font-medium text-slate-800">{details['27'] || selectedLoan.mobile}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">ელ-ფოსტა</p>
                            <p className="font-medium text-slate-800">{details['35'] || selectedLoan.email || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">IP მისამართი</p>
                            <p className="font-medium text-slate-800">{details.ip || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Loan Info */}
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">სესხის ინფორმაცია</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-500">სესხის ტიპი</p>
                            <p className="font-semibold text-blue-700 text-lg">{details['16'] || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">მოთხოვნილი თანხა</p>
                            <p className="font-semibold text-green-600 text-lg">{details['14'] ? `${details['14']} ₾` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">ფილიალი</p>
                            <p className="font-medium text-slate-800">{details['21'] || selectedLoan.branch}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">განაცხადის თარიღი</p>
                            <p className="font-medium text-slate-800">{details.date_created || '-'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Consents */}
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-3">თანხმობები</h4>
                        <div className="space-y-2">
                          {details['17.1'] && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <p className="text-sm text-slate-700">{details['17.1']}</p>
                            </div>
                          )}
                          {details['17.2'] && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <p className="text-sm text-slate-700">{details['17.2']}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assignment Status */}
                      <div className="bg-purple-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-3">მინიჭების სტატუსი</h4>
                        {selectedLoan.assignedTo ? (
                          <p className="font-medium text-purple-700">მინიჭებულია: {selectedLoan.assignedTo.username}</p>
                        ) : (
                          <p className="text-slate-500">ჯერ არ არის მინიჭებული საკრედიტო ოფიცერზე</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
                <div className="flex gap-2">
                  {canCloseLoan(selectedLoan) && selectedLoan.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => updateLoanStatus(selectedLoan.id, 'approved')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <ThumbsUp size={16} /> დამტკიცება
                      </button>
                      <button 
                        onClick={() => updateLoanStatus(selectedLoan.id, 'rejected')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                      >
                        <ThumbsDown size={16} /> უარყოფა
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-3">
                  {(user.role === 'admin' || user.role === 'manager') && !selectedLoan.assignedTo && selectedLoan.status === 'pending' && (
                    <button 
                      onClick={() => { setSelectedLoan(null); setAssigningLoan(selectedLoan); }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                    >
                      მინიჭება ოფიცერზე
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedLoan(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                  >
                    დახურვა
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Loan Modal */}
        {closingLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-amber-500 text-white">
                <h3 className="text-lg font-semibold">განაცხადის დახურვა</h3>
                <button onClick={() => setClosingLoan(null)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">განაცხადი:</p>
                  <p className="font-medium text-slate-800">{closingLoan.firstName} {closingLoan.lastName}</p>
                  <p className="text-sm text-slate-600">{closingLoan.branch}</p>
                </div>
                
                <p className="text-sm font-medium text-slate-700 mb-4">აირჩიეთ სტატუსი:</p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => updateLoanStatus(closingLoan.id, 'approved')}
                    className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition-colors"
                  >
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                    <span className="font-medium text-green-700">დამტკიცება</span>
                  </button>
                  <button
                    onClick={() => updateLoanStatus(closingLoan.id, 'rejected')}
                    className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-400 transition-colors"
                  >
                    <ThumbsDown className="w-6 h-6 text-red-600" />
                    <span className="font-medium text-red-700">უარყოფა</span>
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button 
                  onClick={() => setClosingLoan(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assignment Modal */}
        {assigningLoan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-purple-600 text-white">
                <h3 className="text-lg font-semibold">განაცხადის მინიჭება</h3>
                <button onClick={() => setAssigningLoan(null)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">განაცხადი:</p>
                  <p className="font-medium text-slate-800">{assigningLoan.firstName} {assigningLoan.lastName}</p>
                  <p className="text-sm text-slate-600">{assigningLoan.branch}</p>
                </div>
                
                <p className="text-sm font-medium text-slate-700 mb-2">აირჩიეთ საკრედიტო ოფიცერი:</p>
                
                {officers.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <UserPlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p>საკრედიტო ოფიცრები არ არიან დამატებული</p>
                    <Link to="/users" className="text-blue-600 hover:underline text-sm">დაამატეთ მომხმარებლები</Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {officers.map(officer => (
                      <button
                        key={officer.id}
                        onClick={() => assignLoan(assigningLoan.id, officer.id)}
                        className="w-full flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-700">{officer.username[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{officer.username}</p>
                          <p className="text-xs text-slate-500">{officer.branches}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button 
                  onClick={() => setAssigningLoan(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
