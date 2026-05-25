import React, { useState, useMemo } from 'react';
import { MainProduct, CogsProduct } from '../types';
import { 
  Search, SlidersHorizontal, Table, Grid, Info, ArrowUpRight, 
  ArrowDownRight, Check, CheckCircle2, HelpingHand, Gift, ExternalLink,
  ChevronRight, ArrowUpDown
} from 'lucide-react';

interface DashboardProps {
  mainProducts: MainProduct[];
  cogsProducts: CogsProduct[];
  isLoading: boolean;
  onRefresh: () => void;
  source: string;
}

export default function Dashboard({ mainProducts, cogsProducts, isLoading, onRefresh, source }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'gifts'>('main');
  const [activeMainView, setActiveMainView] = useState<'card' | 'table'>('card');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<{ [key: string]: number }>({});
  
  // Search and filter states
  const [mainSearch, setMainSearch] = useState('');
  const [giftSearch, setGiftSearch] = useState('');
  const [giftCategory, setGiftCategory] = useState<string>('all');
  const [giftSort, setGiftSort] = useState<'cogs-asc' | 'cogs-desc' | 'name' | 'rsp-desc'>('cogs-asc');
  const [mainFilter, setMainFilter] = useState<'all' | 'noichien' | 'banchai' | 'tamnuoc'>('all');

  // Format currency in VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (mainProducts.length === 0) return { totalProducts: 0, avgMargin: 0, cheapestGift: 0 };
    
    // Gift margins and statistics
    const inochiGifts = cogsProducts.filter(p => p.name.startsWith('Inochi') || p.name.includes('Omi') || p.name.includes('Goki') || p.name.includes('Yoko') || p.name.includes('Kita'));
    const cheapGift = inochiGifts.length > 0 ? Math.min(...inochiGifts.map(p => p.cogs)) : 0;
    
    // Average Margin of main products at BAU price: (BAU - COGS) / BAU
    let totalMarginPct = 0;
    let validCount = 0;
    mainProducts.forEach(p => {
      if (p.bau > 0) {
        totalMarginPct += (p.bau - p.cogs) / p.bau;
        validCount++;
      }
    });
    
    return {
      totalProducts: mainProducts.length,
      avgMargin: validCount > 0 ? (totalMarginPct / validCount) * 100 : 0,
      cheapestGift: cheapGift,
      giftCount: inochiGifts.length
    };
  }, [mainProducts, cogsProducts]);

  // Main Products Filtering logic
  const filteredMainProducts = useMemo(() => {
    return mainProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(mainSearch.toLowerCase()) || 
                            p.vpCode.toLowerCase().includes(mainSearch.toLowerCase());
      
      let matchesFilter = true;
      if (mainFilter === 'noichien') matchesFilter = p.name.toLowerCase().includes('nồi chiên') || p.name.toLowerCase().includes('nồi cơm');
      if (mainFilter === 'banchai') matchesFilter = p.name.toLowerCase().includes('bàn chải') || p.name.toLowerCase().includes('đầu bản');
      if (mainFilter === 'tamnuoc') matchesFilter = p.name.toLowerCase().includes('tăm nước');
      
      return matchesSearch && matchesFilter;
    });
  }, [mainProducts, mainSearch, mainFilter]);

  // Group Main Products (Appliances) for Card Grid view
  const groupedMainProducts = useMemo(() => {
    const groups: { [key: string]: {
      groupKey: string;
      name: string;
      img: string;
      category: string;
      variants: MainProduct[];
      minRsp: number;
      maxRsp: number;
    }} = {};

    filteredMainProducts.forEach(p => {
      let groupKey = "other";
      let groupName = "Sản phẩm khác";
      let groupCategory = "Gia dụng cao cấp";

      const nameLower = p.name.toLowerCase();
      if (nameLower.includes("nồi chiên")) {
        groupKey = "noichien";
        groupName = "Nồi chiên không dầu Inochi";
        groupCategory = "Gia dụng thông minh";
      } else if (nameLower.includes("nồi cơm")) {
        groupKey = "noicom";
        groupName = "Nồi cơm cao tần Inochi";
        groupCategory = "Gia dụng thông minh";
      } else if (nameLower.includes("máy rửa rau")) {
        groupKey = "mayruarau";
        groupName = "Máy rửa rau quả thông minh";
        groupCategory = "Sức khỏe gia đình";
      } else if (nameLower.includes("ấm đun")) {
        groupKey = "amdun";
        groupName = "Ấm đun nước siêu tốc Inochi";
        groupCategory = "Gia dụng thông minh";
      } else if (nameLower.includes("tăm nước")) {
        groupKey = "tamnuoc";
        groupName = "Máy tăm nước Inochi";
        groupCategory = "Chăm sóc răng miệng";
      } else if (nameLower.includes("bàn chải")) {
        groupKey = "banchai";
        groupName = "Bàn chải thông minh Inochi";
        groupCategory = "Chăm sóc cá nhân";
      } else if (nameLower.includes("đầu bàn chải")) {
        groupKey = "daubanchai";
        groupName = "Đầu bàn chải điện thay thế";
        groupCategory = "Phụ kiện đi kèm";
      } else {
        groupKey = p.name;
        groupName = p.name;
      }

      if (!groups[groupKey]) {
        // High-quality bright Unsplash match
        let img = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500";
        if (p.img && p.img.trim() !== "" && !p.img.includes("placeholder")) {
          img = p.img.trim();
        } else {
          if (groupKey === "noichien") img = "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=500";
          if (groupKey === "noicom") img = "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=500";
          if (groupKey === "mayruarau") img = "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=500";
          if (groupKey === "amdun") img = "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500";
          if (groupKey === "tamnuoc") img = "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500";
          if (groupKey === "banchai") img = "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=500";
          if (groupKey === "daubanchai") img = "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=500";
        }

        groups[groupKey] = {
          groupKey,
          name: groupName,
          img: img,
          category: groupCategory,
          variants: [],
          minRsp: Infinity,
          maxRsp: -Infinity,
        };
      }

      if (p.img && p.img.trim() !== "" && !p.img.includes("placeholder")) {
        groups[groupKey].img = p.img.trim();
      }

      groups[groupKey].variants.push(p);
      if (p.rsp < groups[groupKey].minRsp) groups[groupKey].minRsp = p.rsp;
      if (p.rsp > groups[groupKey].maxRsp) groups[groupKey].maxRsp = p.rsp;
    });

    return Object.values(groups);
  }, [filteredMainProducts]);

  // Gift Categories list
  const giftCategories = useMemo(() => {
    const cats = new Set<string>();
    cogsProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [cogsProducts]);

  // Group and Filter Gift Products by MAIN SKU
  const groupedGifts = useMemo(() => {
    const groups: { [key: string]: {
      mainSku: string;
      name: string;
      img: string;
      category: string;
      filter: string;
      variants: CogsProduct[];
      minCogs: number;
      maxCogs: number;
    }} = {};

    cogsProducts.forEach(p => {
      const key = p.mainSku || p.skuPhanLoai || p.name;
      if (!groups[key]) {
        // Fallback placeholder images if sheet link is missing
        let defaultImg = "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400";
        if (key.includes("HNK.NC61")) defaultImg = "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400";
        if (key.includes("AK40") || key.includes("NCKD")) defaultImg = "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400";
        if (key.includes("OCOD") || key.includes("NCCT")) defaultImg = "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=400";
        if (key.includes("CRCD") || key.includes("OS")) defaultImg = "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400";
        if (key.includes("BIGR") || key.includes("BIKG")) defaultImg = "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400";

        groups[key] = {
          mainSku: key,
          name: p.name,
          img: p.img || defaultImg,
          category: p.category || "Quà tặng",
          filter: p.filter,
          variants: [],
          minCogs: Infinity,
          maxCogs: -Infinity
        };
      }
      
      groups[key].variants.push(p);
      if (p.cogs < groups[key].minCogs) groups[key].minCogs = p.cogs;
      if (p.cogs > groups[key].maxCogs) groups[key].maxCogs = p.cogs;
      
      if (p.img && p.img !== "" && !p.img.includes("placeholder")) {
        groups[key].img = p.img;
      }
    });

    let list = Object.values(groups);

    // Filter list
    list = list.filter(g => {
      const matchesSearch = g.name.toLowerCase().includes(giftSearch.toLowerCase()) || 
                            g.mainSku.toLowerCase().includes(giftSearch.toLowerCase()) ||
                            g.variants.some(v => v.skuPhanLoai.toLowerCase().includes(giftSearch.toLowerCase()));
      
      const matchesCategory = giftCategory === 'all' || g.category === giftCategory;
      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    return list.sort((a, b) => {
      if (giftSort === 'cogs-asc') return a.minCogs - b.minCogs;
      if (giftSort === 'cogs-desc') return b.maxCogs - a.maxCogs;
      if (giftSort === 'rsp-desc') {
        const maxARsp = Math.max(...a.variants.map(v => v.rsp));
        const maxBRsp = Math.max(...b.variants.map(v => v.rsp));
        return maxBRsp - maxARsp;
      }
      if (giftSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [cogsProducts, giftSearch, giftCategory, giftSort]);

  return (
    <div className="space-y-6">
      {/* Upper Meta-Information */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-slate-900">
            Bảng Điều Khiển Giá & COGS
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dữ liệu kết nối từ Google Sheets (đã tải tự động từ file master)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            source === 'live_google_sheet' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${source === 'live_google_sheet' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {source === 'live_google_sheet' ? 'Đã đồng bộ Live Google Sheet' : 'Dữ liệu Dự phòng (Offline)'}
          </span>
          <button 
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 shadow-xs hover:border-slate-300 font-bold focus:outline-none transition disabled:opacity-50 cursor-pointer"
          >
            <span className={`${isLoading ? 'animate-spin' : ''}`}>↻</span> Đồng bộ lại
          </button>
        </div>
      </div>

      {/* Stats Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Sản phẩm chính</span>
            <div className="bg-slate-50 p-2 rounded-xl text-slate-600">
              <Table size={16} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black tracking-tight text-slate-900">{stats.totalProducts}</span>
            <span className="text-xs text-slate-500 block mt-1">Sản phẩm cốt lõi trong chính sách</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Lợi nhuận gộp BAU</span>
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black tracking-tight text-emerald-600">~{stats.avgMargin.toFixed(1)}%</span>
            <span className="text-xs text-slate-500 block mt-1">Biên lợi nhuận trung bình ở giá BAU</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Quà tặng COGS</span>
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
              <Gift size={16} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black tracking-tight text-indigo-600">{stats.giftCount}</span>
            <span className="text-xs text-slate-500 block mt-1">Vật phẩm quà tặng Inochi có sẵn</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs hover:shadow-sm transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Cost quà thấp nhất</span>
            <div className="bg-purple-50 p-2 rounded-xl text-purple-600">
              <Info size={16} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black tracking-tight text-purple-600">{formatVND(stats.cheapestGift)}</span>
            <span className="text-xs text-slate-500 block mt-1">Tối ưu cho ngân sách thấp</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="bg-slate-100 p-1 rounded-xl inline-flex gap-1 border border-slate-200/50 shadow-2xs">
        <button
          onClick={() => setActiveTab('main')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition cursor-pointer ${
            activeTab === 'main'
              ? 'bg-white shadow-sm text-indigo-700 border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Sản phẩm chính & Bảng giá bán
        </button>
        <button
          onClick={() => setActiveTab('gifts')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition cursor-pointer ${
            activeTab === 'gifts'
              ? 'bg-white shadow-sm text-indigo-700 border border-slate-200/50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Danh mục Quà tặng & COGS Cost
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {activeTab === 'main' ? (
          <div>
            {/* Main Products Filtering and Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col xl:flex-row gap-4 items-center justify-between bg-slate-50/50">
              <div className="relative w-full xl:max-w-xs">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm chính..."
                  value={mainSearch}
                  onChange={(e) => setMainSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400"
                />
              </div>

              {/* Filtering Chips */}
              <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <SlidersHorizontal size={12} /> Dòng hàng:
                </span>
                {(['all', 'noichien', 'banchai', 'tamnuoc'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setMainFilter(f)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition cursor-pointer ${
                      mainFilter === f
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f === 'all' && 'Tất cả'}
                    {f === 'noichien' && 'Nồi chiên / Cơm điện'}
                    {f === 'banchai' && 'Bàn chải / Đầu chải'}
                    {f === 'tamnuoc' && 'Tăm nước'}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Grid Cards vs Excel spreadsheet */}
              <div className="flex gap-1 p-1 bg-slate-250/50 rounded-xl border border-slate-200 shrink-0 w-full xl:w-auto justify-center xl:justify-start">
                <button
                  type="button"
                  onClick={() => setActiveMainView('card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMainView === 'card'
                      ? 'bg-white text-indigo-700 shadow-3xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid size={13} />
                  Dạng Thẻ Đã Gom Nhóm
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainView('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMainView === 'table'
                      ? 'bg-white text-indigo-700 shadow-3xs border border-slate-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table size={13} />
                  Dạng Bảng (Excel)
                </button>
              </div>
            </div>

            {/* Layout Switch Option */}
            {activeMainView === 'card' ? (
              /* CARD GRID VIEW - Grouped beautiful layouts */
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 bg-slate-50/30">
                {groupedMainProducts.length > 0 ? (
                  groupedMainProducts.map((p) => {
                    const activeVariantIdx = selectedVariantIndex[p.groupKey] ?? 0;
                    // safe boundary fallbacks
                    const activeVariantIdxFloored = activeVariantIdx >= p.variants.length ? 0 : activeVariantIdx;
                    const activeVariant = p.variants[activeVariantIdxFloored] || p.variants[0];
                    if (!activeVariant) return null;

                    const marginBau = activeVariant.bau > 0 ? ((activeVariant.bau - (activeVariant.cogsUpdated || activeVariant.cogs)) / activeVariant.bau) * 100 : 0;

                    return (
                      <div 
                        key={p.groupKey}
                        className="border border-slate-200 rounded-2xl bg-white shadow-2xs hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between"
                      >
                        {/* Img Visual and overlays */}
                        <div className="relative h-48 w-full bg-slate-50 flex items-center justify-center shrink-0 border-b border-slate-100">
                          <img 
                            src={(activeVariant.img && activeVariant.img.trim() !== "" && !activeVariant.img.includes("placeholder")) ? activeVariant.img.trim() : p.img} 
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition duration-300 hover:scale-103"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500";
                            }}
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-white/95 backdrop-blur-xs text-indigo-700 shadow-xs uppercase tracking-wider border border-slate-150">
                              {p.category}
                            </span>
                            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-600 text-white shadow-xs uppercase tracking-wide">
                              {p.variants.length} Phân loại
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base leading-snug tracking-tight">
                              {p.name}
                            </h3>

                            {/* Variant Select Pills */}
                            <div className="mt-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                                Bản kích thước / Phân loại:
                              </span>
                              <div className="flex flex-wrap gap-1.5 max-h-[76px] overflow-y-auto pr-1">
                                {p.variants.map((v, vIdx) => {
                                  // Clean up variant name label matching
                                  let pillLabel = v.name;
                                  pillLabel = pillLabel.replace(p.name, "").replace("Inochi", "").trim();
                                  if (pillLabel === "") {
                                    pillLabel = v.vpCode || "Bản chuẩn";
                                  }
                                  const isSelected = activeVariantIdxFloored === vIdx;

                                  return (
                                    <button
                                      key={vIdx}
                                      type="button"
                                      onClick={() => setSelectedVariantIndex(prev => ({ ...prev, [p.groupKey]: vIdx }))}
                                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-2xs'
                                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                      }`}
                                    >
                                      {pillLabel}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Target Details Grid */}
                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                              <div className="flex justify-between items-baseline gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Tên đầy đủ:</span>
                                <span className="text-xs font-bold text-slate-800 text-right truncate block max-w-[200px]">
                                  {activeVariant.name}
                                </span>
                              </div>

                              <div className="flex justify-between items-baseline">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Mã hàng:</span>
                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {activeVariant.vpCode || "Chưa thiết lập"}
                                </span>
                              </div>

                              {/* Progress bar ratio visualizer */}
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150/60 space-y-1.5">
                                <div className="flex justify-between text-[11px] items-center">
                                  <span className="font-semibold text-slate-500">Tỷ lệ Vốn / Niêm yết</span>
                                  <span className="font-bold font-mono text-rose-600">
                                    {formatVND(activeVariant.cogsUpdated || activeVariant.cogs)} / {formatVND(activeVariant.rsp)}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-rose-500 rounded-full"
                                    style={{ width: `${Math.min(100, (((activeVariant.cogsUpdated || activeVariant.cogs) / activeVariant.rsp) * 100))}%` }}
                                  />
                                </div>
                              </div>

                              {/* Pricing thresholds */}
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-150/40 flex justify-between items-center">
                                  <span className="text-slate-400 font-bold font-mono">MIN:</span>
                                  <span className="font-extrabold text-slate-700 font-mono">{formatVND(activeVariant.minPrice)}</span>
                                </div>
                                <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-150/40 flex justify-between items-center">
                                  <span className="text-purple-500 font-bold font-mono">KOL:</span>
                                  <span className="font-extrabold text-purple-700 font-mono">{formatVND(activeVariant.kolPrice)}</span>
                                </div>
                                <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-150/40 flex justify-between items-center">
                                  <span className="text-sky-500 font-bold font-mono">SPIKE:</span>
                                  <span className="font-extrabold text-sky-700 font-mono">{formatVND(activeVariant.spike)}</span>
                                </div>
                                <div className="bg-slate-50/60 p-2 rounded-lg border border-slate-150/40 flex justify-between items-center">
                                  <span className="text-amber-500 font-bold font-mono">MINI:</span>
                                  <span className="font-extrabold text-amber-700 font-mono">{formatVND(activeVariant.miniSpike)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Cards Footers */}
                          <div className="mt-4 pt-3.5 border-t border-slate-150/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block leading-none">Giá bán BAU:</span>
                              <span className="text-sm font-black text-slate-900 font-mono block mt-1">
                                {formatVND(activeVariant.bau)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block leading-none">Biên gộp BAU:</span>
                              <span className={`inline-flex items-center gap-1 text-xs font-mono font-extrabold mt-1 px-2.5 py-0.5 rounded-lg ${
                                marginBau >= 50
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                  : 'bg-amber-50 text-amber-700 border border-amber-250/50'
                              }`}>
                                {marginBau > 0 ? `${marginBau.toFixed(1)}%` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-16 text-center text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                    Không tìm thấy sản phẩm chính nào khớp với bộ lọc hiện tại.
                  </div>
                )}
              </div>
            ) : (
              /* SPREADSHEET TABLE VIEW - raw table comparison */
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">
                      <th className="py-3 px-4 min-w-[200px]">Tên sản phẩm chính</th>
                      <th className="py-3 px-3 text-right">RSP (Niêm yết)</th>
                      <th className="py-3 px-3 text-right bg-rose-50/40 text-rose-800">COGS vốn</th>
                      <th className="py-3 px-3 text-right">Giá Min</th>
                      <th className="py-3 px-3 text-right text-purple-800">Giá KOL</th>
                      <th className="py-3 px-3 text-right text-sky-800 font-semibold">Giá SPIKE</th>
                      <th className="py-3 px-3 text-right text-amber-800">Mini SPIKE</th>
                      <th className="py-3 px-3 text-right text-emerald-800">Giá BAU</th>
                      <th className="py-3 px-4 text-center font-bold">Margin BAU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredMainProducts.length > 0 ? (
                      filteredMainProducts.map((p, idx) => {
                        const marginBau = p.bau > 0 ? ((p.bau - (p.cogsUpdated || p.cogs)) / p.bau) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition leading-normal">
                            <td className="py-3.5 px-4 font-semibold text-slate-900">
                              <div className="font-bold text-slate-900 leading-tight">{p.name}</div>
                              <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                                {p.barcode && <span>BC: {p.barcode}</span>}
                                {p.vpCode && <span>VP: {p.vpCode}</span>}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right font-mono text-slate-600">{formatVND(p.rsp)}</td>
                            <td className="py-3.5 px-3 text-right font-bold font-mono bg-rose-50/20 text-rose-700">{formatVND(p.cogsUpdated || p.cogs)}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-slate-500">{formatVND(p.minPrice)}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-purple-700">{formatVND(p.kolPrice)}</td>
                            <td className="py-3.5 px-3 text-right font-bold font-mono text-sky-700 bg-sky-50/10">{formatVND(p.spike)}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-amber-700">{formatVND(p.miniSpike)}</td>
                            <td className="py-3.5 px-3 text-right font-bold font-mono text-emerald-700 bg-emerald-50/10">{formatVND(p.bau)}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                                marginBau > 50 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {marginBau.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-sm text-slate-400">
                          Không tìm thấy sản phẩm cốt lõi nào khớp với tiêu chí tìm kiếm.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Gift List Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm quà tặng Inochi..."
                  value={giftSearch}
                  onChange={(e) => setGiftSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/25 placeholder-slate-400"
                />
              </div>

              {/* Sorting & Category Filtering */}
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-stretch sm:items-center">
                <div className="flex items-center gap-1">
                  <SlidersHorizontal size={14} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 mr-2 uppercase tracking-wide">Nhóm hàng:</span>
                </div>
                
                <select 
                  value={giftCategory}
                  onChange={(e) => setGiftCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  {giftCategories.filter(c => c !== 'all').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select 
                  value={giftSort}
                  onChange={(e) => setGiftSort(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 font-bold text-slate-700 cursor-pointer"
                >
                  <option value="cogs-asc">Giá Cost (Vốn): Thấp đến Cao</option>
                  <option value="cogs-desc">Giá Cost (Vốn): Cao đến Thấp</option>
                  <option value="rsp-desc">Giá RSP (Niêm yết): Cao đến Thấp</option>
                  <option value="name">Tên sản phẩm (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Grouped Gift Product Cards Grid */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {groupedGifts.length > 0 ? (
                groupedGifts.map((p, idx) => {
                  return (
                    <div 
                      key={idx} 
                      className="border border-slate-200 rounded-2xl bg-white shadow-2xs hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between"
                    >
                      {/* Product Image and Category overlay badge */}
                      <div className="relative h-44 w-full bg-slate-50 flex items-center justify-center shrink-0">
                        <img 
                          src={p.img} 
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition duration-300 hover:scale-103"
                          onError={(e) => {
                            // simple fallback placeholder if sheet URL fails
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400";
                          }}
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-white/95 backdrop-blur-xs text-slate-600 shadow-xs uppercase tracking-wider border border-slate-200/50">
                            {p.category}
                          </span>
                          {p.filter && (
                            <span className="bg-amber-500/90 backdrop-blur-xs text-white rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold shadow-xs">
                              {p.filter}
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono font-semibold">
                          Main SKU: {p.mainSku}
                        </div>
                      </div>

                      {/* Info & Variations */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm mt-1 line-clamp-2 leading-snug">
                            {p.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-medium font-mono mt-1">
                            Có ({p.variants.length}) phân loại sản phẩm
                          </p>

                          {/* Variations List */}
                          <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3 max-h-[160px] overflow-y-auto pr-1">
                            {p.variants.map((v, vidx) => (
                              <div key={vidx} className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                                <div>
                                  <span className="font-bold text-slate-700 block">
                                    {v.size || v.color ? `${v.size || ''} ${v.color || ''}`.trim() : 'Mã chuẩn'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block leading-tight">{v.skuPhanLoai}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-extrabold text-rose-600 block">{formatVND(v.cogs)}</span>
                                  <span className="text-[10px] text-slate-400 line-through block leading-tight">{formatVND(v.rsp)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Combined Cost Summary */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-slate-500">Biên Cost vốn:</span>
                          <span className="font-extrabold text-rose-600 font-mono">
                            {p.variants.length === 1 
                              ? formatVND(p.minCogs) 
                              : `${formatVND(p.minCogs)} - ${formatVND(p.maxCogs)}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-16 text-center text-sm text-slate-400">
                  Không tìm thấy quà tặng nào đáp ứng bộ lọc hiện tại.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
