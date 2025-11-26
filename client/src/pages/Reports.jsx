import { useEffect, useState } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { 
  BarChart3, TrendingUp, TrendingDown, Calendar, FileText, 
  Building2, LogOut, Settings, Users, Home, Filter, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle, XCircle, Clock, Ban
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';

export default function Reports({ user, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const branchOptions = [
    { value: 'all', label: 'ყველა ფილიალი' },
    { value: 'საბურთალოს სერვისცენტრი', label: 'საბურთალოს სერვისცენტრი' },
    { value: 'გლდანის ფილიალი', label: 'გლდანის ფილიალი' },
    { value: 'დიდუბის ფილიალი', label: 'დიდუბის ფილიალი' },
    { value: 'ბათუმის ფილიალი', label: 'ბათუმის ფილიალი' }
  ];

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  useEffect(() => {
    fetchLogo();
    fetchReportData();
  }, [selectedBranch, dateFrom, dateTo]);

  const fetchLogo = async () => {
    try {
      const res = await api.get('/settings/public');
      if (res.data.logoUrl) {
        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api$/, '');
        setLogoUrl(`${baseUrl}${res.data.logoUrl}`);
      }
    } catch (e) {}
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') {
        params.append('branch', selectedBranch);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      const res = await api.get(`/reports/dashboard?${params.toString()}`);
      setReportData(res.data);
    } catch (e) {
      console.error('Failed to fetch report data:', e);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedBranch('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasDateFilter = dateFrom || dateTo;
  const getDateRangeLabel = () => {
    if (dateFrom && dateTo) {
      return `${dateFrom} - ${dateTo}`;
    } else if (dateFrom) {
      return `${dateFrom}-დან`;
    } else if (dateTo) {
      return `${dateTo}-მდე`;
    }
    return '';
  };

  const getTrendIcon = (percentage) => {
    if (percentage > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (percentage < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (percentage) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-slate-500';
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-800">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 sm:h-10 w-auto" />
              ) : (
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">რეპორტები</h1>
                <p className="text-xs sm:text-sm text-slate-500">სტატისტიკა და ანალიტიკა</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-1">
                <Link to="/" className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Home size={18} />
                  <span className="text-sm">მთავარი</span>
                </Link>
                {user.role === 'admin' && (
                  <>
                    <Link to="/users" className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Users size={18} />
                      <span className="text-sm">მომხმარებლები</span>
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Settings size={18} />
                      <span className="text-sm">პარამეტრები</span>
                    </Link>
                  </>
                )}
              </nav>

              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-700">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.role === 'admin' ? 'ადმინისტრატორი' : user.role === 'manager_viewer' ? 'მენეჯერი (მხოლოდ ნახვა)' : user.role}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">ფილტრი:</span>
            </div>
            
            {/* Branch Filter */}
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              >
                {branchOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="თარიღიდან"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="თარიღამდე"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReportData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <RefreshCw size={16} />
                განახლება
              </button>
              {(selectedBranch !== 'all' || dateFrom || dateTo) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors text-sm"
                >
                  გასუფთავება
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedBranch !== 'all' || hasDateFilter) && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                აქტიური ფილტრები: 
                {selectedBranch !== 'all' && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{selectedBranch}</span>}
                {hasDateFilter && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{getDateRangeLabel()}</span>}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        ) : reportData ? (
          <>
            {/* Date Range Stats (shown when date filter is active) */}
            {hasDateFilter && reportData.dateRangeStats && (
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg p-5 mb-6 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-purple-100 text-sm">არჩეული პერიოდი: {getDateRangeLabel()}</p>
                    <p className="text-3xl font-bold mt-1">{reportData.dateRangeStats.total} განაცხადი</p>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <div className="text-center">
                      <p className="text-purple-100 text-xs">დამტკიცებული</p>
                      <p className="text-2xl font-bold text-green-300">{reportData.dateRangeStats.approved}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-100 text-xs">უარყოფილი</p>
                      <p className="text-2xl font-bold text-red-300">{reportData.dateRangeStats.rejected}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-100 text-xs">გაუქმებული</p>
                      <p className="text-2xl font-bold text-slate-300">{reportData.dateRangeStats.cancelled}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-purple-100 text-xs">მოლოდინში</p>
                      <p className="text-2xl font-bold text-amber-300">{reportData.dateRangeStats.pending}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Today */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">დღეს</p>
                <p className="text-3xl font-bold text-slate-800">{reportData.today}</p>
                <p className="text-xs text-slate-400 mt-1">განაცხადი</p>
              </div>

              {/* This Month */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className={`flex items-center gap-1 ${getTrendColor(reportData.monthlyTrend)}`}>
                    {getTrendIcon(reportData.monthlyTrend)}
                    <span className="text-sm font-medium">{formatPercentage(reportData.monthlyTrend)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">ამ თვეში</p>
                <p className="text-3xl font-bold text-slate-800">{reportData.thisMonth}</p>
                <p className="text-xs text-slate-400 mt-1">წინა თვესთან შედარებით</p>
              </div>

              {/* This Year */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">წელიწადში</p>
                <p className="text-3xl font-bold text-slate-800">{reportData.thisYear}</p>
                <p className="text-xs text-slate-400 mt-1">განაცხადი</p>
              </div>

              {/* Previous Month */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-sm text-slate-500 mb-1">წინა თვე</p>
                <p className="text-3xl font-bold text-slate-800">{reportData.lastMonth}</p>
                <p className="text-xs text-slate-400 mt-1">განაცხადი</p>
              </div>
            </div>

            {/* Status Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {/* Approved */}
              <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-green-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">დამტკიცებული</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.approvedCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-red-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">უარყოფილი</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.rejectedCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Cancelled */}
              <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-slate-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Ban className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">გაუქმებული</p>
                    <p className="text-2xl font-bold text-slate-600">{reportData.cancelledCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white rounded-xl shadow-sm border border-l-4 border-l-amber-500 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">მოლოდინში</p>
                    <p className="text-2xl font-bold text-amber-600">{reportData.pendingCount || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Monthly Trend Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">თვიური ტრენდი</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.monthlyData || []}>
                      <defs>
                        <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        name="განაცხადები"
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorApplications)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Product Distribution Pie Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">პროდუქტების განაწილება</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.productDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="product"
                        label={({ product, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {(reportData.productDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-sm text-slate-600">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Status Distribution & Branch Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">სტატუსის განაწილება</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.statusDistribution || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis dataKey="status" type="category" tick={{ fontSize: 12 }} stroke="#94a3b8" width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="რაოდენობა" radius={[0, 4, 4, 0]}>
                        {(reportData.statusDistribution || []).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.statusKey === 'approved' ? '#10b981' :
                              entry.statusKey === 'rejected' ? '#ef4444' :
                              entry.statusKey === 'cancelled' ? '#6b7280' :
                              entry.statusKey === 'in_progress' ? '#f59e0b' :
                              '#3b82f6'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Branch Distribution */}
              {selectedBranch === 'all' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">ფილიალების განაწილება</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.branchDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="branch" tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} stroke="#94a3b8" height={80} />
                        <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" name="განაცხადები" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Products Table (shown when branch is filtered) */}
              {selectedBranch !== 'all' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">ტოპ პროდუქტები</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">#</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">პროდუქტი</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">რაოდენობა</th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">წილი</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.productDistribution || []).slice(0, 5).map((item, index) => (
                          <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{item.product}</td>
                            <td className="py-3 px-4 text-sm text-slate-600 text-right">{item.count}</td>
                            <td className="py-3 px-4 text-sm text-slate-600 text-right">
                              {((item.count / reportData.thisYear) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Most Requested Product Highlight */}
            {reportData.mostRequestedProduct && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">ყველაზე მოთხოვნადი პროდუქტი</p>
                    <p className="text-2xl font-bold">{reportData.mostRequestedProduct.product}</p>
                    <p className="text-blue-100 mt-2">
                      {reportData.mostRequestedProduct.count} განაცხადი 
                      ({((reportData.mostRequestedProduct.count / reportData.thisYear) * 100).toFixed(1)}% მთლიანიდან)
                    </p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">მონაცემები ვერ ჩაიტვირთა</p>
          </div>
        )}
      </main>
    </div>
  );
}
