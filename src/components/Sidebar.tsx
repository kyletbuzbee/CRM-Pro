import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, MapPin, DollarSign, Sparkles, RefreshCw, Menu, X,
  Upload, Search, Plus, Bell, Wifi, WifiOff, Clock, Star, Filter,
  ChevronDown, Settings, Zap, FileText
} from 'lucide-react';
import { Prospect, ContactStatus } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  refreshData: () => void;
  loading: boolean;
  prospects: Prospect[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddProspect?: () => void;
}

const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  shortcut?: string;
  sidebarOpen?: boolean;
}> = ({ icon, label, active, onClick, badge, shortcut, sidebarOpen = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
      active
        ? 'bg-white/10 text-white shadow-lg'
        : 'text-slate-400 hover:text-white hover:bg-white/5'
    }`}
  >
    {icon}
    <span className="font-medium flex-1 text-left">{label}</span>
    {badge && badge > 0 && (
      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
        {badge}
      </span>
    )}
    {shortcut && sidebarOpen && (
      <span className="text-xs opacity-50 ml-auto">{shortcut}</span>
    )}
  </button>
);



const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  showLabel?: boolean;
}> = ({ icon, label, onClick, variant = 'secondary', showLabel = false }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      variant === 'primary'
        ? 'bg-white text-[#001F3F] hover:bg-gray-100 shadow-md'
        : 'bg-white/10 text-white hover:bg-white/20'
    }`}
    title={label}
  >
    {icon}
    {showLabel && <span>{label}</span>}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  refreshData,
  loading,
  prospects,
  searchQuery,
  setSearchQuery,
  onAddProspect
}) => {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(['dashboard', 'prospects']);
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  // Calculate live stats
  const stats = React.useMemo(() => ({
    total: prospects.length,
    hot: prospects.filter(p => p.contactStatus === ContactStatus.HOT).length,
    critical: prospects.filter(p => p.urgencyBand === 'Critical').length,
    overdue: prospects.filter(p => {
      if (!p.nextStepDue) return false;
      return new Date(p.nextStepDue) < new Date();
    }).length
  }), [prospects]);

  // Recent items (mock - in real app would come from usage tracking)
  const recentItems = React.useMemo(() =>
    prospects
      .filter(p => p.priorityScore > 70)
      .slice(0, 3)
      .map(p => ({ id: p.cid, name: p.company, type: 'prospect' as const })),
    [prospects]
  );

  // Google Apps Script sync status effect
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple connectivity check
        const response = await fetch('https://script.google.com/macros/', { method: 'HEAD' });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && prospects.length > 0) {
      setLastSyncTime(new Date());
    }
  }, [loading, prospects.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k':
            e.preventDefault();
            setShowQuickSearch(true);
            break;
          case 'n':
            e.preventDefault();
            onAddProspect?.();
            break;
          case 'd':
            e.preventDefault();
            setActiveTab('dashboard');
            break;
          case 'p':
            e.preventDefault();
            setActiveTab('prospects');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [setActiveTab, onAddProspect]);

  const toggleFavorite = (tab: string) => {
    setFavorites(prev =>
      prev.includes(tab)
        ? prev.filter(f => f !== tab)
        : [...prev, tab]
    );
  };

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-80' : 'w-20'
      } bg-[#001F3F] text-white flex flex-col transition-all duration-300 relative z-20 shadow-xl`}
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-[#001F3F] font-black text-xl italic">K-L</span>
          </div>
          {sidebarOpen && (
            <div>
              <span className="text-xl font-bold tracking-tight whitespace-nowrap block">Recycling</span>
              <div className="flex items-center gap-2 mt-1">
                {isOnline ? (
                  <Wifi size={12} className="text-green-400" />
                ) : (
                  <WifiOff size={12} className="text-red-400" />
                )}
                <span className="text-xs opacity-60">
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      {sidebarOpen && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            <QuickAction
              icon={<Plus size={16} />}
              label="Add Prospect"
              onClick={onAddProspect || (() => {})}
              variant="primary"
              showLabel={true}
            />
            <QuickAction
              icon={<Search size={16} />}
              label="Quick Search"
              onClick={() => setShowQuickSearch(!showQuickSearch)}
              showLabel={true}
            />
            <QuickAction
              icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
              label="Sync Data"
              onClick={refreshData}
              showLabel={true}
            />
          </div>
        </div>
      )}

      {/* Global Search */}
      {sidebarOpen && showQuickSearch && (
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search prospects..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:bg-white/20 focus:border-white/40 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Live Stats Panel */}
      {sidebarOpen && (
        <div className="px-4 mb-4">
          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-white">{stats.total}</div>
                <div className="text-xs text-slate-400">Total Prospects</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">{stats.hot}</div>
                <div className="text-xs text-slate-400">Hot Leads</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-400">{stats.critical}</div>
                <div className="text-xs text-slate-400">Critical</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">{stats.overdue}</div>
                <div className="text-xs text-slate-400">Overdue</div>
              </div>
            </div>
            {lastSyncTime && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-xs text-slate-400">
                <Clock size={12} />
                <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        <div className="mb-4">
          <SidebarItem
            icon={<LayoutDashboard size={22} />}
            label={sidebarOpen ? "Dashboard" : ""}
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            shortcut="Ctrl+D"
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<Users size={22} />}
            label={sidebarOpen ? "Prospects" : ""}
            active={activeTab === 'prospects'}
            onClick={() => setActiveTab('prospects')}
            badge={stats.hot}
            shortcut="Ctrl+P"
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<MapPin size={22} />}
            label={sidebarOpen ? "Sales Routes" : ""}
            active={activeTab === 'routes'}
            onClick={() => setActiveTab('routes')}
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<DollarSign size={22} />}
            label={sidebarOpen ? "Pricing" : ""}
            active={activeTab === 'pricing'}
            onClick={() => setActiveTab('pricing')}
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<Sparkles size={22} />}
            label={sidebarOpen ? "AI Advisor" : ""}
            active={activeTab === 'ai'}
            onClick={() => setActiveTab('ai')}
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<Upload size={22} />}
            label={sidebarOpen ? "Data Import" : ""}
            active={activeTab === 'import'}
            onClick={() => setActiveTab('import')}
            sidebarOpen={sidebarOpen}
          />
          <SidebarItem
            icon={<FileText size={22} />}
            label={sidebarOpen ? "Log Visit" : ""}
            active={activeTab === 'log-visit'}
            onClick={() => setActiveTab('log-visit')}
            sidebarOpen={sidebarOpen}
          />
        </div>

        {/* Recent Items */}
        {sidebarOpen && recentItems.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent</div>
            <div className="space-y-1">
              {recentItems.map(item => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm"
                  onClick={() => setActiveTab('prospects')}
                >
                  <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs font-bold">
                    {item.name[0]}
                  </div>
                  <span className="truncate">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <button
          onClick={refreshData}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
          {sidebarOpen && <span className="font-medium">Sync with Google Sheets</span>}
        </button>

        {sidebarOpen && (
          <div className="text-xs text-slate-500 space-y-1">
            <div>Press <kbd className="bg-white/10 px-1 rounded">Ctrl+K</kbd> for search</div>
            <div>Press <kbd className="bg-white/10 px-1 rounded">Ctrl+N</kbd> for new prospect</div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 bg-white text-[#001F3F] rounded-full p-1 border shadow-sm hover:scale-110 transition-transform"
      >
        {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
      </button>
    </aside>
  );
};
