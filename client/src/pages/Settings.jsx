import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, Settings as SettingsIcon, Building2, Server, Shield, Check, AlertCircle, Loader2, CloudDownload, Clock, RefreshCw, Image, Upload } from 'lucide-react';

export default function Settings({ user, onLogout }) {
  const [settings, setSettings] = useState({
    adServer: '',
    adPort: 389,
    adBaseDN: '',
    adDomain: '',
    adBindUser: '',
    adBindPassword: '',
    adGroupFilter: '',
    syncInterval: 5,
    logoUrl: '',
    faviconUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [message, setMessage] = useState(null);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    fetchSyncStatus();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (e) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await api.get('/sync/status');
      setSyncStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch sync status');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/settings', settings);
      setMessage({ type: 'success', text: 'პარამეტრები წარმატებით შეინახა!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'შეცდომა: ' + e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await api.post('/settings/test-ad');
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
      } else {
        setMessage({ type: 'error', text: res.data.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'კავშირი ვერ დამყარდა: ' + (e.response?.data?.error || e.message) });
    } finally {
      setTesting(false);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await api.post('/sync/gravity-forms');
      setMessage({ type: 'success', text: `სინქრონიზაცია დასრულდა: ${res.data.synced} განაცხადი სინქრონიზებულია` });
      fetchSyncStatus();
    } catch (e) {
      setMessage({ type: 'error', text: 'სინქრონიზაცია ვერ მოხერხდა: ' + e.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingLogo(true);
    setMessage(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const res = await api.post('/settings/upload-logo', { image: event.target.result });
          setSettings(prev => ({ ...prev, logoUrl: res.data.logoUrl }));
          setMessage({ type: 'success', text: 'ლოგო წარმატებით აიტვირთა!' });
        } catch (err) {
          setMessage({ type: 'error', text: 'ლოგოს ატვირთვა ვერ მოხერხდა: ' + err.message });
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage({ type: 'error', text: 'ფაილის წაკითხვა ვერ მოხერხდა' });
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingFavicon(true);
    setMessage(null);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const res = await api.post('/settings/upload-favicon', { image: event.target.result });
          setSettings(prev => ({ ...prev, faviconUrl: res.data.faviconUrl }));
          setMessage({ type: 'success', text: 'Favicon წარმატებით აიტვირთა!' });
        } catch (err) {
          setMessage({ type: 'error', text: 'Favicon-ის ატვირთვა ვერ მოხერხდა: ' + err.message });
        } finally {
          setUploadingFavicon(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setMessage({ type: 'error', text: 'ფაილის წაკითხვა ვერ მოხერხდა' });
      setUploadingFavicon(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
                <p className="text-xs text-slate-500">პარამეტრები</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <ArrowLeft size={16} /> დაბრუნება
              </Link>
              <button onClick={onLogout} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut size={16} /> გამოსვლა
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p>{message.text}</p>
          </div>
        )}

        {/* Branding Card - Logo & Favicon */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
            <Image className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="font-semibold text-slate-800">ბრენდინგი</h2>
              <p className="text-xs text-slate-500">ლოგო და Favicon</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">ლოგო</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                    {settings.logoUrl ? (
                      <img 
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api$/, '')}${settings.logoUrl}`} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingLogo ? 'იტვირთება...' : 'ატვირთვა'}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG</p>
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Favicon</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
                    {settings.faviconUrl ? (
                      <img 
                        src={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api$/, '')}${settings.faviconUrl}`} 
                        alt="Favicon" 
                        className="w-10 h-10 object-contain"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={faviconInputRef}
                      onChange={handleFaviconUpload}
                      accept="image/*,.ico"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {uploadingFavicon ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingFavicon ? 'იტვირთება...' : 'ატვირთვა'}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">ICO, PNG, SVG (32x32)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WordPress Sync Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
            <CloudDownload className="w-5 h-5 text-green-600" />
            <div>
              <h2 className="font-semibold text-slate-800">WordPress / Gravity Forms სინქრონიზაცია</h2>
              <p className="text-xs text-slate-500">განაცხადების ავტომატური იმპორტი</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Sync Status */}
            {syncStatus && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">სულ განაცხადები:</span>
                  <span className="font-semibold text-slate-800">{syncStatus.totalEntries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">ბოლო სინქრონიზაცია:</span>
                  <span className="font-semibold text-slate-800">
                    {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString('ka-GE') : 'არ არის'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">მიმდინარე ინტერვალი:</span>
                  <span className="font-semibold text-slate-800">{syncStatus.syncInterval}</span>
                </div>
              </div>
            )}

            {/* Sync Interval Setting */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Clock className="w-4 h-4 inline mr-1" />
                სინქრონიზაციის ინტერვალი (წუთებში)
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  min="1"
                  max="60"
                  className="w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                  value={settings.syncInterval}
                  onChange={e => setSettings({...settings, syncInterval: parseInt(e.target.value) || 5})}
                />
                <span className="text-sm text-slate-500">წუთი</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">რამდენ წუთში ერთხელ ჩამოტვირთოს ახალი განაცხადები</p>
            </div>

            {/* Manual Sync Button */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-700">ხელით სინქრონიზაცია</p>
                <p className="text-xs text-slate-500">დაუყონებლივ ჩამოტვირთეთ ახალი განაცხადები</p>
              </div>
              <button 
                type="button"
                onClick={triggerSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {syncing ? 'სინქრონიზაცია...' : 'სინქრონიზაცია'}
              </button>
            </div>
          </div>
        </div>

        {/* AD Settings Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50">
            <Server className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="font-semibold text-slate-800">Active Directory კონფიგურაცია</h2>
              <p className="text-xs text-slate-500">მომხმარებლების ავთენტიფიკაცია AD/LDAP-ით</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Connection Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" /> კავშირის პარამეტრები
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">AD სერვერის IP / Hostname</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                    placeholder="192.168.1.10 ან dc.central.local"
                    value={settings.adServer}
                    onChange={e => setSettings({...settings, adServer: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">პორტი</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                    placeholder="389"
                    value={settings.adPort}
                    onChange={e => setSettings({...settings, adPort: parseInt(e.target.value) || 389})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">დომენი</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                  placeholder="central.local"
                  value={settings.adDomain}
                  onChange={e => setSettings({...settings, adDomain: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1">მომხმარებლის სახელს დაემატება @domain (მაგ: user@central.local)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base DN</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                  placeholder="DC=central,DC=local"
                  value={settings.adBaseDN}
                  onChange={e => setSettings({...settings, adBaseDN: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1">LDAP ძიების საწყისი DN</p>
              </div>
            </div>

            {/* Bind Credentials */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Bind მომხმარებელი (არასავალდებულო)</h3>
              <p className="text-xs text-slate-500">თუ AD მოითხოვს ავთენტიფიკაციას ძიებისთვის</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bind მომხმარებელი</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                    placeholder="administrator"
                    value={settings.adBindUser}
                    onChange={e => setSettings({...settings, adBindUser: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bind პაროლი</label>
                  <input 
                    type="password"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                    placeholder="••••••••"
                    value={settings.adBindPassword}
                    onChange={e => setSettings({...settings, adBindPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Group Filter */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">ჯგუფის ფილტრი (არასავალდებულო)</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">AD ჯგუფის DN</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 focus:bg-white" 
                  placeholder="CN=UnifiedPlatform,OU=Groups,DC=central,DC=local"
                  value={settings.adGroupFilter}
                  onChange={e => setSettings({...settings, adGroupFilter: e.target.value})}
                />
                <p className="text-xs text-slate-500 mt-1">მხოლოდ ამ ჯგუფის წევრები შეძლებენ შესვლას</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-200">
              <button 
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !settings.adServer}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Server size={16} />}
                {testing ? 'მოწმდება...' : 'კავშირის ტესტი'}
              </button>
              
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'ინახება...' : 'შენახვა'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-medium text-amber-800 mb-2">ინსტრუქცია</h3>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>შეიყვანეთ AD სერვერის IP მისამართი ან hostname</li>
            <li>დომენი უნდა იყოს სრული (მაგ: central.local)</li>
            <li>Base DN არის ძიების საწყისი წერტილი (მაგ: DC=central,DC=local)</li>
            <li>ჯგუფის ფილტრი ზღუდავს წვდომას მხოლოდ ჯგუფის წევრებისთვის</li>
            <li>კავშირის ტესტით შეამოწმეთ კონფიგურაცია შენახვამდე</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
