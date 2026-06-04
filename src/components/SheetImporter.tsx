import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MainProduct, CogsProduct, StockRecord } from '../types';
import { 
  Clipboard, Table, FileSpreadsheet, AlertCircle, CheckCircle, 
  Settings, HelpCircle, Info, TrendingUp, Coins, ArrowRight, 
  CornerDownRight, Sparkles, RotateCcw, Download, Eye, Layers, ChevronRight,
  Plus, Gift
} from 'lucide-react';

interface SheetImporterProps {
  mainProducts: MainProduct[];
  cogsProducts: CogsProduct[];
  stockRecords?: StockRecord[];
}

interface FeeItem {
  type: 'percent' | 'value';
  val: number;
}

interface CustomVariant {
  id: string;
  label: string;
  basePrice: number;
  gifts: {
    vpCode: string;
    productName: string;
    quantity: number;
    giftCogs: number;
  }[];
}

interface GroupedMainItem {
  id: string;
  campaignType: string;
  barcode: string;
  vpCode: string;
  productName: string;
  quantity: number;
  listPrice: number;
  lowestPrice: number; // Base Price
  gifts: {
    barcode: string;
    vpCode: string;
    productName: string;
    quantity: number;
    listPrice: number;
    lowestPrice: number;
    matchedGiftProduct?: CogsProduct;
    giftCogs: number;
  }[];
  matchedMainProduct?: MainProduct;
  mainProductCogs: number;
  customVariants?: (CustomVariant & {
    metrics: {
      basePrice: number;
      shopVoucher: number;
      actualGiftCogs: number;
      platformVoucherCost: number;
      fixedFee: number;
      infraFee: number;
      paymentFee: number;
      voucherXtra: number;
      commission: number;
      ffmFee: number;
      returnFee: number;
      totalFees: number;
      netPool: number;
      netProfit: number;
      percentageGM: number;
      percentageNM: number;
      customerBuyPrice: number;
    };
  })[];
}

export default function SheetImporter({ mainProducts, cogsProducts, stockRecords }: SheetImporterProps) {
  // Pasted raw spreadsheet data state
  const [pastedText, setPastedText] = useState<string>('');
  const [customVariants, setCustomVariants] = useState<Record<string, CustomVariant[]>>({});
  const [editingVariant, setEditingVariant] = useState<{ itemId: string; variantId: string } | null>(null);
  const [giftSearchTerm, setGiftSearchTerm] = useState<string>('');
  const [selectedGiftGroupSku, setSelectedGiftGroupSku] = useState<string | null>(null);
  const [giftBudgetFilter, setGiftBudgetFilter] = useState<'all' | 'suitable' | 'exceeded'>('all');
  
  // Custom Shopee Fee configs for this calculator workspace
  const [feeConfigs, setFeeConfigs] = useState({
    fixedFee: { type: 'percent', val: 17 } as FeeItem,
    infraFee: { type: 'value', val: 3000 } as FeeItem,
    paymentFee: { type: 'percent', val: 6.0 } as FeeItem,
    voucherXtra: { type: 'percent', val: 5.0 } as FeeItem,
    voucherXtraCap: 50000,
    commission: { type: 'percent', val: 15.0 } as FeeItem,
    ffmFee: { type: 'percent', val: 5.0 } as FeeItem,
    returnFee: { type: 'percent', val: 1.0 } as FeeItem,
    platformVoucher: { type: 'percent', val: 20.0 } as FeeItem,
    platformVoucherCap: 150000,
  });

  const [activeItemDetails, setActiveItemDetails] = useState<string | null>(null);

  // Top-level handlers to avoid closure bugs inside JSX rendering
  const handleSelectGiftForVariant = (itemId: string, variantId: string, p: CogsProduct) => {
    setCustomVariants(prev => {
      const list = [...(prev[itemId] || [])];
      const vIdx = list.findIndex(v => v.id === variantId);
      if (vIdx === -1) return prev;

      const variant = list[vIdx];
      const varGifts = [...(variant.gifts || [])];
      const existIdx = varGifts.findIndex(g => g.vpCode === p.skuPhanLoai);
      if (existIdx >= 0) {
        varGifts[existIdx] = { ...varGifts[existIdx], quantity: varGifts[existIdx].quantity + 1 };
      } else {
        varGifts.push({
          vpCode: p.skuPhanLoai,
          productName: p.name,
          quantity: 1,
          giftCogs: p.cogs
        });
      }
      list[vIdx] = { ...variant, gifts: varGifts };
      return { ...prev, [itemId]: list };
    });
  };

  const handleUpdateGiftQty = (itemId: string, variantId: string, giftIndex: number, delta: number) => {
    setCustomVariants(prev => {
      const list = [...(prev[itemId] || [])];
      const vIdx = list.findIndex(v => v.id === variantId);
      if (vIdx === -1) return prev;

      const variant = list[vIdx];
      const varGifts = [...(variant.gifts || [])];
      if (!varGifts[giftIndex]) return prev;

      const newQty = Math.max(1, varGifts[giftIndex].quantity + delta);
      varGifts[giftIndex] = { ...varGifts[giftIndex], quantity: newQty };
      list[vIdx] = { ...variant, gifts: varGifts };
      return { ...prev, [itemId]: list };
    });
  };

  const handleSetGiftQty = (itemId: string, variantId: string, giftIndex: number, qty: number) => {
    setCustomVariants(prev => {
      const list = [...(prev[itemId] || [])];
      const vIdx = list.findIndex(v => v.id === variantId);
      if (vIdx === -1) return prev;

      const variant = list[vIdx];
      const varGifts = [...(variant.gifts || [])];
      if (!varGifts[giftIndex]) return prev;

      const newQty = Math.max(1, qty);
      varGifts[giftIndex] = { ...varGifts[giftIndex], quantity: newQty };
      list[vIdx] = { ...variant, gifts: varGifts };
      return { ...prev, [itemId]: list };
    });
  };

  const handleDeleteGiftFromVariant = (itemId: string, variantId: string, giftIndex: number) => {
    setCustomVariants(prev => {
      const list = [...(prev[itemId] || [])];
      const vIdx = list.findIndex(v => v.id === variantId);
      if (vIdx === -1) return prev;

      const variant = list[vIdx];
      const varGifts = variant.gifts.filter((_, idx) => idx !== giftIndex);
      list[vIdx] = { ...variant, gifts: varGifts };
      return { ...prev, [itemId]: list };
    });
  };

  const handleClearAllGifts = (itemId: string, variantId: string) => {
    setCustomVariants(prev => {
      const list = [...(prev[itemId] || [])];
      const vIdx = list.findIndex(v => v.id === variantId);
      if (vIdx === -1) return prev;

      list[vIdx] = { ...list[vIdx], gifts: [] };
      return { ...prev, [itemId]: list };
    });
  };

  // Helper to format currency
  const formatVND = (v: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(Math.round(v))
      .replace('₫', 'đ');
  };

  // Helper to fetch product image from cogsProducts/mainProducts by SKU classification code
  const getProductImage = (sku?: string) => {
    if (!sku) return null;
    const cleanSku = sku.trim();
    // Search in cogsProducts
    const cogsProduct = cogsProducts?.find(p => p.skuPhanLoai?.trim() === cleanSku);
    if (cogsProduct?.img) return cogsProduct.img;

    // Search in mainProducts
    const mainProduct = mainProducts?.find(p => p.vpCode?.trim() === cleanSku);
    if (mainProduct?.img) return mainProduct.img;

    return null;
  };

  // Grouped gifts for display in matching gifts picker
  const inochiGifts = useMemo(() => {
    return cogsProducts.filter(p => {
      // Exclude main appliances to focus on actual gift items
      const isAppliance = p.name.includes("Nồi chiên") || p.name.includes("Cơm điện") || p.name.includes("Máy rửa rau");
      return !isAppliance && p.cogs > 0;
    });
  }, [cogsProducts]);

  const filteredGroupedGifts = useMemo(() => {
    // 1. Group all eligible gifts by mainSku
    const groups: { [key: string]: CogsProduct[] } = {};
    inochiGifts.forEach(g => {
      const key = g.mainSku || "Sản phẩm khác";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(g);
    });

    const budgetLimit = editingVariant ? (() => {
      const { itemId, variantId } = editingVariant;
      const variantList = customVariants[itemId] || [];
      const variant = variantList.find(v => v.id === variantId);
      return variant ? variant.basePrice * 0.08 : 112000;
    })() : 112000;

    // 2. Map groups to structured details and filter both groups and variants based on budget status
    const mapped = Object.entries(groups).map(([mainSku, variants]) => {
      const filteredVariants = variants.filter(v => {
        const isUnder = v.cogs <= budgetLimit;
        if (giftBudgetFilter === 'suitable') return isUnder;
        if (giftBudgetFilter === 'exceeded') return !isUnder;
        return true;
      });

      const firstWithImg = variants.find(v => v.img && v.img.trim() !== "" && !v.img.includes("placeholder"));
      const img = firstWithImg ? firstWithImg.img : (variants[0]?.img || "");
      const category = variants[0]?.category || "Quà tặng";
      const name = variants[0]?.name || "";
      return {
        mainSku,
        img,
        category,
        name,
        variants: filteredVariants
      };
    }).filter(item => item.variants.length > 0);

    // 3. Filter by search term if active
    if (!giftSearchTerm.trim()) return mapped;

    const query = giftSearchTerm.trim().toLowerCase();
    return mapped.filter(item => {
      const matchMain = item.mainSku.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
      const matchVariant = item.variants.some(v => 
        v.name.toLowerCase().includes(query) || 
        v.skuPhanLoai.toLowerCase().includes(query)
      );
      return matchMain || matchVariant;
    });
  }, [inochiGifts, giftSearchTerm, giftBudgetFilter, editingVariant, customVariants]);

  const selectedGiftGroup = useMemo(() => {
    if (filteredGroupedGifts.length === 0) return null;
    const found = filteredGroupedGifts.find(g => g.mainSku === selectedGiftGroupSku);
    return found || filteredGroupedGifts[0];
  }, [filteredGroupedGifts, selectedGiftGroupSku]);

  // Sync selected group if it gets filtered out
  React.useEffect(() => {
    if (editingVariant && filteredGroupedGifts.length > 0) {
      const exists = filteredGroupedGifts.some(g => g.mainSku === selectedGiftGroupSku);
      if (!exists) {
        setSelectedGiftGroupSku(filteredGroupedGifts[0]?.mainSku || null);
      }
    }
  }, [editingVariant, filteredGroupedGifts, selectedGiftGroupSku]);

  // Helper to create a new comparison variant
  const handleCreateVariant = (itemId: string) => {
    const item = processedData.groupedItems.find(g => g.id === itemId);
    if (!item) return;

    const previousVariants = customVariants[itemId] || [];
    const nextIndex = previousVariants.length + 1;
    
    const newVar: CustomVariant = {
      id: `var-${itemId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label: `Biến thể #${nextIndex}`,
      basePrice: item.lowestPrice,
      gifts: item.gifts.map(g => ({
        vpCode: g.vpCode,
        productName: g.productName,
        quantity: g.quantity,
        giftCogs: g.giftCogs
      }))
    };

    setCustomVariants(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), newVar]
    }));

    // Immediately trigger configuration popover/modal to allow customization
    setEditingVariant({ itemId, variantId: newVar.id });
  };

  // Helper to delete a comparison variant
  const handleDeleteVariant = (itemId: string, variantId: string) => {
    setCustomVariants(prev => {
      const list = prev[itemId] || [];
      const updated = list.filter(v => v.id !== variantId);
      const copy = { ...prev };
      if (updated.length === 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = updated;
      }
      return copy;
    });
  };

  // Helper to compute individual config values
  const calculateValue = (feeItem: FeeItem, basePriceVal: number, capAmt?: number) => {
    let amt = 0;
    if (feeItem.type === 'percent') {
      amt = basePriceVal * (feeItem.val / 100);
    } else {
      amt = feeItem.val;
    }
    if (capAmt !== undefined && capAmt > 0 && amt > capAmt) {
      return capAmt;
    }
    return amt;
  };

  // Load Sample Google Sheet data for easy trial
  const loadSampleData = () => {
    const sample = `Campaign Type\tBarcode\tVP Code\tLoại\tTên sản phẩm\tSố lượng\tGiá niêm yết\tGiá thấp nhất
BAU\tNồi chiên không dầu 4L\tNồi chiên không dầu 4L\tMain\tNồi chiên không dầu 4L\t1\t1,700,000\t1,190,000
BAU\t8935275211573\tHIN.HODN.SOOM\tGift\tInochi Hộp lưu trữ đa năng Sano - Dung tích lớn, Nắp màu xanh lá mạ\t1\t89,000\t45,000
BAU\t8935275207095\tHIN.TUZP.SLDO0\tGift\tTúi zipper đa năng Shinshen 1L (có khóa kéo loại đỏ)\t1\t45,000\t0
BAU\t8935275211672\tHIN.KGDC.NBYK\tGift\tKhay gác dụng cụ nhà bếp Yoko\t1\t0\t0
BAU\tNồi chiên không dầu 5L\tNồi chiên không dầu 5L\tMain\tNồi chiên không dầu 5L\t1\t2,200,000\t1,540,000
BAU\t8935275211573\tHIN.HODN.SOOM\tGift\tInochi Hộp lưu trữ đa năng Sano - Dung tích lớn, Nắp màu xanh lá mạ\t1\t89,000\t45,000
BAU\t8935275207095\tHIN.TUZP.SLDO0\tGift\tTúi zipper đa năng Shinshen 1L (có khóa kéo loại đỏ)\t1\t45,000\t0
BAU\t8935275211573\tHIN.BIKS.0500G\tGift\tInochi Bình nước Kita Slim - Thiết kế nhỏ gọn, Dễ cầm nắm\t1\t169,000\t105,000
BAU\tNồi chiên không dầu 7L\tNồi chiên không dầu 7L\tMain\tNồi chiên không dầu 7L\t1\t3,200,000\t2,240,000
BAU\t8935275211573\tHIN.HODN.SOOM\tGift\tInochi Hộp lưu trữ đa năng Sano - Dung tích lớn, Nắp màu xanh lá mạ\t1\t89,000\t45,000
BAU\t8935275207095\tHIN.TUZP.SLDO0\tGift\tTúi zipper đa năng Shinshen 1L (có khóa kéo loại đỏ)\t1\t45,000\t0
BAU\t8935275211573\tHIN.BIKS.0500G\tGift\tInochi Bình nước Kita Slim - Thiết kế nhỏ gọn, Dễ cầm nắm\t1\t169,000\t105,000
BAU\t8935275211672\tHIN.KGDC.NBYK\tGift\tKhay gác dụng cụ nhà bếp Yoko\t1\t0\t0
BAU\tMáy rửa rau AKIBA\tMáy rửa rau Ak\tMain\tMáy rửa rau Akiba Plus\t1\t1,600,000\t1,280,000
BAU\t8935275211573\tHIN.HODN.SOOM\tGift\tInochi Hộp lưu trữ đa năng Sano - Dung tích lớn, Nắp màu xanh lá mạ\t1\t89,000\t45,000
BAU\t8935275207095\tHIN.TUZP.SLDO0\tGift\tTúi zipper đa năng Shinshen 1L (có khóa kéo loại đỏ)\t1\t45,000\t0
BAU\t8935275211672\tHIN.KGDC.NBYK\tGift\tKhay gác dụng cụ nhà bếp Yoko\t1\t0\t0`;
    setPastedText(sample);
  };

  // Parsing & Calculation engine
  const processedData = useMemo(() => {
    if (!pastedText.trim()) return { groupedItems: [], stats: null, warnings: [] };

    const lines = pastedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return { groupedItems: [], stats: null, warnings: [] };

    // Standard column indices
    let idxCampaign = 0;
    let idxBarcode = 1;
    let idxVpCode = 2;
    let idxType = 3;
    let idxName = 4;
    let idxQty = 5;
    let idxRsp = 6;
    let idxLowest = 7;

    const firstLineCells = lines[0].split('\t').map(c => c.trim().toLowerCase());
    const isHeaderRow = firstLineCells.some(cell => 
      cell.includes('campaign') || 
      cell.includes('barcode') || 
      cell.includes('mã') || 
      cell.includes('loại') || 
      cell.includes('sản phẩm') || 
      cell.includes('giá')
    );

    let dataLines = lines;
    if (isHeaderRow) {
      // Find matching index dynamically
      dataLines = lines.slice(1);
      firstLineCells.forEach((cell, idx) => {
        if (cell.includes('campaign') || cell.includes('chiến dịch')) idxCampaign = idx;
        else if (cell.includes('barcode')) idxBarcode = idx;
        else if (cell.includes('vp') || cell.includes('sku')) idxVpCode = idx;
        else if (cell.includes('loại') || cell.includes('type')) idxType = idx;
        else if (cell.includes('tên') || cell.includes('sản phẩm') || cell.includes('product')) idxName = idx;
        else if (cell.includes('số') || cell.includes('quantity') || cell.includes('sl') || cell.includes('lượng')) idxQty = idx;
        else if (cell.includes('niêm') || cell.includes('rsp') || cell.includes('mức')) idxRsp = idx;
        else if (cell.includes('thấp') || cell.includes('giá bán') || cell.includes('thỏaa')) idxLowest = idx;
      });
    }

    const rawRows = dataLines.map(line => line.split('\t'));
    const warnings: string[] = [];
    const groupedItems: GroupedMainItem[] = [];
    let currentMain: GroupedMainItem | null = null;

    rawRows.forEach((row, rowIndex) => {
      // Align columns safely
      const cellVal = (idx: number) => {
        if (idx < row.length) {
          // Remove wrapping double quotes
          return row[idx].replace(/^"|"$/g, '').trim();
        }
        return '';
      };

      const campaignType = cellVal(idxCampaign) || 'BAU';
      const barcode = cellVal(idxBarcode);
      const vpCode = cellVal(idxVpCode);
      const typeStr = cellVal(idxType);
      const name = cellVal(idxName);
      const qtyStr = cellVal(idxQty);
      const rspStr = cellVal(idxRsp);
      const lowestStr = cellVal(idxLowest);

      // Parse numerical values
      const cleanNum = (str: string) => {
        const cleaned = str.replace(/[^0-9.-]/g, '').replace(/\./g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? 0 : val;
      };

      const quantity = cleanNum(qtyStr) || 1;
      const listPrice = cleanNum(rspStr);
      const lowestPrice = cleanNum(lowestStr);

      const isMain = typeStr.toLowerCase().includes('main') || typeStr.toLowerCase() === 'm';
      const isGift = typeStr.toLowerCase().includes('gift') || typeStr.toLowerCase() === 'g' || typeStr.toLowerCase().includes('tặng');

      if (!isMain && !isGift) {
        // If unrecognized, skip or assume warning
        if (name) warnings.push(`Dòng #${rowIndex + 2} có phân loại "${typeStr}" không rõ là Main hay Gift. Chúng tôi tạm bỏ qua.`);
        return;
      }

      if (isMain) {
        // Create new Main Group
        // First look up in cogsProducts by SKU PHÂN LOẠI (since the user stated VP CODE corresponds to SKU PHÂN LOẠI in sheet COGS)
        const cogsMatch = cogsProducts.find(c => 
          (vpCode && c.skuPhanLoai === vpCode) ||
          (barcode && c.barcode === barcode)
        );

        // Then look up in mainProducts by matching vpCode directly, or via barcode, or name
        // Or if cogsMatch has mainSku, we can match main sku
        const match = mainProducts.find(p => 
          (vpCode && p.vpCode === vpCode) || 
          (cogsMatch && p.vpCode === cogsMatch.mainSku) ||
          (barcode && p.barcode === barcode) || 
          (name && p.name.toLowerCase() === name.toLowerCase())
        );

        // Determine COGS: prefer match.cogsUpdated, then cogsMatch.cogs, then fallback
        let resolvedCogs = 0;
        if (match) {
          resolvedCogs = match.cogsUpdated;
        } else if (cogsMatch) {
          resolvedCogs = cogsMatch.cogs;
        } else {
          resolvedCogs = listPrice * 0.55; // Fallback estimate
        }

        if (!match && !cogsMatch && name) {
          warnings.push(`Sản phẩm chính "${name}" (${vpCode || barcode}) không khớp dữ liệu gốc (hoặc cột SKU Phân Loại). Đã dùng ước lượng COGS tạm thời (55% giá catalogue).`);
        }

        currentMain = {
          id: `row-${rowIndex}-${vpCode || barcode || 'main'}`,
          campaignType,
          barcode,
          vpCode,
          productName: name || match?.name || cogsMatch?.name || 'Sản phẩm chính không tên',
          quantity,
          listPrice: listPrice || match?.rsp || cogsMatch?.rsp || 0,
          lowestPrice: lowestPrice || listPrice || match?.rsp || cogsMatch?.rsp || 0,
          gifts: [],
          matchedMainProduct: match,
          mainProductCogs: resolvedCogs
        };
        groupedItems.push(currentMain);
      } else if (isGift) {
        if (!currentMain) {
          warnings.push(`Dòng #${rowIndex + 2} là quà tặng "${name}" nhưng đứng độc lập, không có sản phẩm Main nâng đỡ ở phía trước.`);
          return;
        }

        // Match gift in COGS catalog to get business COGS
        // We look up by skuPhanLoai first since VP CODE corresponds to the SKU PHÂN LOẠI column in the COGS sheet.
        const giftMatch = cogsProducts.find(g => 
          (vpCode && g.skuPhanLoai === vpCode) || 
          (barcode && g.barcode === barcode) || 
          (vpCode && g.mainSku === vpCode) || 
          (name && g.name.toLowerCase() === name.toLowerCase())
        ) || (mainProducts.find(p => 
          (vpCode && p.vpCode === vpCode) || 
          (barcode && p.barcode === barcode) || 
          (name && p.name.toLowerCase() === name.toLowerCase())
        ) as any);

        const resolvedGiftCogs = giftMatch ? giftMatch.cogs : 0;

        if (!giftMatch && name) {
          warnings.push(`Quà tặng "${name}" (${vpCode || barcode}) không nằm trong danh mục COGS/SKU Phân Loại được phê duyệt. Tạm tính phí vốn quà tặng = 0đ.`);
        }

        currentMain.gifts.push({
          barcode,
          vpCode,
          productName: name || giftMatch?.name || 'Quà không tên',
          quantity,
          listPrice,
          lowestPrice,
          matchedGiftProduct: giftMatch,
          giftCogs: resolvedGiftCogs
        });
      }
    });

    // If activeItemDetails is null, select the first item
    if (groupedItems.length > 0 && !activeItemDetails) {
      setActiveItemDetails(groupedItems[0].id);
    }

    // Now compute the whole Shopee spreadsheet formula for each GroupedMainItem
    const computedGroups = groupedItems.map(item => {
      const basePrice = item.lowestPrice; // Lowest price as agreed sale price
      const shopVoucher = 0; // Default no shop voucher inputted from paste

      // Actual combined gift cost for this main
      const actualGiftCogs = item.gifts.reduce((sum, g) => sum + (g.giftCogs * g.quantity), 0);

      // Shopee plat vouchers
      const platformBasePrice = Math.max(0, basePrice - shopVoucher);
      const platformVoucherCost = calculateValue(feeConfigs.platformVoucher, platformBasePrice, feeConfigs.platformVoucherCap);

      // Compute Individual fees for Shopee standard
      const fixedFee = calculateValue(feeConfigs.fixedFee, basePrice);
      const infraFee = calculateValue(feeConfigs.infraFee, basePrice);
      const paymentFee = calculateValue(feeConfigs.paymentFee, basePrice);
      const voucherXtra = calculateValue(feeConfigs.voucherXtra, basePrice, feeConfigs.voucherXtraCap);
      const commission = calculateValue(feeConfigs.commission, basePrice);
      const ffmFee = calculateValue(feeConfigs.ffmFee, basePrice);
      const returnFee = calculateValue(feeConfigs.returnFee, basePrice);

      const totalFees = fixedFee + infraFee + paymentFee + voucherXtra + commission + ffmFee + returnFee;

      // Net Pool: Giá thấp nhất (basePrice) - Shop Voucher - Phí sàn - Quà tặng COGS
      const netPool = basePrice - shopVoucher - totalFees - actualGiftCogs;

      // Net profit: Net Pool - Vốn sản phẩm (mainProductCogs)
      const netProfit = netPool - item.mainProductCogs;

      // %GM = ((basePrice - shopVoucher - actualGiftCogs - mainProductCogs) / basePrice) * 100
      const percentageGM = basePrice > 0 
        ? ((basePrice - shopVoucher - actualGiftCogs - item.mainProductCogs) / basePrice) * 100 
        : 0;

      // %NM = ((netPool - mainProductCogs) / netPool) * 100 -> profit margin of Net Pool
      const percentageNM = netPool !== 0 
        ? (netProfit / netPool) * 100 
        : 0;

      // Calculate custom variants stored in state for this item
      const itemVariants = customVariants[item.id] || [];
      const computedVariants = itemVariants.map(variant => {
        const vBasePrice = variant.basePrice;
        const vShopVoucher = 0;
        const vActualGiftCogs = variant.gifts.reduce((sum, g) => sum + (g.giftCogs * g.quantity), 0);

        const vPlatformBasePrice = Math.max(0, vBasePrice - vShopVoucher);
        const vPlatformVoucherCost = calculateValue(feeConfigs.platformVoucher, vPlatformBasePrice, feeConfigs.platformVoucherCap);

        const vFixedFee = calculateValue(feeConfigs.fixedFee, vBasePrice);
        const vInfraFee = calculateValue(feeConfigs.infraFee, vBasePrice);
        const vPaymentFee = calculateValue(feeConfigs.paymentFee, vBasePrice);
        const vVoucherXtra = calculateValue(feeConfigs.voucherXtra, vBasePrice, feeConfigs.voucherXtraCap);
        const vCommission = calculateValue(feeConfigs.commission, vBasePrice);
        const vFfmFee = calculateValue(feeConfigs.ffmFee, vBasePrice);
        const vReturnFee = calculateValue(feeConfigs.returnFee, vBasePrice);

        const vTotalFees = vFixedFee + vInfraFee + vPaymentFee + vVoucherXtra + vCommission + vFfmFee + vReturnFee;
        const vNetPool = vBasePrice - vShopVoucher - vTotalFees - vActualGiftCogs;
        const vNetProfit = vNetPool - item.mainProductCogs;

        const vPercentageGM = vBasePrice > 0 
          ? ((vBasePrice - vShopVoucher - vActualGiftCogs - item.mainProductCogs) / vBasePrice) * 100 
          : 0;

        const vPercentageNM = vNetPool !== 0 
          ? (vNetProfit / vNetPool) * 100 
          : 0;

        return {
          ...variant,
          metrics: {
            basePrice: vBasePrice,
            shopVoucher: vShopVoucher,
            actualGiftCogs: vActualGiftCogs,
            platformVoucherCost: vPlatformVoucherCost,
            fixedFee: vFixedFee,
            infraFee: vInfraFee,
            paymentFee: vPaymentFee,
            voucherXtra: vVoucherXtra,
            commission: vCommission,
            ffmFee: vFfmFee,
            returnFee: vReturnFee,
            totalFees: vTotalFees,
            netPool: vNetPool,
            netProfit: vNetProfit,
            percentageGM: vPercentageGM,
            percentageNM: vPercentageNM,
            customerBuyPrice: vBasePrice - vShopVoucher - vPlatformVoucherCost
          }
        };
      });

      return {
        ...item,
        metrics: {
          basePrice,
          shopVoucher,
          actualGiftCogs,
          platformVoucherCost,
          fixedFee,
          infraFee,
          paymentFee,
          voucherXtra,
          commission,
          ffmFee,
          returnFee,
          totalFees,
          netPool,
          netProfit,
          percentageGM,
          percentageNM,
          customerBuyPrice: basePrice - shopVoucher - platformVoucherCost
        },
        customVariants: computedVariants
      };
    });

    // Stats calculations
    let totalMainPrice = 0;
    let totalNetPool = 0;
    let totalCogsSum = 0;
    let totalProfitSum = 0;
    let totalGiftsCogs = 0;

    computedGroups.forEach(g => {
      totalMainPrice += g.metrics.basePrice;
      totalNetPool += g.metrics.netPool;
      totalCogsSum += g.mainProductCogs;
      totalProfitSum += g.metrics.netProfit;
      totalGiftsCogs += g.metrics.actualGiftCogs;
    });

    const avgGM = totalMainPrice > 0 
      ? ((totalMainPrice - totalGiftsCogs - totalCogsSum) / totalMainPrice) * 100 
      : 0;

    const avgNM = totalNetPool > 0 
      ? (totalProfitSum / totalNetPool) * 100 
      : 0;

    const stats = {
      totalMain: computedGroups.length,
      totalGifts: computedGroups.reduce((acc, g) => acc + g.gifts.length, 0),
      totalValue: totalMainPrice,
      totalNetPool,
      totalGiftCogsValue: totalGiftsCogs,
      avgGM,
      avgNM,
      totalProfit: totalProfitSum
    };

    return {
      groupedItems: computedGroups,
      stats,
      warnings
    };
  }, [pastedText, feeConfigs, mainProducts, cogsProducts, customVariants]);

  const activeGroupItem = useMemo(() => {
    if (!processedData.groupedItems || processedData.groupedItems.length === 0) return null;
    return processedData.groupedItems.find(g => g.id === activeItemDetails) || processedData.groupedItems[0];
  }, [processedData.groupedItems, activeItemDetails]);

  // Export computed list to CSV
  const handleExportCSV = () => {
    if (processedData.groupedItems.length === 0) return;

    const headers = [
      'Campaign Type', 'Barcode', 'VP Code', 'Loai', 'Ten San Pham', 'Gia Thap Nhat (Selling)', 
      'COGS San Pham', 'Tong COGS Qua Tang', 'Phi Co Dinh Shopee', 'Phi Co Co So', 'Phi Thanh Toan (6%)', 
      'Voucher X-tra', 'Hoa hong', 'Fulfillment', 'Return Risk', 'NET POOL (Doanh Thu Thuan)', 
      'Loi Nhuan Thuan (Profit)', '%GM (Margin Gop)', '%NM (Margin Rong)'
    ];

    const rows = processedData.groupedItems.map(g => [
      `"${g.campaignType}"`,
      `"${g.barcode}"`,
      `"${g.vpCode}"`,
      'Main',
      `"${g.productName}"`,
      g.metrics.basePrice,
      g.mainProductCogs,
      g.metrics.actualGiftCogs,
      g.metrics.fixedFee,
      g.metrics.infraFee,
      g.metrics.paymentFee,
      g.metrics.voucherXtra,
      g.metrics.commission,
      g.metrics.ffmFee,
      g.metrics.returnFee,
      g.metrics.netPool,
      g.metrics.netProfit,
      `"${g.metrics.percentageGM.toFixed(1)}%"`,
      `"${g.metrics.percentageNM.toFixed(1)}%"`
    ]);

    // Append child gifts row for trace
    processedData.groupedItems.forEach(g => {
      g.gifts.forEach(gift => {
        rows.push([
          `"${g.campaignType}"`,
          `"${gift.barcode}"`,
          `"${gift.vpCode}"`,
          'Gift (Nested)',
          `"--> TANG: ${gift.productName}"`,
          gift.lowestPrice,
          0,
          gift.giftCogs,
          0, 0, 0, 0, 0, 0, 0, 0, 0, '""', '""'
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inochi_GoogleSheet_Paste_Calculated_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-750/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-indigo-500/30 inline-block">
              ✨ Tính năng mới
            </span>
            <h2 className="text-xl font-extrabold tracking-tight font-sans">
              Tính Giá Tự Động Từ Google Sheet
            </h2>
            <p className="text-indigo-200/80 text-xs max-w-xl">
              Chỉ cần sao chép (Copy) các sản phẩm trực tiếp từ trang quản lý file Google Sheet của bạn rồi dán (Paste) vào khung bên dưới để tự động tính toán cơ cấu quà tặng và biên lợi nhuận Shopee.
            </p>
          </div>
          <button
            onClick={loadSampleData}
            className="cursor-pointer text-xs bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/35 text-white font-extrabold px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-md hover:scale-103 active:scale-98 transition shrink-0"
          >
            <Sparkles size={14} /> Chạy Thử Mẫu Google Sheet
          </button>
        </div>
      </div>

      {/* Two Columns Grid: Input Area vs Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Paste Box Area */}
        <div className="col-span-1 lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Clipboard size={14} className="text-indigo-600 animate-pulse" />
              Khung Dán Dữ Liệu (Ctrl+v)
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Hỗ trợ đầy đủ bộ cột quy chuẩn</span>
          </div>

          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder={`Bấm Ctrl+V vào đây để dán bảng từ Sheets...

Cột quy chuẩn mẫu từ Google Sheet:
Campaign Type | Barcode | VP Code | Loại (Main/Gift) | Tên sản phẩm | Số lượng | Giá niêm yết | Giá thấp nhất`}
            className="w-full h-44 bg-slate-50/50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-505/20 focus:bg-white transition placeholder-slate-350 leading-relaxed resize-none"
          />

          <div className="flex justify-between items-center text-[11px] text-indigo-600 font-semibold bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50">
            <span className="flex items-center gap-1.5">
              <Info size={13} />
              Cơ cấu: Sản phẩm nào Loại "Main" thì các sản phẩm "Gift" phía dưới sẽ được phân phối tặng kèm.
            </span>
            {pastedText && (
              <button 
                onClick={() => setPastedText('')}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
              >
                <RotateCcw size={11} /> Xoá rỗng
              </button>
            )}
          </div>
        </div>

        {/* Shopee Fee Modifier sidebar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs flex flex-col space-y-4">
          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
              <Settings size={15} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Thông Số Phí Sàn Shopee</h3>
              <p className="text-[9px] text-slate-400 font-bold font-sans">Áp dụng trực tiếp vào bảng tính từ Google Sheet</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phí Cố Định</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  value={feeConfigs.fixedFee.val} 
                  onChange={(e) => setFeeConfigs(prev => ({ ...prev, fixedFee: { ...prev.fixedFee, val: parseFloat(e.target.value) || 0 } }))}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-2 py-1.5 font-bold font-mono text-[10px] flex items-center">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cổng Thanh Toán</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  value={feeConfigs.paymentFee.val} 
                  onChange={(e) => setFeeConfigs(prev => ({ ...prev, paymentFee: { ...prev.paymentFee, val: parseFloat(e.target.value) || 0 } }))}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-2 py-1.5 font-bold font-mono text-[10px] flex items-center">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hoa Hồng</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  value={feeConfigs.commission.val} 
                  onChange={(e) => setFeeConfigs(prev => ({ ...prev, commission: { ...prev.commission, val: parseFloat(e.target.value) || 0 } }))}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-2 py-1.5 font-bold font-mono text-[10px] flex items-center">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Voucher X-tra</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  value={feeConfigs.voucherXtra.val} 
                  onChange={(e) => setFeeConfigs(prev => ({ ...prev, voucherXtra: { ...prev.voucherXtra, val: parseFloat(e.target.value) || 0 } }))}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-2 py-1.5 font-bold font-mono text-[10px] flex items-center">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phí Vận Hành FFM</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  value={feeConfigs.ffmFee.val} 
                  onChange={(e) => setFeeConfigs(prev => ({ ...prev, ffmFee: { ...prev.ffmFee, val: parseFloat(e.target.value) || 0 } }))}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-2 py-1.5 font-bold font-mono text-[10px] flex items-center">%</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Hạ Tầng Vận Hành</label>
              <div className="flex rounded-lg shadow-3xs overflow-hidden border border-slate-200">
                <input 
                  type="text" 
                  value={feeConfigs.infraFee.val.toLocaleString('vi-VN')} 
                  onChange={(e) => {
                    const raw = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                    setFeeConfigs(prev => ({ ...prev, infraFee: { ...prev.infraFee, val: raw } }));
                  }}
                  className="w-full bg-slate-50 px-2.5 py-1.5 text-center font-bold text-slate-800 focus:outline-none" 
                />
                <span className="bg-slate-200/70 text-slate-600 px-1.5 py-1.5 font-bold font-mono text-[7px] flex items-center">VND</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Warning logger system if any mismatch */}
      {processedData.warnings.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-250 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-amber-900 uppercase">Hệ thống phát hiện ghi chú lệch khớp ({processedData.warnings.length}):</h4>
            <div className="max-h-24 overflow-y-auto text-[11px] text-amber-700 space-y-1 scrollbar-thin pl-1 font-semibold leading-relaxed">
              {processedData.warnings.map((warn, id) => (
                <div key={id} className="flex gap-1.5">
                  <span>•</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real-time stats blocks if loaded */}
      {processedData.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          
          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
              <Table size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase font-mono tracking-widest">Tổng Sản Phẩm</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold text-slate-900">{processedData.stats.totalMain} SKU</span>
                <span className="text-[9px] text-slate-400 font-bold">({processedData.stats.totalGifts} món quà)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase font-mono tracking-widest">Trung Bình Biên Gộp</span>
              <span className={`text-lg font-extrabold block mt-0.5 ${processedData.stats.avgGM >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {processedData.stats.avgGM.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-705 rounded-xl">
              <Coins size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase font-mono tracking-widest">Trung Bình Biên Ròng NM</span>
              <span className="text-lg font-extrabold text-emerald-600 block mt-0.5">
                {processedData.stats.avgNM.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs flex items-center gap-3">
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <CheckCircle size={18} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase font-mono tracking-widest">Tổng Net Pool Thuần</span>
              <span className="text-lg font-extrabold text-teal-600 block mt-0.5">
                {formatVND(processedData.stats.totalNetPool)}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Main Calculated Table Workspace */}
      {processedData.groupedItems.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Main workspace spreadsheet table (Cols: 2/3 width) */}
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs flex flex-col">
            <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-emerald-650" />
                  Chi Tiết Thành Phẩm & Biên Xuất Lực
                </h3>
                <p className="text-[10px] text-slate-404 mt-0.5 font-bold font-sans">
                  Sắp xếp tuyến tính: Sản phẩm chính đính kèm danh sách quà tặng tương ứng từ Google Sheet.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="cursor-pointer text-[10px] bg-emerald-600 hover:bg-emerald-505 text-white font-extrabold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-3xs transition"
              >
                <Download size={12} /> Tải file CSV bảng tính
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="bg-slate-100/90 font-bold text-slate-500/85 text-[10px] uppercase tracking-wider border-b border-slate-200 font-mono">
                    <th className="py-3 px-4 w-[280px]">Sản Phẩm Main / Tặng kèm</th>
                    <th className="py-3 px-3 text-right">Giá Trả Thượng</th>
                    <th className="py-3 px-3 text-right">COGS Vốn</th>
                    <th className="py-3 px-3 text-right">COGS Quà</th>
                    <th className="py-3 px-3 text-right bg-emerald-50/35 text-emerald-800 font-mono font-bold">Net Pool</th>
                    <th className="py-3 px-3 text-center bg-amber-50/50 text-amber-800">%GM</th>
                    <th className="py-3 px-4 text-center bg-emerald-50 text-emerald-800">%NM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {processedData.groupedItems.map((item) => {
                    const isSelected = item.id === activeItemDetails;
                    return (
                      <React.Fragment key={item.id}>
                        {/* Main Product row */}
                        <tr 
                          onClick={() => setActiveItemDetails(item.id)}
                          className={`cursor-pointer transition-all hover:bg-indigo-50/20 ${
                            isSelected ? 'bg-indigo-55/10 border-l-4 border-indigo-600' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-2.5">
                              {/* Product Image Thumbnail */}
                              {(() => {
                                const imgUrl = getProductImage(item.vpCode);
                                return (
                                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs mt-0.5">
                                    {imgUrl ? (
                                      <img 
                                        src={imgUrl} 
                                        alt={item.productName} 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <span className="text-[8px] uppercase font-black text-slate-400">No Img</span>
                                    )}
                                  </div>
                                );
                              })()}

                              <div className="flex-1 min-w-0 flex flex-col">
                                {/* Product name & Bold visible Comparison Button */}
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-extrabold text-slate-800 tracking-tight leading-snug line-clamp-1 flex-1">
                                    {item.productName}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateVariant(item.id);
                                    }}
                                    className="shrink-0 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-3xs hover:scale-105 active:scale-95 transition-all border border-amber-600/10"
                                    title="Tạo phương án so sánh giá và quà tặng mới để tùy chỉnh"
                                  >
                                    <Plus size={11} className="stroke-[3]" />
                                    <span>Tạo so sánh</span>
                                  </button>
                                </div>

                                <div className="flex gap-1.5 items-center mt-1.5 text-[9px] font-mono font-bold flex-wrap">
                                  <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-1.5 rounded uppercase">Main</span>
                                  {item.campaignType && (
                                    <span className="bg-amber-50 border border-amber-200 text-amber-800 px-1.5 rounded uppercase">
                                      ⚡ {item.campaignType}
                                    </span>
                                  )}
                                  <span className="text-slate-400 font-bold">VP: {item.vpCode || 'N/A'}</span>
                                  {stockRecords && (
                                    (() => {
                                      const matching = stockRecords.filter(s => s.skuPhanLoai === item.vpCode);
                                      const total = matching.reduce((sum, s) => sum + s.quantity, 0);
                                      const south = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                                      const north = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                                      if (total > 0) {
                                        return (
                                          <span className="bg-teal-50 border border-teal-150 text-teal-800 px-1.5 rounded text-[8px] font-sans font-extrabold tracking-tight" title={`Miền Bắc: ${north} | Miền Nam: ${south}`}>
                                            Tồn kho: {total} (Bắc: {north} | Nam: {south})
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="bg-rose-50 border border-rose-150 text-rose-700 px-1.5 rounded text-[8px] font-sans font-extrabold tracking-tight">
                                          Hết tồn kho
                                        </span>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">{formatVND(item.metrics.basePrice)}</td>
                          <td className="py-3 px-3 text-right font-mono text-indigo-700 font-bold">{formatVND(item.mainProductCogs)}</td>
                          <td className="py-3 px-3 text-right font-mono text-cyan-600">
                            {item.metrics.actualGiftCogs > 0 ? formatVND(item.metrics.actualGiftCogs) : <span className="text-slate-350 font-normal">Không có</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-teal-700 bg-emerald-50/15">{formatVND(item.metrics.netPool)}</td>
                          <td className="py-3 px-3 text-center bg-amber-50/10 font-bold text-amber-700">{item.metrics.percentageGM.toFixed(0)}%</td>
                          <td className="py-3 px-4 text-center bg-emerald-50/30 font-extrabold text-emerald-800">{item.metrics.percentageNM.toFixed(0)}%</td>
                        </tr>

                        {/* Nested Gift list rows */}
                        {item.gifts.length > 0 && item.gifts.map((gift, gId) => (
                          <tr key={`${item.id}-gift-${gId}`} className="bg-slate-50/40 text-[11px] text-slate-650 hover:bg-slate-100/30">
                            <td className="py-2.5 px-4 pl-9">
                              <div className="flex items-center gap-3">
                                <CornerDownRight size={12} className="text-indigo-400 shrink-0" />
                                
                                {/* Gift Image Thumbnail */}
                                {(() => {
                                  const imgUrl = getProductImage(gift.vpCode);
                                  return (
                                    <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-205/60 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                                      {imgUrl ? (
                                        <img 
                                          src={imgUrl} 
                                          alt={gift.productName} 
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <span className="text-[7px] uppercase font-black text-slate-400">Gift</span>
                                      )}
                                    </div>
                                  );
                                })()}

                                <div className="min-w-0 flex-1 flex flex-col">
                                  <p className="font-semibold text-slate-705 leading-tight line-clamp-1 flex items-center gap-1.5 flex-wrap">
                                    <span>{gift.productName}</span>
                                    {stockRecords && (
                                      (() => {
                                        const matching = stockRecords.filter(s => s.skuPhanLoai === gift.vpCode);
                                        const total = matching.reduce((sum, s) => sum + s.quantity, 0);
                                        const south = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                                        const north = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                                        if (total > 0) {
                                          return (
                                            <span className="text-[8px] text-teal-700 bg-emerald-50 border border-emerald-100 px-1 rounded font-bold" title={`Bắc: ${north} | Nam: ${south}`}>
                                              Kho: {total} (B:{north}|N:{south})
                                            </span>
                                          );
                                        }
                                        return (
                                          <span className="text-[8px] text-rose-700 bg-rose-50 border border-rose-100 px-1 rounded font-bold">
                                            Hết hàng
                                          </span>
                                        );
                                      })()
                                    )}
                                  </p>
                                  <p className="text-[8px] text-slate-400 font-mono font-bold mt-0.5">SL: {gift.quantity} x Sàn trợ giá: {formatVND(gift.lowestPrice)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-405 font-mono">-</td>
                            <td className="py-2.5 px-3 text-right text-slate-405 font-mono">-</td>
                            <td className="py-2.5 px-3 text-right font-mono text-cyan-625 font-bold">
                              {formatVND(gift.giftCogs * gift.quantity)}
                              <span className="text-[8px] text-cyan-500 ml-1">vốn</span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-404 font-mono">-</td>
                            <td className="py-2.5 px-3 text-center text-slate-404 font-mono">-</td>
                            <td className="py-2.5 px-4 text-center text-slate-404 font-mono">-</td>
                          </tr>
                        ))}

                        {/* Custom comparison variants list rows */}
                        {item.customVariants && item.customVariants.length > 0 && item.customVariants.map((customVar) => (
                          <tr key={customVar.id} className="bg-amber-50/15 text-[11.5px] font-medium border-l-4 border-amber-500 hover:bg-amber-50/25 transition-all animate-fade-in">
                            <td className="py-3 px-4 pl-6">
                              <div className="flex flex-col space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-amber-150 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                    {customVar.label}
                                  </span>
                                  <span className="text-slate-405 font-extrabold text-[9px] uppercase tracking-wide">
                                    (Biến so sánh)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingVariant({ itemId: item.id, variantId: customVar.id });
                                    }}
                                    className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9px] font-extrabold border border-amber-250/50 rounded cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    Cấu hình lại
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteVariant(item.id, customVar.id);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 border border-rose-205 text-rose-600 text-[9px] font-extrabold rounded cursor-pointer transition flex items-center gap-0.5"
                                  >
                                    Xóa
                                  </button>
                                </div>
                                {/* List of alternative gifts under this comparison variant */}
                                <div className="pl-4 flex flex-col gap-1 text-[9.5px] text-slate-600 font-semibold">
                                  {customVar.gifts.length === 0 ? (
                                    <span className="text-slate-400 font-normal italic">Không áp dụng quà tặng nào</span>
                                  ) : (
                                    <div className="space-y-1.5">
                                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Danh quà quy hoạch:</span>
                                      {customVar.gifts.map((g, gi) => {
                                        const imgUrl = getProductImage(g.vpCode);
                                        return (
                                          <div key={gi} className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                                              {imgUrl ? (
                                                <img 
                                                  src={imgUrl} 
                                                  alt={g.productName} 
                                                  className="w-full h-full object-cover"
                                                  referrerPolicy="no-referrer"
                                                />
                                              ) : (
                                                <span className="text-amber-500 text-[9px]">🎁</span>
                                              )}
                                            </div>
                                            <span className="text-slate-705 truncate max-w-[190px]" title={g.productName}>{g.productName}</span>
                                            <span className="text-slate-450 font-mono text-[9px] shrink-0">(SL: {g.quantity} - Cost: {formatVND(g.giftCogs)})</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-amber-700 font-black bg-amber-50/5">{formatVND(customVar.metrics.basePrice)}</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-400">-</td>
                            <td className="py-3 px-3 text-right font-mono text-cyan-625 font-bold bg-amber-50/5">
                              {customVar.metrics.actualGiftCogs > 0 ? (
                                <>
                                  {formatVND(customVar.metrics.actualGiftCogs)}
                                  <span className="text-[8px] text-cyan-500 ml-1 font-bold">vốn</span>
                                </>
                              ) : (
                                <span className="text-slate-350">0đ</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold text-teal-700 bg-emerald-50/15">{formatVND(customVar.metrics.netPool)}</td>
                            <td className={`py-3 px-3 text-center font-bold bg-amber-55/10 ${customVar.metrics.percentageGM >= 20 ? 'text-emerald-700' : 'text-rose-600'}`}>{customVar.metrics.percentageGM.toFixed(0)}%</td>
                            <td className={`py-3 px-4 text-center font-extrabold bg-emerald-50/35 ${customVar.metrics.percentageNM >= 10 ? 'text-emerald-750' : 'text-rose-600'}`}>{customVar.metrics.percentageNM.toFixed(0)}%</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic details checklist panel (1/3 width) */}
          <div className="xl:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs h-fit space-y-4">
            
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Eye size={15} className="text-indigo-600" />
                Ledger Phí & Doanh Thu Sàn
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5 font-bold font-sans">
                Kiểm duyệt phân rã bảng phí Shopee chi tiết đối với sản phẩm đang chọn.
              </p>
            </div>

            {activeGroupItem ? (
              <div className="space-y-4">
                
                {/* Active Info Brief */}
                <div className="bg-indigo-50/20 border border-indigo-100/50 p-3 rounded-2xl flex gap-3">
                  {(() => {
                    const imgUrl = getProductImage(activeGroupItem.vpCode);
                    return (
                      <div className="w-12 h-12 rounded-xl bg-white border border-indigo-100 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                        {imgUrl ? (
                          <img 
                            src={imgUrl} 
                            alt={activeGroupItem.productName} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[9px] uppercase font-black text-indigo-400">No Img</span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Đang kiểm duyệt</span>
                      {activeGroupItem.campaignType && (
                        <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                          {activeGroupItem.campaignType}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-800 mt-1 leading-snug line-clamp-2">{activeGroupItem.productName}</p>
                    <p className="text-[10px] text-indigo-655 font-mono mt-0.5 font-bold">Cổng giá bán ròng: {formatVND(activeGroupItem.lowestPrice)}</p>
                  </div>
                </div>

                {/* Ledger Waterfall List */}
                <div className="space-y-2 text-xs font-mono">
                  
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-sans font-bold">1. Tổng giá bán từ Sheet:</span>
                    <span className="font-extrabold text-slate-900">{formatVND(activeGroupItem.metrics.basePrice)}</span>
                  </div>

                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-400 font-sans font-bold">2. Trừ vốn sản phẩm (COGS):</span>
                    <span className="font-bold text-rose-600">-{formatVND(activeGroupItem.mainProductCogs)}</span>
                  </div>

                  {activeGroupItem.metrics.actualGiftCogs > 0 && (
                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                      <span className="text-slate-400 font-sans font-bold">3. Trừ vốn tặng quà (Gifts COGS):</span>
                      <span className="font-bold text-cyan-600">-{formatVND(activeGroupItem.metrics.actualGiftCogs)}</span>
                    </div>
                  )}

                  {/* Operational breakdown */}
                  <div className="bg-slate-50/60 p-2.5 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí cố định ({feeConfigs.fixedFee.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.fixedFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Hoa hồng sàn ({feeConfigs.commission.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.commission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Cổng thanh toán ({feeConfigs.paymentFee.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.paymentFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Gói Voucher X-tra ({feeConfigs.voucherXtra.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.voucherXtra)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Kho bãi FFM ({feeConfigs.ffmFee.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.ffmFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí chuyển phát hạ tầng:</span>
                      <span>-{formatVND(activeGroupItem.metrics.infraFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Dự phòng hoàn hàng ({feeConfigs.returnFee.val}%):</span>
                      <span>-{formatVND(activeGroupItem.metrics.returnFee)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-800 font-sans font-bold">4. Tổng chi phí sàn tài trợ:</span>
                    <span className="font-semibold text-amber-600">-{formatVND(activeGroupItem.metrics.totalFees)}</span>
                  </div>

                  <div className="flex justify-between items-center sm:gap-2 pt-3 border-t border-slate-200">
                    <span className="text-slate-800 font-sans font-extrabold text-[11px] uppercase tracking-wide">DOANH THU THUẦN (Net Pool):</span>
                    <span className="text-teal-600 text-sm font-extrabold font-mono">{formatVND(activeGroupItem.metrics.netPool)}</span>
                  </div>

                  <div className="flex justify-between items-center sm:gap-2 pt-2 border-b border-slate-100 pb-2">
                    <span className="text-slate-855 font-sans font-extrabold text-[11px] uppercase tracking-wide">LỢI NHUẬN RÒNG (NM):</span>
                    <span className={`text-sm font-extrabold font-mono ${activeGroupItem.metrics.netProfit >= 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                      {formatVND(activeGroupItem.metrics.netProfit)}
                    </span>
                  </div>

                </div>

                {/* Micro Analysis advice tags */}
                <div className="space-y-2 bg-slate-50/40 p-3 rounded-2xl border border-slate-150/50">
                  <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                    <Sparkles size={11} /> Đánh gía hiệu quả:
                  </span>
                  <div className="text-[11px] leading-relaxed text-slate-600 font-sans font-semibold">
                    {activeGroupItem.metrics.percentageGM < 20 ? (
                      <p className="text-rose-600 font-bold">⚠️ Biên gộp của sản phẩm này quá thấp ({activeGroupItem.metrics.percentageGM.toFixed(1)}%). Nên sụt bớt số lượng quà tặng hoặc thương thảo tăng giá sàn bán.</p>
                    ) : activeGroupItem.metrics.percentageNM < 10 ? (
                      <p className="text-amber-600 font-bold">⚠️ Biên ròng (NM%) sau phí sàn Shopee chỉ đạt {activeGroupItem.metrics.percentageNM.toFixed(1)}%. Cần chú ý giảm các gói Voucher Xtra hoặc tối ưu phân bổ vận hành.</p>
                    ) : (
                      <p className="text-emerald-600 font-bold">✅ SKU vận hành biên rất tốt! Biên gộp %GM = {activeGroupItem.metrics.percentageGM.toFixed(0)}% và biên ròng Net Pool %NM = {activeGroupItem.metrics.percentageNM.toFixed(0)}% đạt kì vọng.</p>
                    )}
                  </div>
                </div>

                {/* Warehouse Stock detail */}
                {stockRecords && (
                  (() => {
                    const mainStock = stockRecords.filter(s => s.skuPhanLoai === activeGroupItem.vpCode);
                    const totalMain = mainStock.reduce((sum, s) => sum + s.quantity, 0);
                    const southMain = mainStock.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                    const northMain = mainStock.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;

                    return (
                      <div className="space-y-2 bg-slate-50/40 p-3 rounded-2xl border border-slate-150/50">
                        <span className="text-[9px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                          📦 THÔNG TIN TỒN KHO THỰC TẾ:
                        </span>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold font-sans">Miền Nam (BMVN_HCM_BTN):</span>
                            <span className={`font-semibold font-mono ${southMain > 15 ? 'text-teal-700 font-bold' : southMain > 0 ? 'text-amber-700 font-bold' : 'text-slate-400 font-normal'}`}>
                              {southMain} chiếc
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-white p-1.5 rounded-lg border border-slate-100">
                            <span className="text-slate-500 font-semibold font-sans">Miền Bắc (BMVN_BN_VSIP):</span>
                            <span className={`font-semibold font-mono ${northMain > 15 ? 'text-teal-700 font-bold' : northMain > 0 ? 'text-amber-700 font-bold' : 'text-slate-400 font-normal'}`}>
                              {northMain} chiếc
                            </span>
                          </div>
                          <div className="flex justify-between items-center bg-teal-50 border border-teal-100 p-1.5 rounded-lg">
                            <span className="text-teal-900 font-extrabold font-sans">Tổng tồn kho toàn quốc:</span>
                            <span className={`font-black font-mono ${totalMain > 30 ? 'text-teal-700 font-extrabold' : totalMain > 0 ? 'text-amber-700 font-extrabold' : 'text-rose-600 font-extrabold'}`}>
                              {totalMain} chiếc
                            </span>
                          </div>
                        </div>

                        {/* Gift stock breakdown if any */}
                        {activeGroupItem.gifts.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-205 space-y-1.5">
                            <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">
                              🎁 TỒN KHO QUÀ TẶNG KÈM THEO:
                            </span>
                            {activeGroupItem.gifts.map((g, gi) => {
                              const gStock = stockRecords.filter(s => s.skuPhanLoai === g.vpCode);
                              const totalG = gStock.reduce((sum, s) => sum + s.quantity, 0);
                              const southG = gStock.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                              const northG = gStock.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                              return (
                                <div key={gi} className="text-[10px] bg-white p-2 rounded-xl border border-slate-100 space-y-1">
                                  <div className="font-extrabold text-slate-850 line-clamp-1">{g.productName}</div>
                                  <div className="text-[8px] text-slate-400 font-mono font-bold">SKU: {g.vpCode || 'N/A'}</div>
                                  <div className="flex justify-between text-slate-500 pt-0.5 text-[9px]">
                                    <span>Nam (HCM): <strong className="text-slate-700">{southG}</strong></span>
                                    <span>Bắc (BN): <strong className="text-slate-700">{northG}</strong></span>
                                    <span className="text-indigo-600 font-bold">Tổng: <strong className="text-indigo-700">{totalG}</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-[11px] font-medium leading-relaxed">
                <Layers size={24} className="mx-auto text-slate-300 mb-2" />
                Vui lòng paste dữ liệu từ Google Sheets sang khung bên trái để hiển thị Ledger chi tiết ở đây.
              </div>
            )}

          </div>

        </div>
      )}

      {/* Guide Info panel */}
      {processedData.groupedItems.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-10 space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
            <Clipboard size={22} className="animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-800 text-sm">Chưa có bảng sao chép nào được nạp</h3>
            <p className="text-xs text-slate-400 max-w-md">
              Để thẩm định cơ cấu %GM & %NM nhanh từ Google Sheet, bạn chỉ cần mở bảng Excel, bôi đen toàn bộ các cột từ <strong className="text-indigo-600">Campaign Type đến Giá thấp nhất</strong>, bấm <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] border">Ctrl+C</kbd>, rồi chuyển sang đây nhấn <kbd className="px-1.5 py-0.5 bg-indigo-100 rounded text-[10px] text-indigo-600 border border-indigo-200">Ctrl+V</kbd>.
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={loadSampleData}
              className="cursor-pointer text-xs bg-slate-900 hover:bg-slate-850 text-white font-extrabold px-4.5 py-2.5 rounded-xl transition shadow-sm"
            >
              Chạy bảng mẫu ngay
            </button>
          </div>
        </div>
      )}

      {/* Modern Dialog Config Variant popovers */}
      {editingVariant && (() => {
        const { itemId, variantId } = editingVariant;
        const item = processedData.groupedItems.find(g => g.id === itemId);
        const variantIndex = (customVariants[itemId] || []).findIndex(v => v.id === variantId);
        const variant = (customVariants[itemId] || [])[variantIndex];
        if (!variant || !item) return null;

        const selectGift = (p: CogsProduct) => handleSelectGiftForVariant(itemId, variantId, p);
        const updateGiftQty = (gi: number, delta: number) => handleUpdateGiftQty(itemId, variantId, gi, delta);
        const setGiftQty = (gi: number, qty: number) => handleSetGiftQty(itemId, variantId, gi, qty);
        const deleteGift = (gi: number) => handleDeleteGiftFromVariant(itemId, variantId, gi);
        const clearGifts = () => handleClearAllGifts(itemId, variantId);

        const totalGiftsQuantity = variant.gifts.reduce((sum, g) => sum + g.quantity, 0);
        const totalGiftsCogs = variant.gifts.reduce((sum, g) => sum + (g.giftCogs * g.quantity), 0);
        const formulaQuota = variant.basePrice * 0.08;

        return createPortal(
          <div className="fixed inset-0 z-[9999] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 md:p-10 animate-fade-in text-slate-705 font-sans">
            <div className="bg-white rounded-3xl w-full max-w-6xl h-[85vh] max-h-[85vh] shadow-2xl overflow-hidden border border-slate-200/60 flex flex-col animate-slide-up text-left">
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                    <Sparkles size={16} className="text-amber-500 shrink-0" />
                    Cơ cấu so sánh Giá & Quà tặng
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sản phẩm: <strong className="text-slate-800 font-extrabold">{item.productName}</strong> | Giá gốc trên Sheet: <strong className="text-slate-700 font-mono">{formatVND(item.lowestPrice)}</strong>
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingVariant(null);
                    setGiftSearchTerm('');
                  }}
                  className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 px-3.5 py-2 rounded-xl transition shrink-0 uppercase"
                  title="Đóng cấu hình"
                >
                  Đóng ✕
                </button>
              </div>

              {/* Two-Pane Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50/20">
                
                {/* Left Pane - Pricing, Label & Chosen Gifts list */}
                <div className="w-full md:w-[380px] shrink-0 border-r border-slate-200 bg-white flex flex-col h-1/2 md:h-full min-h-0">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-150 text-xs font-black text-slate-500 uppercase tracking-wider">
                    Thông tin so sánh & Quà chọn
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Variant Label Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-sans">Tên nhãn phương án so sánh</label>
                      <input 
                        type="text" 
                        value={variant.label}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setCustomVariants(prev => {
                            const list = [...(prev[itemId] || [])];
                            list[variantIndex] = { ...list[variantIndex], label: newVal };
                            return { ...prev, [itemId]: list };
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 transition focus:outline-hidden"
                        placeholder="e.g. Điều chỉnh giá và quà..."
                      />
                    </div>

                    {/* New Custom Price proposal */}
                    <div className="space-y-1.5 pb-3 border-b border-slate-100">
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block font-sans">Giá bán thương lượng mới (VND)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={variant.basePrice}
                          onChange={(e) => {
                            const newVal = Number(e.target.value) || 0;
                            setCustomVariants(prev => {
                              const list = [...(prev[itemId] || [])];
                              list[variantIndex] = { ...list[variantIndex], basePrice: newVal };
                              return { ...prev, [itemId]: list };
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-3.5 pr-12 py-2 text-xs font-mono font-black text-slate-800 transition focus:outline-hidden"
                          placeholder="Ví dụ: 1150000"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-black text-slate-400 font-mono">đ</span>
                      </div>
                      <p className="text-[9px] text-indigo-500 font-bold italic">
                        * Quỹ định mức quà 8%: ~{formatVND(formulaQuota)}
                      </p>
                    </div>

                    {/* Gift List */}
                    <div className="space-y-3 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">DANH SÁCH QUÀ CHỌN({variant.gifts.length})</span>
                      </div>

                      {/* Not Apply Row Option */}
                      <div 
                        onClick={clearGifts}
                        className={`cursor-pointer border border-dashed rounded-xl p-3 flex items-center gap-2.5 transition duration-150 ${
                          variant.gifts.length === 0
                            ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-450 text-rose-700'
                            : 'bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/20 text-slate-600 hover:text-rose-600'
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-black text-rose-700">✕</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-extrabold text-[11px] block">Không áp dụng quà tặng</span>
                          <span className="text-[8.5px] text-slate-400 block leading-tight">Mục tiêu tối ưu biên phần trăm Net Pool %NM</span>
                        </div>
                      </div>

                      {/* Chosen Gift rows list */}
                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {variant.gifts.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-205 rounded-xl text-slate-400 text-[10px] italic font-semibold">
                            Chưa chọn quà tặng nào. Tìm và thêm quà ở danh mục bên phải.
                          </div>
                        ) : (
                          variant.gifts.map((g, gi) => (
                            <div key={gi} className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2 rounded-xl text-xs font-semibold relative leading-snug">
                              {/* Gift image search/pull */}
                              {(() => {
                                const imgUrl = getProductImage(g.vpCode);
                                return (
                                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-205 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                                    {imgUrl ? (
                                      <img src={imgUrl} alt={g.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-amber-500 text-xs">🎁</span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="flex-1 min-w-0 pr-1">
                                <p className="text-slate-800 font-extrabold text-[10.5px] leading-snug whitespace-normal break-words" title={g.productName}>{g.productName}</p>
                                <p className="text-[8px] text-slate-400 font-mono leading-tight mt-0.5 truncate">SKU: {g.vpCode}</p>
                                <p className="text-[8.5px] text-indigo-650 font-black font-mono leading-tight mt-0.5">Vốn: {formatVND(g.giftCogs)}</p>
                              </div>
                              
                              {/* Quantity Selector */}
                              <div className="flex items-center gap-1 select-none text-[10px] shrink-0 font-bold">
                                <button 
                                  type="button"
                                  disabled={g.quantity <= 1}
                                  onClick={() => updateGiftQty(gi, -1)}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-black text-slate-600 hover:bg-slate-100 disabled:opacity-40 inline-flex shrink-0 cursor-pointer"
                                >
                                  -
                                </button>
                                <input 
                                  type="number"
                                  min="1"
                                  value={g.quantity}
                                  onChange={(e) => setGiftQty(gi, Number(e.target.value) || 1)}
                                  className="w-8 bg-white border border-slate-250 rounded py-0.5 text-center font-bold font-mono text-[9px]"
                                />
                                <button 
                                  type="button"
                                  onClick={() => updateGiftQty(gi, 1)}
                                  className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center text-xs font-black text-slate-600 hover:bg-slate-100 inline-flex shrink-0 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              {/* Delete action */}
                              <button
                                type="button"
                                onClick={() => deleteGift(gi)}
                                className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-md transition cursor-pointer text-[10px] shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>

                </div>

                {/* Right Pane - Gift Selection Browser */}
                <div className="flex-1 flex flex-col h-1/2 md:h-full min-h-0 bg-slate-50/10">
                  
                  {/* Gift Search & Segment Filters */}
                  <div className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                    <div className="flex-1 max-w-sm relative">
                      <input 
                        type="text"
                        value={giftSearchTerm}
                        onChange={(e) => setGiftSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm tên, mã SKU phân loại quà..."
                        className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-indigo-500 rounded-xl px-3.5 py-2 pr-8 text-xs font-semibold placeholder-slate-400 focus:outline-hidden transition shadow-3xs text-slate-800"
                      />
                      {giftSearchTerm && (
                        <button 
                          onClick={() => setGiftSearchTerm('')}
                          className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-650 px-1 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Segmented safety budget filter */}
                    <div className="flex items-center gap-1 bg-slate-200/50 p-0.5 rounded-xl border border-slate-200/40 text-xs">
                      <button
                        type="button"
                        onClick={() => setGiftBudgetFilter('all')}
                        className={`cursor-pointer px-4 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all ${
                          giftBudgetFilter === 'all'
                            ? 'bg-white text-indigo-700 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        Tất cả ({inochiGifts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setGiftBudgetFilter('suitable')}
                        className={`cursor-pointer px-4 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                          giftBudgetFilter === 'suitable'
                            ? 'bg-emerald-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:text-emerald-700'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${giftBudgetFilter === 'suitable' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                        Phù hợp định mức (8%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGiftBudgetFilter('exceeded')}
                        className={`cursor-pointer px-4 py-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                          giftBudgetFilter === 'exceeded'
                            ? 'bg-rose-600 text-white shadow-3xs'
                            : 'text-slate-500 hover:text-rose-700'
                        }`}
                      >
                        <span className={`w-1 h-1 rounded-full ${giftBudgetFilter === 'exceeded' ? 'bg-white' : 'bg-rose-500'}`}></span>
                        Vượt định mức
                      </button>
                    </div>
                  </div>

                  {/* Browser Main Double List layout */}
                  <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
                    
                    {/* Inner Left - Gift groups list */}
                    <div className="w-[260px] shrink-0 border-r border-slate-200 flex flex-col h-full min-h-0 bg-slate-50/10">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-150 flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <span>Nhóm quà ({filteredGroupedGifts.length})</span>
                        <span className="text-[8px] text-indigo-600 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-full uppercase leading-none">phân loại</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {filteredGroupedGifts.length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <span className="block text-xs font-semibold">Không tìm thấy nhóm quà</span>
                          </div>
                        ) : (
                          filteredGroupedGifts.map((gGroup) => {
                            const isSelected = selectedGiftGroup?.mainSku === gGroup.mainSku;
                            const groupStockTotal = gGroup.variants.reduce((acc, v) => {
                              const matching = stockRecords ? stockRecords.filter(s => s.skuPhanLoai === v.skuPhanLoai) : [];
                              return acc + matching.reduce((sum, s) => sum + s.quantity, 0);
                            }, 0);
                            const isGroupOutOfStock = stockRecords && groupStockTotal === 0;

                            return (
                              <div
                                key={gGroup.mainSku}
                                onClick={() => setSelectedGiftGroupSku(gGroup.mainSku)}
                                className={`cursor-pointer p-2.5 rounded-xl border flex gap-2.5 items-center transition duration-150 ${
                                  isGroupOutOfStock
                                    ? isSelected
                                      ? 'bg-rose-50 border-rose-500 ring-1 ring-rose-400'
                                      : 'bg-rose-50/10 border-rose-200 hover:border-rose-400'
                                    : isSelected
                                      ? 'bg-indigo-50/50 border-indigo-500 ring-1 ring-indigo-400'
                                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                                }`}
                              >
                                {gGroup.img ? (
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src={gGroup.img} className="w-full h-full object-cover" alt={gGroup.mainSku} referrerPolicy="no-referrer" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] shrink-0 font-extrabold">🎁</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-extrabold text-[11px] text-slate-800 block truncate leading-snug" title={gGroup.mainSku}>{gGroup.mainSku}</span>
                                  {gGroup.name && (
                                    <span className="text-[10px] text-slate-500 block truncate leading-tight mt-0.5" title={gGroup.name}>
                                      {gGroup.name}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1 flex-wrap mt-1">
                                    <span className="text-[7.5px] bg-slate-100 text-slate-500 px-1 rounded-sm uppercase font-black shrink-0">{gGroup.category}</span>
                                    {stockRecords && (
                                      <span className={`text-[7.5px] px-1 rounded-sm uppercase font-extrabold shrink-0 ${isGroupOutOfStock ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-indigo-50 text-indigo-700'}`}>
                                        Tồn: {groupStockTotal}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Inner Right - Selected Group Variant Rows */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                      {!selectedGiftGroup ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          Vui lòng chọn nhóm quà từ danh sách bên cạnh.
                        </div>
                      ) : (
                        <>
                          {/* Banner summary card for parent of selected gift group */}
                          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/20 flex gap-4 items-start shadow-4xs shrink-0">
                            {selectedGiftGroup.img ? (
                              <div className="w-16 h-16 rounded-xl border border-slate-200/50 bg-white overflow-hidden shrink-0 shadow-3xs flex items-center justify-center">
                                <img src={selectedGiftGroup.img} alt={selectedGiftGroup.mainSku} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-350 text-2xl">🎁</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">QUÀ TẶNG THƯƠNG HIỆU INOCHI</span>
                                <span className="bg-slate-150 text-slate-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">Main SKU: {selectedGiftGroup.mainSku}</span>
                              </div>
                              <h4 className="font-extrabold text-slate-850 text-sm mt-1 mb-0.5 leading-snug">{selectedGiftGroup.mainSku}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">Bấm "Thêm quà" dưới mỗi phân loại cụ thể bên dưới để đưa vào phương án so sánh.</p>
                            </div>
                          </div>

                          {/* Variants Structure Header */}
                          <div className="text-xs font-black text-slate-500 uppercase tracking-widest pt-2 flex justify-between items-center bg-white sticky top-0 pb-1 z-10">
                            <span>Sản phẩm cùng nhóm quà tặng ({selectedGiftGroup.variants.length})</span>
                            <span className="text-[9px] bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded tracking-wide uppercase font-sans shrink-0">Đã đồng bộ kho mảng</span>
                          </div>

                          {/* Variant selection rows */}
                          <div className="space-y-3">
                            {selectedGiftGroup.variants.map((v, vidx) => {
                              const matching = stockRecords ? stockRecords.filter(s => s.skuPhanLoai === v.skuPhanLoai) : [];
                              const totalStock = matching.reduce((sum, s) => sum + s.quantity, 0);
                              const southStock = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                              const northStock = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                              const isOutOfStock = stockRecords && stockRecords.length > 0 && totalStock === 0;

                              const alreadyGift = variant.gifts.find(g => g.vpCode === v.skuPhanLoai);
                              const currentQty = alreadyGift?.quantity || 0;

                              return (
                                <div 
                                  key={vidx}
                                  className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150 ${
                                    isOutOfStock
                                      ? 'border-slate-150 bg-slate-50/20'
                                      : alreadyGift
                                        ? 'border-indigo-400 bg-indigo-50/10 shadow-3xs ring-1 ring-indigo-400'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-4xs'
                                  }`}
                                >
                                  {/* Left details */}
                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="font-sans font-black text-slate-800 text-[12px] whitespace-normal break-words leading-snug flex-1" title={v.name}>
                                        {v.name}
                                      </h5>
                                      {alreadyGift && (
                                        <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase font-mono shadow-4xs shrink-0">
                                          Đã chọn: SL {currentQty}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-mono leading-tight">Phân loại: <strong className="text-slate-500 font-black">{v.skuPhanLoai}</strong></p>
                                    <p className="text-[9px] text-slate-405 mt-0.5">Giá RSP niêm yết: <span className="line-through">{formatVND(v.rsp)}</span></p>
                                  </div>

                                  {/* Warehouses details */}
                                  {stockRecords && stockRecords.length > 0 && (
                                    <div className="shrink-0 bg-slate-50 border border-slate-150 p-2 text-center rounded-xl flex flex-col items-center justify-center min-w-[130px]">
                                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400">Tồn kho thực tế</span>
                                      <span className={`font-mono text-xs font-black mt-0.5 ${totalStock > 0 ? 'text-teal-600' : 'text-slate-400 line-through'}`}>
                                        {totalStock} chiếc
                                      </span>
                                      <span className="text-[7.5px] text-slate-400 font-bold mt-0.5 leading-none">
                                        Nam: {southStock} | Bắc: {northStock}
                                      </span>
                                    </div>
                                  )}

                                  {/* Cost and CTA Button */}
                                  <div className="shrink-0 flex items-center md:flex-col justify-between md:justify-center gap-3.5 text-right">
                                    <div>
                                      <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block">COST VỐN COGS</span>
                                      <span className="font-mono text-xs font-black text-rose-600 block mt-0.5">{formatVND(v.cogs)}</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isOutOfStock) return;
                                        selectGift(v);
                                      }}
                                      className={`cursor-pointer text-[10px] uppercase font-black tracking-wider px-3.5 py-2 rounded-xl border transition shadow-4xs shrink-0 ${
                                        alreadyGift
                                          ? 'bg-indigo-650 hover:bg-indigo-750 text-white border-indigo-700'
                                          : isOutOfStock
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : 'bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {alreadyGift ? 'Cộng tiếp quà' : isOutOfStock ? 'Hết tồn kho' : 'Thêm quà'}
                                    </button>
                                  </div>

                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* Bottom Confirmation Bar */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 font-sans">
                <div className="text-xs text-slate-500 font-medium">
                  • Tổng số quà đã chọn: <strong className="text-slate-850 font-black">{totalGiftsQuantity} dòng sản phẩm</strong>
                  <span className="mx-2 font-light">|</span>
                  • Tổng giá trị COGS áp dụng: <strong className="text-rose-600 font-black font-mono text-sm">{formatVND(totalGiftsCogs)}</strong>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setEditingVariant(null);
                    setGiftSearchTerm('');
                  }}
                  className="cursor-pointer text-[11px] bg-indigo-650 hover:bg-indigo-750 text-white font-black px-6 py-3 rounded-2xl shadow-md uppercase tracking-wider flex items-center gap-1.5 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Gift size={13} className="stroke-[2]" />
                  <span>Hoàn thành & Lưu so sánh ➔</span>
                </button>
              </div>

            </div>
          </div>,
          document.body
        );
      })()}

    </div>
  );
}
