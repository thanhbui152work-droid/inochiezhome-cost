import React, { useState, useEffect } from 'react';
import { MainProduct, CogsProduct, StockRecord } from './types';
import Dashboard from './components/Dashboard';
import StudyCenter from './components/StudyCenter';
import AIConsultant from './components/AIConsultant';
import PricingCalculator from './components/PricingCalculator';
import SheetImporter from './components/SheetImporter';
import { 
  LayoutDashboard, Brain, Calculator, Sparkles, 
  HelpCircle, RefreshCw, Layers, GraduationCap, Gift, ChevronRight, FileSpreadsheet,
  ArrowUp
} from 'lucide-react';

declare global {
  interface Window {
    showImagePreview?: (src: string) => void;
  }
}

type NavTab = 'dashboard' | 'pricing' | 'study' | 'advisor' | 'sheet-importer';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mainProducts, setMainProducts] = useState<MainProduct[]>([]);
  const [tiktokProducts, setTiktokProducts] = useState<MainProduct[]>([]);
  const [cogsProducts, setCogsProducts] = useState<CogsProduct[]>([]);
  const [stockRecords, setStockRecords] = useState<StockRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetSource, setSheetSource] = useState<string>('live_google_sheet');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
        setStockRecords(data.stock || []);
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

  // Listen for scroll to show Back to Top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bind global image preview action
  useEffect(() => {
    window.showImagePreview = (src: string) => {
      setPreviewImage(src);
    };
    return () => {
      delete window.showImagePreview;
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

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
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        
        {/* Horizontal Navigation Menu */}
        <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-xs border border-slate-200/95 rounded-2xl p-2 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 select-none">
          <div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 scrollbar-thin [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-indigo-200 [&::-webkit-scrollbar-thumb]:rounded-full whitespace-nowrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/40 border border-indigo-700/10'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Bảng Giá & Quà Tặng</span>
            </button>

            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/40 border border-indigo-700/10'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <Calculator size={14} />
              <span>Bảng Tính Giá Chi Tiết</span>
            </button>

            <button
              onClick={() => setActiveTab('study')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'study'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/40 border border-indigo-700/10'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <GraduationCap size={14} />
              <span>Cẩm Nang & Luật Sàn</span>
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'advisor'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/40 border border-indigo-700/10'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <Sparkles size={14} />
              <span>Cố Vấn Chiến Lược AI</span>
            </button>

            <button
              onClick={() => setActiveTab('sheet-importer')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all duration-150 shrink-0 cursor-pointer ${
                activeTab === 'sheet-importer'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150/40 border border-indigo-700/10'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 shadow-3xs'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>Nhập Từ Google Sheet</span>
            </button>
          </div>

          {/* Quick Info text / small badge replacing Grounding AI */}
          <div className="hidden lg:flex items-center gap-2 pr-2 text-right shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Grounding AI Active
            </span>
          </div>
        </div>

        {/* Active Panel Content Container */}
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
                  stockRecords={stockRecords}
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
              {activeTab === 'sheet-importer' && (
                <SheetImporter 
                  mainProducts={mainProducts} 
                  cogsProducts={cogsProducts} 
                  stockRecords={stockRecords}
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

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          id="back-to-top-btn"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-indigo-500/30 border border-indigo-500/20 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center group"
          title="Lên đầu trang"
        >
          <ArrowUp size={18} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
        </button>
      )}

      {/* Elegant Infinite Image Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in cursor-zoom-out select-none"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 active:scale-95 text-white p-2 rounded-full transition cursor-pointer"
              aria-label="Đóng"
            >
              <span className="text-xl font-bold px-1.5">✕</span>
            </button>
            <img 
              src={previewImage} 
              alt="Bản xem trước" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600";
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
