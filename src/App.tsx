import React, { useState, useEffect } from 'react';
import { MainProduct, CogsProduct } from './types';
import Dashboard from './components/Dashboard';
import StudyCenter from './components/StudyCenter';
import AIConsultant from './components/AIConsultant';
import PricingCalculator from './components/PricingCalculator';
import { 
  LayoutDashboard, Brain, Calculator, Sparkles, 
  HelpCircle, RefreshCw, Layers, GraduationCap, Gift, ChevronRight
} from 'lucide-react';

type NavTab = 'dashboard' | 'pricing' | 'study' | 'advisor';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mainProducts, setMainProducts] = useState<MainProduct[]>([]);
  const [tiktokProducts, setTiktokProducts] = useState<MainProduct[]>([]);
  const [cogsProducts, setCogsProducts] = useState<CogsProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetSource, setSheetSource] = useState<string>('live_google_sheet');

  // Load backend Google Sheet data on mount
  const loadSheetData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sheets-data');
      const data = await res.json();
      if (data.main && data.cogs) {
        setMainProducts(data.main);
        setTiktokProducts(data.tiktok || data.main);
        setCogsProducts(data.cogs);
        setSheetSource(data.source || 'live_google_sheet');
      } else {
        throw new Error("Invalid schema received");
      }
    } catch (err) {
      console.warn("Could not download live sheet data, falling back gracefully");
      setSheetSource('fallback_embedded');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSheetData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      
      {/* Top Professional Navigation Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 text-white p-2 rounded-lg flex items-center justify-center shadow-sm">
                <Layers size={18} />
              </div>
              <div>
                <span className="font-sans font-extrabold text-sm tracking-tight text-slate-900 block">Inochi Ez Home</span>
                <span className="text-[10px] text-slate-400 font-medium block leading-none">Tối ưu Giá & Quà tặng v1.2</span>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Bản ghi:</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                sheetSource === 'live_google_sheet' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-250'
                  : 'bg-amber-50 text-amber-700 border border-amber-250'
              }`}>
                {sheetSource === 'live_google_sheet' ? 'Live Sheets Kết Nối' : 'Offline Cached Data'}
              </span>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Core Layout Grid */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar Menu Rail */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold tracking-wide transition uppercase cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/50 border border-indigo-700/10'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard size={15} /> Bảng Giá & Quà Tặng
            </span>
            <ChevronRight size={12} className={activeTab === 'dashboard' ? 'opacity-100' : 'opacity-40'} />
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold tracking-wide transition uppercase cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/50 border border-indigo-700/10'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Calculator size={15} /> Bảng Tính Giá Chi Tiết
            </span>
            <ChevronRight size={12} className={activeTab === 'pricing' ? 'opacity-100' : 'opacity-40'} />
          </button>

          <button
            onClick={() => setActiveTab('study')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold tracking-wide transition uppercase cursor-pointer ${
              activeTab === 'study'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/50 border border-indigo-700/10'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <GraduationCap size={15} /> Cẩm Nang & Luật Sàn
            </span>
            <ChevronRight size={12} className={activeTab === 'study' ? 'opacity-100' : 'opacity-40'} />
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold tracking-wide transition uppercase cursor-pointer ${
              activeTab === 'advisor'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100/50 border border-indigo-700/10'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Sparkles size={15} /> Cố Vấn Chiến Lược AI
            </span>
            <ChevronRight size={12} className={activeTab === 'advisor' ? 'opacity-100' : 'opacity-40'} />
          </button>

          <div className="mt-5 p-5 bg-indigo-900 text-white rounded-2xl shadow-sm hidden lg:block leading-relaxed">
            <h4 className="font-semibold text-xs text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-400" /> Grounding AI
            </h4>
            <p className="text-[11px] text-indigo-100 mt-2">
              Bản điều phối tích hợp rà quét giá đối thủ thời gian thực và cân bằng định lượng vật phẩm quà tặng Inochi nhằm bảo đảm biên lợi nhuận ròng tốt nhất.
            </p>
          </div>
        </div>

        {/* Right Active Panel Content Container */}
        <div className="flex-1 flex flex-col min-w-0">
          {isLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center space-y-4 shadow-sm my-auto">
              <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Đang đồng bộ cổng dữ liệu</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Tải bảng tính trực tiếp từ Google Sheets học giá bán, chiết khấu và danh mục quà tặng COGS mới nhất...
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in flex-1">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  mainProducts={mainProducts} 
                  cogsProducts={cogsProducts} 
                  isLoading={isLoading} 
                  onRefresh={loadSheetData}
                  source={sheetSource}
                />
              )}
              {activeTab === 'pricing' && (
                <PricingCalculator 
                  shopeeProducts={mainProducts} 
                  tiktokProducts={tiktokProducts} 
                  cogsProducts={cogsProducts} 
                />
              )}

              {activeTab === 'study' && (
                <StudyCenter 
                  mainProducts={mainProducts} 
                />
              )}
              {activeTab === 'advisor' && (
                <AIConsultant 
                  mainProducts={mainProducts} 
                  cogsProducts={cogsProducts} 
                />
              )}
            </div>
          )}
        </div>

      </div>

      {/* Footer minimal label */}
      <footer className="bg-white/40 border-t border-slate-200 py-3 text-center text-[10px] text-slate-400 font-mono tracking-wider">
        Copyright © 2026 Inochi Enterprise Solution. All rights reserved.
      </footer>

    </div>
  );
}
