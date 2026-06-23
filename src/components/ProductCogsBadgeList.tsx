import React from 'react';
import { CogsProduct } from '../types';
import { Database } from 'lucide-react';

interface ProductCogsBadgeListProps {
  product: CogsProduct | undefined | null;
  showAll?: boolean; // If true, shows all properties in a beautiful grid layout, otherwise a compact badge row
}

export default function ProductCogsBadgeList({ product, showAll = false }: ProductCogsBadgeListProps) {
  if (!product) return null;

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getStatusStyle = (status: string | undefined) => {
    if (!status) return 'bg-slate-50 text-slate-500 border-slate-150';
    const s = status.toLowerCase();
    if (s.includes('hết') || s.includes('off') || s.includes('het') || s.includes('hết')) {
      return 'bg-rose-50 text-rose-650 border border-rose-100';
    }
    if (s.includes('nhập') || s.includes('nhap') || s.includes('gắp') || s.includes('gap') || s.includes('cảnh')) {
      return 'bg-amber-50 text-amber-655 border border-amber-100';
    }
    return 'bg-teal-50 text-teal-650 border border-teal-100';
  };

  if (showAll) {
    return (
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-xs font-sans space-y-3.5 shadow-2xs font-semibold">
        <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-150 pb-1.5 mb-2">
          <Database size={13} className="text-indigo-600" />
          Dữ liệu đồng bộ gốc (Sheet COGS - Inochi BMT)
        </h4>
        
        {/* Core identification spec grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 shadow-4xs">
            <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Master SKU</span>
            <span className="text-slate-800 font-extrabold font-mono block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={product.mainSku}>{product.mainSku || '—'}</span>
          </div>
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 shadow-4xs">
            <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">SKU Phân Loại</span>
            <span className="text-slate-800 font-extrabold font-mono block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={product.skuPhanLoai}>{product.skuPhanLoai || '—'}</span>
          </div>
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 shadow-4xs">
            <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Barcode</span>
            <span className="text-slate-700 font-mono block mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis" title={product.barcode}>{product.barcode || '—'}</span>
          </div>
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 shadow-4xs">
            <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Danh Mục</span>
            <span className="text-slate-700 font-extrabold block mt-0.5 truncate" title={product.category}>{product.category || '—'}</span>
          </div>
        </div>

        {/* Size/Color & Cost representation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex justify-between items-center shadow-4xs">
            <div>
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Kích thước (Size)</span>
              <span className="text-slate-800 font-extrabold mt-0.5 block">{product.size || '—'}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex justify-between items-center shadow-4xs">
            <div>
              <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Màu sắc (Color)</span>
              <span className="text-slate-800 font-extrabold mt-0.5 block">{product.color || '—'}</span>
            </div>
          </div>
          <div className="bg-white border border-slate-150 rounded-xl p-2.5 flex justify-between items-center bg-indigo-50/20 border-indigo-100 shadow-4xs">
            <div>
              <span className="text-[8.5px] uppercase font-bold text-indigo-500 block tracking-wider">Giá vốn (COGS)</span>
              <span className="text-indigo-650 font-black font-mono text-xs mt-0.5 block">{formatVND(product.cogs)}</span>
            </div>
          </div>
        </div>

        {/* Boxme North & Boxme South Stocks and Statuses */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Boxme Bac */}
          <div className="bg-white border border-slate-150 rounded-xl p-3 shadow-4xs hover:shadow-2xs transition-all flex flex-col justify-between">
            <div className="flex justify-between items-start gap-1 pb-1.5 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-1 py-0.2 rounded text-[8px] font-black uppercase">Kho Miền Bắc</span>
                <span className="text-[10px] font-extrabold text-slate-800 block mt-1">Boxme Bắc</span>
              </div>
              {product.statusBoxmeBac !== undefined && (
                <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded leading-none ${getStatusStyle(product.statusBoxmeBac)}`}>
                  {product.statusBoxmeBac}
                </span>
              )}
            </div>
            <div className="flex justify-between items-baseline mt-2.5 flex-wrap gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Số lượng tồn:</span>
              <span className="text-slate-800 font-black font-mono text-xs">
                {product.boxmeBac !== undefined ? `${product.boxmeBac} chiếc` : '0 chiếc'}
              </span>
            </div>
          </div>

          {/* Boxme Nam */}
          <div className="bg-white border border-slate-150 rounded-xl p-3 shadow-4xs hover:shadow-2xs transition-all flex flex-col justify-between">
            <div className="flex justify-between items-start gap-1 pb-1.5 border-b border-slate-100">
              <div className="space-y-0.5">
                <span className="bg-orange-50 border border-orange-150 text-orange-700 px-1 py-0.2 rounded text-[8px] font-black uppercase">Kho Miền Nam</span>
                <span className="text-[10px] font-extrabold text-slate-800 block mt-1">Boxme Nam</span>
              </div>
              {product.statusBoxmeNam !== undefined && (
                <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded leading-none ${getStatusStyle(product.statusBoxmeNam)}`}>
                  {product.statusBoxmeNam}
                </span>
              )}
            </div>
            <div className="flex justify-between items-baseline mt-2.5 flex-wrap gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Số lượng tồn:</span>
              <span className="text-slate-800 font-black font-mono text-xs">
                {product.boxmeNam !== undefined ? `${product.boxmeNam} chiếc` : '0 chiếc'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact Inline badges row representation for lists, tables, cards, etc.
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[8.5px] font-mono leading-none py-1 sm:max-w-xl">
      {/* Master SKU */}
      {product.mainSku && (
        <span className="bg-slate-100 hover:bg-slate-150 text-slate-650 px-1.5 py-0.5 rounded font-extrabold border border-slate-200" title={`Master SKU: ${product.mainSku}`}>
          MSKU: {product.mainSku}
        </span>
      )}
      
      {/* Size / Color description */}
      {(product.size || product.color) && (
        <span className="bg-slate-50 border border-slate-150 text-slate-605 px-1.5 py-0.5 rounded font-bold font-sans">
          {[product.size, product.color].filter(Boolean).join(' | ')}
        </span>
      )}

      {/* COGS (Vốn) */}
      <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black font-mono">
        COGS: {formatVND(product.cogs)}
      </span>

      {/* Boxme Bắc stock status */}
      <span className={`px-1.5 py-0.5 rounded font-sans font-extrabold flex items-center gap-0.5 border ${
        product.boxmeBac && product.boxmeBac > 0 ? 'bg-teal-50 text-teal-700 border-teal-150' : 'bg-rose-50 text-rose-650 border-rose-150'
      }`} title={`Trạng thái Bắc: ${product.statusBoxmeBac || '—'}`}>
        MB: <strong className="font-mono">{product.boxmeBac ?? 0}</strong>
        {product.statusBoxmeBac && (
          <span className="text-[7.5px] opacity-75 font-black uppercase">({product.statusBoxmeBac})</span>
        )}
      </span>

      {/* Boxme Nam stock status */}
      <span className={`px-1.5 py-0.5 rounded font-sans font-extrabold flex items-center gap-0.5 border ${
        product.boxmeNam && product.boxmeNam > 0 ? 'bg-amber-50 text-amber-700 border-amber-150' : 'bg-rose-50 text-rose-650 border-rose-155'
      }`} title={`Trạng thái Nam: ${product.statusBoxmeNam || '—'}`}>
        MN: <strong className="font-mono">{product.boxmeNam ?? 0}</strong>
        {product.statusBoxmeNam && (
          <span className="text-[7.5px] opacity-75 font-black uppercase">({product.statusBoxmeNam})</span>
        )}
      </span>

      {/* Category */}
      {product.category && (
        <span className="bg-slate-100/75 border border-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded font-semibold font-sans">
          {product.category}
        </span>
      )}
    </div>
  );
}
