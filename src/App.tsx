import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, MapPin, TrendingUp, DollarSign, MessageSquare,
  Plus, Search, ChevronRight, Sparkles, RefreshCw, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// Imports from new folder structure
import { Prospect, ContactStatus, Outcome, Price, Outreach } from './types/index';
import { BRAND_COLORS, HOME_BASE } from './utls/constants';
import { getAIAdvisorInsights } from './services/geminiService';
import { GoogleSheetsService } from './services/googleSheetsService';
import { StorageHelper } from './utils/storage';
import { validateEnvironment } from './utils/env';
import { useProspectsStore } from './store/prospectsStore';

import { Sidebar } from './components/Sidebar';
import { StatCard } from './components/StatCard';
import { DataImport } from './components/DataImport';
import { AddProspectModal } from './components/AddProspectModal';
import { InteractiveMap } from './components/InteractiveMap';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'prospects' | 'routes' | 'pricing' | 'ai' | 'import' | 'log-visit'>('dashboard');
  const [prices, setPrices] = useState<Price[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logVisitForm, setLogVisitForm] = useState({
    cid: '',
    company: '',
    notes: '',
    outcome: '',
    nextVisitDate: ''
  });
  const [logVisitLoading, setLogVisitLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [envWarnings, setEnvWarnings] = useState<string[]>([]);

  // Use the prospects store
  const { prospects, loading, fetchProspects, addProspect } = useProspectsStore();

  // Handle data import
  const handleDataImported = async (newProspects: Prospect[], newPrices: Price[], newOutreach?: Outreach[]) => {
    // 1. Save to Backend (Bulk)
    await GoogleSheetsService.syncProspects(newProspects);

    // 2. Refresh data from server to ensure local state matches backend exactly
    // This avoids the double-write issue
    await fetchProspects();

    // 3. Handle Prices
    setPrices(prev => [...prev, ...newPrices]);
    StorageHelper.savePrices([...prices, ...newPrices]);
    // Note: Outreach data is sent to backend but not stored locally for now
  };

  // Handle add prospect
  const handleAddProspect = () => {
    setShowAddModal(true);
    setEditingProspect(null);
  };

  // Handle edit prospect
  const handleEditProspect = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setShowAddModal(true);
  };

  const handleSaveProspect = async (prospect: Prospect) => {
    await addProspect(prospect);
  };

  // Handle log visit
  const handleLogVisit = async () => {
    if (!logVisitForm.cid || !logVisitForm.company || !logVisitForm.outcome) {
      alert('Please fill in Company ID, Company Name, and Outcome');
      return;
    }

    setLogVisitLoading(true);
    try {
      const result = await GoogleSheetsService.logVisit({
        cid: logVisitForm.cid,
        company: logVisitForm.company,
        notes: logVisitForm.notes,
        outcome: logVisitForm.outcome,
        nextVisitDate: logVisitForm.nextVisitDate || undefined
      });

      if (result.success) {
        alert('Visit logged successfully!');
        // Reset form
        setLogVisitForm({
          cid: '',
          company: '',
          notes: '',
          outcome: '',
          nextVisitDate: ''
        });
      } else {
        alert('Failed to log visit: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Log visit error:', error);
      alert('Error logging visit. Check console for details.');
    } finally {
      setLogVisitLoading(false);
    }
  };

  // Fetch data from Google Sheets
  const refreshData = async () => {
    try {
      const fetchedPrices = await GoogleSheetsService.getPrices();
      setPrices(fetchedPrices);
      // Prospects are handled by the store's fetchProspects
      await fetchProspects();
    } catch (error) {
      console.error("Failed to load spreadsheet data:", error);
    }
  };

  useEffect(() => {
    // Validate environment variables
    const envCheck = validateEnvironment();
    if (!envCheck.isValid) {
      setEnvWarnings(envCheck.warnings);
    }

    // Load from local storage first for instant display
    const storedPrices = StorageHelper.loadPrices();

    if (storedPrices) setPrices(storedPrices);

    // Then refresh from Google Sheets (store handles prospects automatically)
    fetchProspects();
    refreshData();
  }, []);

  // Derived data
  const filteredProspects = useMemo(() => {
    return prospects.filter(p => 
      p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.industry?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prospects, searchQuery]);

  const stats = useMemo(() => {
    if (prospects.length === 0) return { total: 0, hot: 0, won: 0, avgPriority: 0 };
    return {
      total: prospects.length,
      hot: prospects.filter(p => p.contactStatus === ContactStatus.HOT).length,
      won: prospects.filter(p => p.lastOutcome === Outcome.WON).length,
      avgPriority: Math.round(prospects.reduce((acc, curr) => acc + (curr.priorityScore || 0), 0) / prospects.length) || 0
    };
  }, [prospects]);

  const industryData = useMemo(() => {
    const map: Record<string, number> = {};
    prospects.forEach(p => {
      if (p.industry) {
        map[p.industry] = (map[p.industry] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [prospects]);

  const fetchAIInsights = async () => {
    setLoadingAi(true);
    try {
      // 1. Try to get backend insights from Google Sheets
      const backendInsights = await GoogleSheetsService.getInsights();
      
      if (backendInsights) {
        let text = "--- 📈 STRATEGIC REVENUE REPORT ---\n\n";
        
        if (backendInsights.metrics) {
           const m = backendInsights.metrics;
           text += `📊 PERFORMANCE METRICS:\n`;
           text += `• Visits this week: ${m.visitsThisWeek}\n`;
           text += `• Wins this week: ${m.winsThisWeek}\n`;
           text += `• Conversion Rate: ${m.conversionRate}%\n\n`;
        }

        if (backendInsights.opportunities?.length > 0) {
          text += "✨ REVENUE OPPORTUNITIES:\n";
          backendInsights.opportunities.forEach((o: any) => text += `• ${o.message}\n`);
          text += "\n";
        }

        if (backendInsights.warnings?.length > 0) {
           text += "⚠️ CRITICAL WARNINGS:\n";
           backendInsights.warnings.forEach((w: any) => text += `• ${w.message}\n`);
           text += "\n";
        }

        if (backendInsights.recommendations?.length > 0) {
           text += "💡 ACTION PLAN:\n";
           backendInsights.recommendations.forEach((r: any) => 
             text += `• [${r.priority.toUpperCase()}] ${r.action}: ${r.reason}\n`
           );
        }
        
        setAiInsights(text);
      } else {
        // 2. Fallback to Client-Side AI
        if (prospects.length > 0) {
             const geminiInsights = await getAIAdvisorInsights(prospects);
             setAiInsights(geminiInsights || "No insights available.");
        } else {
            setAiInsights("Connect to the backend to see insights.");
        }
      }
    } catch (error) {
      console.error(error);
      setAiInsights("Error loading insights. Check API connection.");
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && !aiInsights) {
      fetchAIInsights();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#001F3F] text-white">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold italic">Loading K-L Recycling CRM...</h2>
        <p className="text-sm opacity-60 mt-2">Syncing with Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden">
      
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        refreshData={refreshData}
        loading={loading}
        prospects={prospects}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onAddProspect={handleAddProspect}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 capitalize">
            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search CRM..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-full text-sm focus:bg-white focus:ring-2 focus:ring-[#001F3F] transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="bg-[#001F3F] text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 hover:bg-[#003D7A] shadow-md transition-all">
              <Plus size={18} /> New Prospect
            </button>
          </div>
        </header>

        {/* Environment Warnings */}
        {envWarnings.length > 0 && (
          <div className="mx-8 mb-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2">Configuration Required</h3>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {envWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-600 mt-2">
                    Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file in the project root with the required variables.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Prospects" value={stats.total} color={BRAND_COLORS.navy} icon={<Users size={20} />} />
                <StatCard title="Hot Leads" value={stats.hot} color={BRAND_COLORS.danger} icon={<TrendingUp size={20} />} />
                <StatCard title="Won Customers" value={stats.won} color={BRAND_COLORS.success} icon={<DollarSign size={20} />} />
                <StatCard title="Avg Priority" value={`${stats.avgPriority}/100`} color={BRAND_COLORS.info} icon={<TrendingUp size={20} />} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-800">Industry Distribution</h3>
                  <div className="h-64">
                    {industryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={industryData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} />
                          <YAxis axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {industryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? BRAND_COLORS.navy : BRAND_COLORS.navyLight} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">No industry data found.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-800">Pipeline Stages</h3>
                  <div className="h-64 flex flex-col justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Hot', value: prospects.filter(p => p.contactStatus === ContactStatus.HOT).length },
                            { name: 'Warm', value: prospects.filter(p => p.contactStatus === ContactStatus.WARM).length },
                            { name: 'Cold', value: prospects.filter(p => p.contactStatus === ContactStatus.COLD).length },
                          ]}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill={BRAND_COLORS.danger} />
                          <Cell fill={BRAND_COLORS.warning} />
                          <Cell fill={BRAND_COLORS.info} />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 text-xs font-medium text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DC3545]"></span> Hot</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#FFC107]"></span> Warm</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#17A2B8]"></span> Cold</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold mb-4">Urgent Follow-ups</h3>
                <div className="space-y-4">
                  {prospects.filter(p => p.urgencyBand === 'Critical' || p.urgencyBand === 'High').slice(0, 5).map(p => (
                    <div key={p.cid} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-[#001F3F] border">
                          {p.company?.[0] || '?' }
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{p.company}</p>
                          <p className="text-xs text-gray-500">Due: {p.nextStepDue || 'TBD'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          p.urgencyBand === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {p.urgencyBand}
                        </span>
                        <ChevronRight className="text-gray-400" size={20} />
                      </div>
                    </div>
                  ))}
                  {prospects.filter(p => p.urgencyBand === 'Critical' || p.urgencyBand === 'High').length === 0 && (
                    <p className="text-center py-8 text-gray-400 text-sm italic">All clear! No urgent follow-ups today.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'prospects' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Prospect Database</h3>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">Filter</button>
                  <button className="px-4 py-2 bg-[#001F3F] text-white rounded-lg text-sm font-medium hover:bg-[#003D7A]">Sync All</button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Company</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Industry</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">Priority</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase">Last Interaction</th>
                      <th className="p-4 text-xs font-bold text-gray-500 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProspects.map(p => (
                      <tr key={p.cid} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-slate-800">{p.company}</p>
                            <p className="text-xs text-gray-400 truncate w-48">{p.address}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-600">{p.industry}</td>
                        <td className="p-4">
                          <div className="flex justify-center items-center">
                             <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center relative">
                                <span className="text-xs font-bold text-slate-700">{p.priorityScore}</span>
                                <svg className="absolute -inset-1" width="48" height="48">
                                  <circle 
                                    className="text-transparent" 
                                    stroke="currentColor" 
                                    strokeWidth="3" 
                                    fill="transparent" 
                                    r="22" 
                                    cx="24" 
                                    cy="24" 
                                  />
                                  <circle 
                                    className={`${p.priorityScore > 80 ? 'text-[#28A745]' : p.priorityScore > 50 ? 'text-[#FFC107]' : 'text-[#DC3545]'}`} 
                                    stroke="currentColor" 
                                    strokeWidth="3" 
                                    strokeDasharray={138}
                                    strokeDashoffset={138 - (138 * (p.priorityScore || 0)) / 100}
                                    strokeLinecap="round" 
                                    fill="transparent" 
                                    r="22" 
                                    cx="24" 
                                    cy="24" 
                                  />
                                </svg>
                             </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            p.contactStatus === ContactStatus.HOT ? 'bg-red-100 text-red-600' :
                            p.contactStatus === ContactStatus.WARM ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {p.contactStatus}
                          </span>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{p.lastOutcome}</p>
                            <p className="text-xs text-gray-400">{p.lastOutreachDate}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            className="text-[#001F3F] font-bold text-sm hover:underline"
                            onClick={() => handleEditProspect(p)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProspects.length === 0 && (
                  <div className="p-20 text-center text-gray-400">No prospects found matching your search.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="bg-[#001F3F] text-white p-8 rounded-3xl relative overflow-hidden shadow-xl">
                 <div className="relative z-10">
                   <h2 className="text-3xl font-black mb-2">Tyler Market Pricing</h2>
                   <p className="opacity-80 max-w-lg">Live scrap metal values pulled from the Google Sheet. Updated daily for our Tyler recycling partners.</p>
                 </div>
                 <DollarSign className="absolute -right-8 -bottom-8 opacity-10" size={240} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {Array.from(new Set(prices.map(p => p.category))).map(cat => (
                   <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                     <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                       <h4 className="font-black text-sm tracking-widest text-[#001F3F] uppercase">{cat}</h4>
                     </div>
                     <div className="p-4 divide-y">
                       {prices.filter(p => p.category === cat).map(item => (
                         <div key={item.item} className="py-4 flex justify-between items-center">
                           <span className="text-sm font-medium text-slate-600">{item.item}</span>
                           <span className="font-bold text-[#28A745]">${item.max?.toFixed(2) || '0.00'} / lb</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 ))}
                 {prices.length === 0 && (
                   <div className="col-span-full p-20 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                     Sync with spreadsheet to load pricing data.
                   </div>
                 )}
               </div>
            </div>
          )}

          {activeTab === 'routes' && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xl font-bold">Route Optimization</h3>
                    <p className="text-gray-500 text-sm">Automated sales paths based on your current prospect priority list.</p>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[#001F3F] text-white flex items-center justify-center font-bold text-xs">Start</div>
                        <div>
                          <p className="font-bold text-sm text-[#001F3F]">HQ - Chandler Hwy</p>
                          <p className="text-[10px] text-gray-500">{HOME_BASE.address}</p>
                        </div>
                      </div>

                      {prospects.filter(p => p.contactStatus === ContactStatus.HOT).slice(0, 4).map((p, idx) => (
                        <div key={p.cid} className="p-4 bg-white border border-gray-100 rounded-xl flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-slate-600 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                          <div>
                            <p className="font-bold text-sm text-slate-800">{p.company}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{p.urgencyBand || 'Normal'} Priority • {p.industry}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="w-full bg-[#001F3F] text-white py-3 rounded-xl font-bold hover:bg-[#003D7A] shadow-lg flex items-center justify-center gap-2 transition-all">
                      <MapPin size={18} /> Generate New Route
                    </button>
                  </div>

                  <div className="flex-1 bg-slate-100 rounded-2xl min-h-[400px] relative overflow-hidden border">
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-center p-8">
                       <div>
                         <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                         <p className="font-bold text-lg mb-2 text-slate-600">Territory Map View</p>
                         <p className="text-sm">Mapping {prospects.length} locations across Tyler and East Texas.</p>
                       </div>
                    </div>
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
              <div className="bg-gradient-to-br from-[#001F3F] to-[#003D7A] p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                    <Sparkles size={14} /> AI Advisor Powered by Gemini
                  </div>
                  <h2 className="text-4xl font-black mb-4">Tyler Sales Intelligence</h2>
                  <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
                    Analyzing {prospects.length} accounts to find your next major manufacturing partner.
                  </p>
                </div>
                <Sparkles className="absolute -right-12 -top-12 text-white/10" size={320} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                         <MessageSquare className="text-blue-600" size={24} /> Strategic Analysis
                      </h3>
                      <button
                        onClick={fetchAIInsights}
                        disabled={loadingAi || prospects.length === 0}
                        className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 disabled:opacity-30"
                      >
                        {loadingAi ? (
                          <><RefreshCw size={16} className="animate-spin" /> Analyzing...</>
                        ) : (
                          <><RefreshCw size={16} /> Refresh Recommendations</>
                        )}
                      </button>
                    </div>

                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap text-slate-600 leading-relaxed font-medium min-h-[200px]">
                        {aiInsights || "Generating data-driven insights for East Texas scrap markets..."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-slate-800 mb-4">Competitor Poaching Zone</h4>
                      <div className="space-y-4">
                        {prospects.filter(p => p.competitorMentioned).slice(0, 2).map(p => (
                          <div key={p.cid} className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-black text-red-700 uppercase tracking-widest mb-1">High Risk</p>
                            <p className="font-bold text-slate-800">{p.company}</p>
                            <p className="text-xs text-slate-500 mt-1">Currently using <span className="font-bold">{p.competitorMentioned}</span></p>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                      <h4 className="font-bold text-slate-800 mb-4">Active Sales Reps</h4>
                      <div className="space-y-4">
                        {['Sales Team Alpha'].map(team => (
                          <div key={team} className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">K</div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">K-L Tyler Rep</p>
                                <p className="text-[10px] text-gray-400">Last activity: Today</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-slate-300 group-hover:text-blue-600 transition-colors">75 pts</span>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <DataImport onDataImported={handleDataImported} />
            </div>
          )}

          {activeTab === 'log-visit' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Log Sales Visit</h2>
                  <p className="text-gray-600">Record your interaction with a prospect and update the CRM</p>
                </div>

                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company ID *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                        placeholder="e.g., CID-001"
                        value={logVisitForm.cid}
                        onChange={(e) => setLogVisitForm(prev => ({ ...prev, cid: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                        placeholder="e.g., ABC Manufacturing"
                        value={logVisitForm.company}
                        onChange={(e) => setLogVisitForm(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Outcome *</label>
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                      title="Select the outcome of the sales visit"
                      value={logVisitForm.outcome}
                      onChange={(e) => setLogVisitForm(prev => ({ ...prev, outcome: e.target.value }))}
                    >
                      <option value="">Select an outcome...</option>
                      <option value="Send Info">Send Info</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Quote Requested">Quote Requested</option>
                      <option value="Won">Won</option>
                      <option value="Lost">Lost</option>
                      <option value="No Answer">No Answer</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent h-32 resize-none"
                      placeholder="Describe what happened during the visit..."
                      value={logVisitForm.notes}
                      onChange={(e) => setLogVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Next Visit Date (Optional)</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001F3F] focus:border-transparent"
                      title="Select the date for the next visit"
                      value={logVisitForm.nextVisitDate}
                      onChange={(e) => setLogVisitForm(prev => ({ ...prev, nextVisitDate: e.target.value }))}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleLogVisit}
                    disabled={logVisitLoading}
                    className="w-full bg-[#001F3F] text-white py-4 px-6 rounded-lg font-semibold hover:bg-[#003D7A] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {logVisitLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Logging Visit...
                      </>
                    ) : (
                      <>
                        <FileText size={20} />
                        Log Visit
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <AddProspectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveProspect}
        initialData={editingProspect}
      />
    </div>
  );
};

export default App;
