import React, { useState, useMemo, useEffect, useRef } from 'react';
import { GMDailyData, GMDailyColumn } from '../types';
import { 
  TrendingUp, Coins, Percent, ArrowLeftRight, CheckCircle, 
  AlertTriangle, Filter, Calendar, BarChart3, ChevronRight, 
  ArrowRight, Sparkles, Layers, Info, HelpCircle, ArrowUpRight, 
  ArrowDownRight, ChevronLeft, CalendarDays, History, AlertCircle
} from 'lucide-react';

interface GMDailyProps {
  gmDailyData: GMDailyData | null;
  isLoading: boolean;
}

export default function GMDaily({ gmDailyData, isLoading }: GMDailyProps) {
  // Current active Channel filter: 'Total' | 'shopee_v2' | 'Tiktok' | 'Haravan'
  const [activeChannel, setActiveChannel] = useState<string>('Total');
  // Current active Metric plotted on the bottom line chart: 'NMV' | 'COGS' | '%GM' | 'GMV'
  const [activeMetric, setActiveMetric] = useState<string>('%GM');

  // Interactive selected day state (Defaults to the latest day with data in the file)
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Scoll bar container ref for scrolling active date into view
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Format currency helper
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'decimal', 
      maximumFractionDigits: 0 
    }).format(value) + 'đ';
  };

  // Format percentage helper
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Channel titles dictionary for Vietnam
  const channelLabels: Record<string, string> = {
    'Total': 'Tổng Toàn Sàn',
    'shopee_v2': 'Shopee v2',
    'Tiktok': 'TikTok Shop',
    'Haravan': 'Website Haravan'
  };

  // Get active columns from data
  const columns: GMDailyColumn[] = useMemo(() => {
    if (gmDailyData && gmDailyData.columns && gmDailyData.columns.length > 0) {
      return gmDailyData.columns;
    }
    return [];
  }, [gmDailyData]);

  // Extract separate list of valid day columns (excluding the TTL column)
  const dayColumns = useMemo(() => {
    return columns.filter(col => col.date !== "TTL" && col.day !== "TOTAL" && col.date);
  }, [columns]);

  const metricsData = useMemo(() => {
    if (gmDailyData && gmDailyData.metrics) {
      return gmDailyData.metrics;
    }
    return {
      "GMV": {}, "NMV": {}, "COGS": {}, "%GM": {}
    };
  }, [gmDailyData]);

  // Default pre-select the current/latest date once dayColumns are populated
  useEffect(() => {
    if (dayColumns.length > 0 && !selectedDateStr) {
      const today = new Date();
      
      const formatOptions = [
        // 1. Local timezone
        { d: today.getDate(), m: today.getMonth() + 1, y: today.getFullYear() },
        // 2. UTC timezone
        { d: today.getUTCDate(), m: today.getUTCMonth() + 1, y: today.getUTCFullYear() }
      ];

      const trialStrings = new Set<string>();
      for (const opt of formatOptions) {
        // e.g., 4/6/2026
        trialStrings.add(`${opt.d}/${opt.m}/${opt.y}`);
        // e.g., 04/06/2026
        trialStrings.add(`${String(opt.d).padStart(2, '0')}/${String(opt.m).padStart(2, '0')}/${opt.y}`);
        // e.g., 4/06/2026
        trialStrings.add(`${opt.d}/${String(opt.m).padStart(2, '0')}/${opt.y}`);
        // e.g., 04/6/2026
        trialStrings.add(`${String(opt.d).padStart(2, '0')}/${opt.m}/${opt.y}`);
      }

      // See if we have direct column matches
      let foundDate = "";
      for (const str of Array.from(trialStrings)) {
        const match = dayColumns.find(col => col.date === str);
        if (match) {
          foundDate = match.date;
          break;
        }
      }

      if (foundDate) {
        setSelectedDateStr(foundDate);
      } else {
        // Fallback to the latest date with real data
        setSelectedDateStr(dayColumns[dayColumns.length - 1].date);
      }
    }
  }, [dayColumns, selectedDateStr]);

  // Auto-scroll selected date into view in horizontal selection bar
  useEffect(() => {
    if (selectedDateStr && scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDateStr]);

  // Calendar Year & Month calculated dynamically based on currently selected date
  const calendarMonthYear = useMemo(() => {
    if (!selectedDateStr) return { month: 1, year: 2026 };
    const parts = selectedDateStr.split('/');
    if (parts.length >= 3) {
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(m) && !isNaN(y)) {
        return { month: m, year: y };
      }
    }
    return { month: 1, year: 2026 };
  }, [selectedDateStr]);

  // Generate calendar weeks matrix for the selected month/year
  const calendarGrid = useMemo(() => {
    const { month, year } = calendarMonthYear;
    
    // Total days in this month
    const totalDays = new Date(year, month, 0).getDate();
    // Weekday starting index of the 1st of that month (0 for Sun, 1 for Mon, etc.)
    const firstDayIndex = new Date(year, month - 1, 1).getDay();

    const blanks = Array(firstDayIndex).fill(null);
    const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);
    
    const cells = [...blanks, ...dayNumbers];
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [calendarMonthYear]);

  // Map each calendar day cell to column metadata in spreadsheet
  const getDayMetadata = (dayNum: number) => {
    const { month, year } = calendarMonthYear;
    const dateStr = `${dayNum}/${month}/${year}`;
    
    const colMatch = columns.find(c => c.date === dateStr);
    if (!colMatch) return { dateStr, colExists: false, gmRate: 0, nmvVal: 0, isBelow40: false };

    const idx = columns.findIndex(c => c.date === colMatch.date);
    const gmRate = metricsData["%GM"]?.[activeChannel]?.[idx] || 0;
    const nmvVal = metricsData["NMV"]?.[activeChannel]?.[idx] || 0;
    const cogsVal = metricsData["COGS"]?.[activeChannel]?.[idx] || 0;
    const gmvVal = metricsData["GMV"]?.[activeChannel]?.[idx] || 0;

    return {
      dateStr,
      colExists: true,
      gmRate,
      nmvVal,
      cogsVal,
      gmvVal,
      isBelow40: gmRate < 40 && gmRate > 0
    };
  };

  // Find the last actual updated date with values in the whole file
  const lastUpdatedDateInFile = useMemo(() => {
    if (dayColumns.length === 0) return 'N/A';
    
    for (let i = dayColumns.length - 1; i >= 0; i--) {
      const col = dayColumns[i];
      const idx = columns.findIndex(c => c.date === col.date);
      
      let hasValue = false;
      for (const mKey of ["GMV", "NMV", "COGS", "%GM"]) {
        const val = metricsData[mKey]?.[activeChannel]?.[idx];
        if (val && val !== 0) {
          hasValue = true;
          break;
        }
      }
      if (hasValue) {
        return `${col.date} (${col.day})`;
      }
    }
    const lastCol = dayColumns[dayColumns.length - 1];
    return `${lastCol.date} (${lastCol.day})`;
  }, [dayColumns, columns, metricsData, activeChannel]);

  // Selected Date Metrics vs 1 Day Before analytical calculator
  const todayComparison = useMemo(() => {
    if (!selectedDateStr || columns.length === 0) return null;

    const currentIdx = columns.findIndex(c => c.date === selectedDateStr);
    if (currentIdx === -1) return null;

    const currentCol = columns[currentIdx];
    
    // The calendar day immediately before the active day in columns (represented as S - 1 in spreadsheet order)
    let prevCol = null;
    if (currentIdx > 0) {
      const candidatePrev = columns[currentIdx - 1];
      if (candidatePrev.date !== "TTL" && candidatePrev.day !== "TOTAL") {
        prevCol = candidatePrev;
      }
    }

    const prevIdx = prevCol ? columns.findIndex(c => c.date === prevCol.date) : -1;

    const getVal = (mKey: string, cellIdx: number) => {
      if (cellIdx === -1) return 0;
      return metricsData[mKey]?.[activeChannel]?.[cellIdx] || 0;
    };

    const config = [
      { key: "GMV", name: "Tổng Giá Trị Đơn Hàng (GMV)", isMonetary: true },
      { key: "NMV", name: "Doanh Thu Thực Tế Net (NMV)", isMonetary: true },
      { key: "COGS", name: "Giá Vốn Hàng Hóa Mua (COGS)", isMonetary: true },
      { key: "%GM", name: "Biên Lợi Nhuận Gộp (%GM)", isMonetary: false, isPercentage: true }
    ];

    const stats = config.map(m => {
      const curVal = getVal(m.key, currentIdx);
      const prevVal = prevCol ? getVal(m.key, prevIdx) : 0;
      const difference = curVal - prevVal;
      
      let changeRate = 0;
      if (m.key === "%GM") {
        // Percentage point difference for margin percentages
        changeRate = difference;
      } else {
        changeRate = prevVal !== 0 ? (difference / prevVal) * 100 : 0;
      }

      return {
        ...m,
        current: curVal,
        previous: prevVal,
        difference,
        changeRate,
        hasPrev: !!prevCol
      };
    });

    return {
      currentDate: currentCol.date,
      currentDay: currentCol.day,
      prevDate: prevCol ? prevCol.date : null,
      prevDay: prevCol ? prevCol.day : null,
      stats
    };
  }, [selectedDateStr, columns, metricsData, activeChannel]);

  // Overall Sheet TTL/TOTAL aggregate summary cards metrics (overall view)
  const ttlSummaryMetrics = useMemo(() => {
    const defaultRes = { gmv: 0, nmv: 0, cogs: 0, gmRate: 0 };
    if (columns.length === 0) return defaultRes;

    const ttlIndex = columns.findIndex(col => col.date === "TTL" || col.day === "TOTAL");
    const useIndex = ttlIndex !== -1 ? ttlIndex : 0;

    return {
      gmv: metricsData["GMV"]?.[activeChannel]?.[useIndex] || 0,
      nmv: metricsData["NMV"]?.[activeChannel]?.[useIndex] || 0,
      cogs: metricsData["COGS"]?.[activeChannel]?.[useIndex] || 0,
      gmRate: metricsData["%GM"]?.[activeChannel]?.[useIndex] || 0
    };
  }, [columns, metricsData, activeChannel]);

  // Extract trend data points for chart (excluding aggregate TOTAL columns)
  const chartDataPoints = useMemo(() => {
    if (columns.length <= 1) return [];

    const filteredCols = columns.filter(col => col.date !== "TTL" && col.day !== "TOTAL");
    const dates = filteredCols.map(col => col.date);
    const labelDays = filteredCols.map(col => col.day);

    const values = filteredCols.map(col => {
      const idx = columns.findIndex(c => c.index === col.index);
      return metricsData[activeMetric]?.[activeChannel]?.[idx] || 0;
    });

    const hasData = values.some(v => v !== 0);

    return {
      dates,
      days: labelDays,
      values,
      hasData
    };
  }, [columns, metricsData, activeChannel, activeMetric]);

  // Quick helper to move selected day back/forth in chronological order
  const handleStepDay = (direction: 'prev' | 'next') => {
    if (dayColumns.length === 0 || !selectedDateStr) return;
    const currentPos = dayColumns.findIndex(c => c.date === selectedDateStr);
    if (currentPos === -1) return;

    if (direction === 'prev' && currentPos > 0) {
      setSelectedDateStr(dayColumns[currentPos - 1].date);
    } else if (direction === 'next' && currentPos < dayColumns.length - 1) {
      setSelectedDateStr(dayColumns[currentPos + 1].date);
    }
  };

  // Render SVG interactive trend-line component (dynamic overview)
  const renderTrendSVG = () => {
    const { dates, values, hasData } = chartDataPoints;
    if (!hasData || values.length === 0) {
      return (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
          <Calendar size={24} className="text-slate-300 mb-1.5" />
          <span className="text-xs font-bold">Chưa có dữ liệu giao dịch phát sinh qua các ngày</span>
          <span className="text-[10px] text-slate-400 mt-0.5">Vui lòng kiểm tra các ngày tiếp theo trong file quản lý</span>
        </div>
      );
    }

    const maxValue = Math.max(...values, activeMetric === '%GM' ? 100 : 1);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    const width = 600;
    const height = 150;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const points = values.map((val, idx) => {
      const x = paddingLeft + (idx / (values.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - ((val - minValue) / valueRange) * chartHeight;
      return { x, y, value: val, date: dates[idx] };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPathData = `${pathData} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

    let thresholdY = 0;
    if (activeMetric === '%GM') {
      const targetPercent = 40;
      thresholdY = paddingTop + chartHeight - ((targetPercent - minValue) / valueRange) * chartHeight;
    }

    let strokeColor = '#4f46e5'; // Indigo
    let fillColor = 'url(#indigoGrad)';
    if (activeMetric === '%GM') {
      strokeColor = '#10b981'; // Emerald standard
      fillColor = 'url(#emeraldGrad)';
    } else if (activeMetric === 'COGS') {
      strokeColor = '#f43f5e'; // Rose
      fillColor = 'url(#roseGrad)';
    }

    return (
      <div className="relative pb-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto drop-shadow-3xs animate-fade-in" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke="#cbd5e1" strokeWidth="1" />

          {/* 40% Target guidelines for %GM */}
          {activeMetric === '%GM' && thresholdY >= paddingTop && thresholdY <= paddingTop + chartHeight && (
            <>
              <line 
                x1={paddingLeft} 
                y1={thresholdY} 
                x2={width - paddingRight} 
                y2={thresholdY} 
                stroke="#ef4444" 
                strokeWidth="1" 
                strokeDasharray="4 2" 
              />
              <text x={width - paddingRight - 8} y={thresholdY - 3} fill="#ef4444" fontSize="6.5" fontWeight="black" textAnchor="end">
                Mục tiêu GM tối thiểu (40%)
              </text>
            </>
          )}

          {/* Y Axis Labels */}
          <text x={paddingLeft - 6} y={paddingTop + 3} fill="#94a3b8" fontSize="7.5" textAnchor="end" fontFamily="monospace" fontWeight="bold">
            {activeMetric === '%GM' ? '100%' : formatVND(maxValue).replace('đ', '')}
          </text>
          <text x={paddingLeft - 6} y={paddingTop + chartHeight / 2 + 2} fill="#94a3b8" fontSize="7.5" textAnchor="end" fontFamily="monospace" fontWeight="bold">
            {activeMetric === '%GM' ? '50%' : formatVND((maxValue + minValue) / 2).replace('đ', '')}
          </text>
          <text x={paddingLeft - 6} y={paddingTop + chartHeight + 2} fill="#94a3b8" fontSize="7.5" textAnchor="end" fontFamily="monospace" fontWeight="bold">
            {activeMetric === '%GM' ? '0%' : '0'}
          </text>

          {/* Shaded Area and Stroke Path */}
          <path d={areaPathData} fill={fillColor} />
          <path d={pathData} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Highlight markers */}
          {points.map((p, idx) => {
            const isDotRed = activeMetric === '%GM' && p.value < 40;
            const dotColor = isDotRed ? '#ef4444' : strokeColor;
            const isSelected = p.date === selectedDateStr;

            return (
              <g key={idx} className="cursor-pointer group" onClick={() => setSelectedDateStr(p.date)}>
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r={isSelected ? "5" : "3.5"} 
                  fill={isSelected ? dotColor : "#ffffff"} 
                  stroke={dotColor} 
                  strokeWidth="2" 
                />
                <circle 
                  cx={p.x} 
                  cy={p.y} 
                  r="9" 
                  fill={dotColor} 
                  fillOpacity="0" 
                  className="hover:fill-opacity-15 transition" 
                />
              </g>
            );
          })}

          {/* X Axis Labels */}
          {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 8)) === 0).map((p, idx) => (
            <text key={idx} x={p.x} y={paddingTop + chartHeight + 11} fill="#64748b" fontSize="7.2" textAnchor="middle" fontWeight="bold">
              {p.date.substring(0, 5)}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4 shadow-3xs">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="font-semibold text-slate-900 text-sm">Đang tải cấu trúc dữ liệu GM Daily...</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b; /* bg-slate-800 equivalent */
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569; /* bg-slate-600 equivalent */
          border-radius: 8px;
          border: 1px solid #0f172a; /* border to prevent blending */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6366f1; /* indigo-500 equivalent */
          cursor: pointer;
        }
        /* Disable active scrolling visual block for Firefox and MS Edge */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 #1e293b;
        }
      `}</style>

      {/* Primary Dynamic Header Bar */}
      <div className="bg-white border border-slate-250/75 rounded-3xl p-5 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 text-[9.5px] bg-indigo-600 text-white font-extrabold rounded-lg uppercase tracking-wider">
              REAL-TIME INSIGHTS
            </span>
            <span className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
              <Calendar size={12} className="text-indigo-600" />
              <span>Ghi nhận cuối trong file: </span>
              <span className="text-indigo-600 font-black">{lastUpdatedDateInFile}</span>
            </span>
          </div>
          <h2 className="text-base font-black tracking-tight text-slate-900">
            Giám Sát Lợi Nhuận Gộp GM DAILY
          </h2>
          <p className="text-[11.5px] text-slate-450 leading-relaxed max-w-xl">
            Kiểm tra tỷ giá biên gộp GM hàng ngày. Hỗ trợ đối soát chênh lệch doanh thu và vốn để bảo vệ dòng tiền Inochi luôn tối ưu.
          </p>
        </div>

        {/* Channel Filters Row */}
        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
          {Object.keys(channelLabels).map(chKey => (
            <button
              key={chKey}
              onClick={() => setActiveChannel(chKey)}
              className={`cursor-pointer text-[11px] font-bold px-3.5 py-1.8 rounded-full transition border ${
                activeChannel === chKey
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-3xs scale-102 font-extrabold'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {channelLabels[chKey]}
            </button>
          ))}
        </div>
      </div>

      {/* CORE FEATURE: THANH CHỌN NGÀY THỜI GIAN THỰC (Interactive Horizonal Date Selector Wheel) */}
      <div className="bg-slate-900 border border-slate-950 rounded-3xl p-4 shadow-sm text-white">
        <div className="flex items-center justify-between mb-3 px-1 text-xs">
          <div className="flex items-center gap-2 font-black text-[11px] tracking-wider text-slate-400 uppercase">
            <CalendarDays size={13} className="text-indigo-400" />
            <span>Thanh Chọn Ngày Giao Dịch File</span>
          </div>
          <div className="text-[11px] text-slate-450 font-bold flex items-center gap-2">
            <span>Chọn ngày bất kỳ để đối chiếu lệch tăng trưởng</span>
          </div>
        </div>

        {/* Roller Slider Wrapper */}
        <div className="flex items-center gap-2">
          {/* Back Trigger */}
          <button
            onClick={() => handleStepDay('prev')}
            disabled={dayColumns.findIndex(c => c.date === selectedDateStr) <= 0}
            className="p-1 px-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Horizonal Scroll Body */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-x-auto flex items-center gap-2 pb-3.5 custom-scrollbar select-none scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {dayColumns.map(col => {
              const colArrIdx = columns.findIndex(c => c.date === col.date);
              const gmVal = metricsData["%GM"]?.[activeChannel]?.[colArrIdx] || 0;
              const isSelected = col.date === selectedDateStr;
              const isLowGM = gmVal < 40 && gmVal > 0;

              return (
                <button
                  key={col.date}
                  data-active={isSelected}
                  onClick={() => setSelectedDateStr(col.date)}
                  className={`cursor-pointer flex-shrink-0 flex flex-col items-center p-2.5 px-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 shadow-3xs scale-102 ring-2 ring-indigo-500/10'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className={`text-[9px] font-bold tracking-wider uppercase ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {col.day}
                  </span>
                  <span className="text-xs font-black leading-none mt-1">
                    {col.date.substring(0, col.date.lastIndexOf('/'))}
                  </span>
                  
                  {/* Floating Indicator Mini badge */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLowGM ? 'bg-red-500 animate-pulse' : gmVal >= 40 ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span className={`text-[8.5px] font-bold ${
                      isSelected ? 'text-indigo-100' : isLowGM ? 'text-red-400 font-extrabold' : 'text-slate-350'
                    }`}>
                      {gmVal > 0 ? `${gmVal.toFixed(0)}%` : '-'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Forward Trigger */}
          <button
            onClick={() => handleStepDay('next')}
            disabled={dayColumns.findIndex(c => c.date === selectedDateStr) >= dayColumns.length - 1}
            className="p-1 px-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* CORE FEATURE: PHÂN TÍCH CHÊNH LỆCH SO VỚI 1 NGÀY TRƯỚC ĐÓ (Selected Day vs Previous Day comparison deck) */}
      {todayComparison ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
          
          {/* Header comparison details */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <History size={16} />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                  Đối Soát Biến Động Hàng Ngày
                </h3>
                <p className="text-[11px] text-slate-500">
                  Phân tích chênh lệch ngày được chọn (<b className="text-slate-900">{todayComparison.currentDate}</b>) so với 1 ngày trước đó (<b className="text-slate-700">{todayComparison.prevDate || 'N/A'}</b>).
                </p>
              </div>
            </div>

            <div className="text-[10px] bg-slate-100 font-black tracking-wider text-slate-600 px-3 py-1 rounded-full uppercase">
              Kênh: {channelLabels[activeChannel]}
            </div>
          </div>

          {/* Bento-grid of comparison stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {todayComparison.stats.map(stat => {
              const isLowGMStat = stat.key === "%GM" && stat.current < 40 && stat.current > 0;
              const isCogsStat = stat.key === "COGS";
              
              // Determine logic for grow indicator (for COGS, increase is technically bad/amber, for GMV/NMV, increase is green)
              const difference = stat.difference;
              const hasGrown = difference > 0;
              const isStableGM = stat.key === "%GM" && stat.current >= 40;

              let badgeBg = 'bg-rose-50 text-rose-700';
              let badgeText = `${formatPercent(stat.changeRate)}`;
              let badgeIcon = <ArrowDownRight size={11} />;

              if (hasGrown) {
                badgeBg = isCogsStat ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';
                badgeText = stat.key === '%GM' ? `+${difference.toFixed(1)} pp` : `+${stat.changeRate.toFixed(1)}%`;
                badgeIcon = <ArrowUpRight size={11} />;
              } else if (difference < 0) {
                badgeBg = isCogsStat ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
                badgeText = stat.key === '%GM' ? `${difference.toFixed(1)} pp` : `${stat.changeRate.toFixed(1)}%`;
                badgeIcon = <ArrowDownRight size={11} />;
              } else {
                badgeBg = 'bg-slate-150 text-slate-550';
                badgeText = stat.key === '%GM' ? '0 pp' : '0%';
                badgeIcon = null;
              }

              return (
                <div 
                  key={stat.key} 
                  className={`p-4 rounded-2.5xl border flex flex-col justify-between transition-all ${
                    stat.key === "%GM"
                      ? isLowGMStat
                        ? 'bg-rose-50/50 border-rose-350 shadow-3xs ring-2 ring-rose-500/5'
                        : isStableGM 
                          ? 'bg-emerald-50/20 border-emerald-350 shadow-3xs ring-2 ring-emerald-500/5'
                          : 'bg-white border-slate-200'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-450">{stat.key} Tracker</span>
                    {stat.hasPrev && difference !== 0 ? (
                      <span className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md font-black text-[9.5px] ${badgeBg}`} title="Phần trăm thay đổi">
                        {badgeIcon}
                        <span>{badgeText}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold bg-slate-50 border px-1.5 py-0.5 rounded-sm">
                        Mốc đầu
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="text-[10.5px] text-slate-400 font-bold leading-none">{stat.name}</div>
                    
                    {/* Selected Day Large Value */}
                    <div className={`text-xl font-black leading-none ${
                      stat.key === "%GM"
                        ? isLowGMStat ? 'text-red-600' : isStableGM ? 'text-emerald-700' : 'text-slate-900'
                        : 'text-slate-900'
                    }`}>
                      {stat.isMonetary ? formatVND(stat.current) : formatPercent(stat.current)}
                    </div>

                    {/* Previous Day mini reference */}
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                      <span>Ngày trước:</span>
                      <strong className="text-slate-650 font-black">
                        {stat.isMonetary ? formatVND(stat.previous) : formatPercent(stat.previous)}
                      </strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Red Flag Warning Box specifically for crucial %GM < 40 days */}
          {todayComparison.stats.find(s => s.key === "%GM")?.current < 40 && todayComparison.stats.find(s => s.key === "%GM")?.current > 0 && (
            <div className="p-3 px-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 animate-pulse">
              <AlertCircle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-red-700 leading-relaxed font-bold">
                Cảnh báo khẩn cấp: Biên lợi nhuận gộp hệ thống ngày {todayComparison.currentDate} xuống sâu dưới ngưỡng an toàn (<strong className="font-extrabold">{todayComparison.stats.find(s => s.key === "%GM")?.current.toFixed(1)}%</strong> &lt; 40%). Cần lập tức điều chỉnh giá bán sỉ/lẻ hoặc rà soát COGS quà tặng khuyến mại kèm theo!
              </div>
            </div>
          )}

        </div>
      ) : null}

      {/* CORE FEATURE: PHÂN KHOẢN LỊCH THÁNG QUAN SÁT %GM (%GM Monthly Heatmap Calendar) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
        
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-slate-900 text-white">
              <CalendarDays size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Trực quan hóa tổng thể bằng lưới lịch</span>
              <h3 className="text-xs font-black text-slate-800">
                Lịch Phân Tích %GM Tháng {String(calendarMonthYear.month).padStart(2, '0')} / {calendarMonthYear.year}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/60">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-emerald-500/20 border border-emerald-400 inline-block" />
              <span>Ổn định (≥40%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-red-100 border border-red-300 inline-block" />
              <span>Cảnh báo (&lt;40%)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-slate-100 border border-slate-200 inline-block" />
              <span>Chưa phát sinh/0%</span>
            </div>
          </div>
        </div>

        {/* Dynamic Month Calendar Grid */}
        <div className="max-w-2xl mx-auto py-2.5">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-2.5 text-center mb-1 text-[10px] font-black tracking-wider text-slate-405 uppercase">
            <div className="text-red-500">Chủ Nhật</div>
            <div>Thứ Hai</div>
            <div>Thứ Ba</div>
            <div>Thứ Tư</div>
            <div>Thứ Năm</div>
            <div>Thứ Sáu</div>
            <div className="text-indigo-600">Thứ Bảy</div>
          </div>

          {/* Calendar weeks */}
          <div className="space-y-2">
            {calendarGrid.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-2">
                {week.map((day, dIdx) => {
                  if (day === null) {
                    return <div key={`empty-${dIdx}`} className="aspect-square bg-slate-50/30 rounded-xl" />;
                  }

                  const meta = getDayMetadata(day);
                  const isDaySelected = meta.dateStr === selectedDateStr;

                  let cellClass = 'bg-white border-slate-200/80 text-slate-400';
                  let footerText = '';
                  let indicatorNode = null;

                  if (meta.colExists) {
                    if (meta.gmRate >= 40) {
                      cellClass = isDaySelected 
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-2xs scale-103'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/50';
                      footerText = `${meta.gmRate.toFixed(0)}% GM`;
                      indicatorNode = <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />;
                    } else if (meta.gmRate < 40 && meta.gmRate > 0) {
                      cellClass = isDaySelected 
                        ? 'bg-red-600 border-red-700 text-white shadow-2xs scale-103 ring-2 ring-red-500/15'
                        : 'bg-red-100/80 border-red-200 text-red-700 hover:bg-red-200/40 font-extrabold animate-pulse';
                      footerText = `${meta.gmRate.toFixed(0)}% GM`;
                      indicatorNode = <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce" />;
                    } else {
                      // sales index but exactly 0% sales
                      cellClass = isDaySelected
                        ? 'bg-slate-700 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-150 text-slate-500 hover:bg-slate-100';
                      footerText = '0%';
                    }
                  } else {
                    // completely disabled days outside of Google Sheets recorded dataset
                    cellClass = 'bg-slate-50/50 border-dashed border-slate-150 text-slate-350 opacity-60';
                  }

                  return (
                    <button
                      key={`day-${day}`}
                      disabled={!meta.colExists}
                      onClick={() => setSelectedDateStr(meta.dateStr)}
                      className={`cursor-pointer aspect-square rounded-2xl border flex flex-col justify-between p-2 select-none text-left transition-all ${cellClass}`}
                    >
                      {/* Top Row: day number & indicator */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black">{day}</span>
                        {indicatorNode}
                      </div>

                      {/* Bottom Row showing %GM values clearly */}
                      <div className="w-full text-right mt-1">
                        <span className="text-[8.5px] font-black tracking-tighter uppercase whitespace-nowrap block">
                          {footerText || 'N/A'}
                        </span>
                        {meta.colExists && meta.nmvVal > 0 && (
                          <span className={`text-[7px] font-bold block leading-none ${isDaySelected ? 'text-slate-200' : 'text-slate-400'}`}>
                            {meta.nmvVal >= 1000000 
                              ? `${(meta.nmvVal / 1000000).toFixed(1)}M` 
                              : formatVND(meta.nmvVal).replace('đ', '')}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Traditional Trend visualization plotted over dates */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
        
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Đồ thị diễn biến dòng thời gian</span>
              <h3 className="text-xs font-bold text-slate-800">
                Biểu đồ xu hướng {activeMetric} - {channelLabels[activeChannel]}
              </h3>
            </div>
          </div>

          {/* Metric selector switches */}
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
            {["NMV", "COGS", "%GM"].map(mKey => (
              <button
                key={mKey}
                onClick={() => setActiveMetric(mKey)}
                className={`cursor-pointer px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                  activeMetric === mKey
                    ? 'bg-slate-900 text-white shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mKey}
              </button>
            ))}
          </div>
        </div>

        {renderTrendSVG()}

      </div>

      {/* Original Deep Dive Ledger Ledger table of complete records */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-3xs overflow-hidden flex flex-col">
        
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-sm">📋</span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Bảng Đối Chiếu Dữ Liệu Ledger Chi Tiết</h3>
              <p className="text-[10px] text-slate-400">Hiển thị lịch trình và các điểm giao dịch, highlight <b className="text-red-500">Màu Đỏ</b> nếu chỉ số %GM dưới 40%.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100/50 rounded-full px-3 py-1 border border-slate-200/50">
            <span className="text-[10px] font-bold text-slate-500">Kênh đang chọn: {channelLabels[activeChannel]}</span>
          </div>
        </div>

        {/* Big Ledger Table horizontal scroll */}
        <div className="overflow-x-auto">
          {columns.length > 0 ? (
            <table className="w-full text-left border-collapse table-fixed select-text">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-[10.5px] font-black tracking-wider uppercase">
                  <th className="p-4 py-3 font-extrabold text-slate-750 w-44 sticky left-0 bg-slate-50 shadow-xs">CHỈ SỐ / KÊNH</th>
                  {columns.map(col => (
                    <th key={col.index} className="p-3 py-3 w-32 border-l border-slate-200/80 text-center font-bold">
                      <div className="text-slate-900 text-[11px] font-extrabold leading-tight">{col.date}</div>
                      <div className="text-slate-400 text-[9px] font-medium leading-none">{col.day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-[11.5px]">
                
                {/* 1. GMV Row */}
                <tr className="bg-slate-50/20 font-extrabold text-slate-900 border-t-2 border-slate-200">
                  <td className="p-3 px-4 sticky left-0 bg-slate-50 shadow-xs z-10 font-black text-xs uppercase text-indigo-700">1. DOANH SỐ GMV</td>
                  {columns.map((col, idx) => (
                    <td key={col.index} className="p-3 border-l text-center border-slate-100 font-extrabold shadow-sm/5 text-slate-600 bg-slate-50/10">
                      {formatVND(metricsData["GMV"]?.[activeChannel]?.[idx] || 0)}
                    </td>
                  ))}
                </tr>

                {/* 2. NMV Row */}
                <tr className="bg-indigo-50/5 font-extrabold text-slate-900">
                  <td className="p-3 px-4 sticky left-0 bg-white shadow-xs z-10 font-bold text-slate-800">2. DOANH THU THỰC NMV</td>
                  {columns.map((col, idx) => {
                    const isTotalCol = col.date === "TTL" || col.day === "TOTAL";
                    const isZero = (metricsData["NMV"]?.[activeChannel]?.[idx] || 0) === 0;
                    return (
                      <td key={col.index} className={`p-3 border-l text-center border-slate-101 font-extrabold ${
                        isTotalCol ? 'bg-indigo-50/10 text-slate-900' : isZero ? 'text-slate-350 bg-slate-50/5' : 'text-slate-800'
                      }`}>
                        {formatVND(metricsData["NMV"]?.[activeChannel]?.[idx] || 0)}
                      </td>
                    );
                  })}
                </tr>

                {/* 3. COGS Row */}
                <tr className="bg-slate-50/5 text-slate-800">
                  <td className="p-3 px-4 sticky left-0 bg-white shadow-xs z-10 font-bold text-slate-700">3. GIÁ VỐN HÀNG HÓA COGS</td>
                  {columns.map((col, idx) => {
                    const isTotalCol = col.date === "TTL" || col.day === "TOTAL";
                    const isZero = (metricsData["COGS"]?.[activeChannel]?.[idx] || 0) === 0;
                    return (
                      <td key={col.index} className={`p-3 border-l text-center border-slate-101 font-medium ${
                        isTotalCol ? 'bg-indigo-50/10 font-bold' : isZero ? 'text-slate-350 bg-slate-50/2' : 'text-slate-705'
                      }`}>
                        {formatVND(metricsData["COGS"]?.[activeChannel]?.[idx] || 0)}
                      </td>
                    );
                  })}
                </tr>

                {/* 4. %GM Row */}
                <tr className="bg-slate-50/10 font-extrabold text-slate-900 border-b-2 border-slate-200">
                  <td className="p-3 px-4 sticky left-0 bg-slate-50 shadow-xs z-10 font-black text-xs uppercase text-emerald-800">4. BIÊN LỢI NHUẬN %GM</td>
                  {columns.map((col, idx) => {
                    const gmRate = metricsData["%GM"]?.[activeChannel]?.[idx] || 0;
                    const isBelow40 = gmRate < 40 && gmRate > 0;
                    const isZero = gmRate === 0;

                    let bgStyle = 'bg-slate-50/10';
                    let textStyle = 'text-slate-600';

                    if (isBelow40) {
                      bgStyle = 'bg-red-50 text-red-700 border-red-200 font-black animate-pulse';
                      textStyle = 'text-red-700 font-extrabold';
                    } else if (gmRate >= 40) {
                      bgStyle = 'bg-emerald-50/30 text-emerald-800';
                      textStyle = 'text-emerald-700 font-extrabold';
                    } else if (isZero) {
                      bgStyle = 'bg-slate-50/5';
                      textStyle = 'text-slate-350';
                    }

                    return (
                      <td key={col.index} className={`p-3 border-l text-center border-slate-150 transition-all ${bgStyle} ${textStyle}`}>
                        <div className="flex items-center justify-center gap-1">
                          <span>{formatPercent(gmRate)}</span>
                          {isBelow40 && <span className="text-[9px] px-1 bg-red-100 rounded-sm text-red-600 animate-pulse font-black" title="WARNING">LOW</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>

              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Chưa có dữ liệu Ledger hợp lệ.
            </div>
          )}
        </div>

        {/* Bottom footer suggestion bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center gap-3">
          <span className="text-base text-indigo-600 animate-pulse">💡</span>
          <p className="text-[11px] text-slate-505 font-medium">
            <b>Mẹo phân tích chiến lược:</b> Giữ Biên Lợi Nhuận Gộp (%GM) trên 40% là chỉ số an toàn bắt buộc cho toàn thương hiệu Inochi. Hãy kiểm tra lại cơ cấu quà tặng ở tab <b>Bảng Giá & Quà Tặng</b> để đưa COGS của chương trình khuyến mãi về phạm vi an toàn nếu gặp cảnh báo đỏ.
          </p>
        </div>

      </div>

    </div>
  );
}
