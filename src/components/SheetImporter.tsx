import React, { useState, useMemo } from 'react';
import { MainProduct, CogsProduct, StockRecord } from '../types';
import { 
  Clipboard, Table, FileSpreadsheet, AlertCircle, CheckCircle, 
  Settings, HelpCircle, Info, TrendingUp, Coins, ArrowRight, 
  CornerDownRight, Sparkles, RotateCcw, Download, Eye, Layers, ChevronRight,
  Plus
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

  // Helper to format currency
  const formatVND = (v: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(Math.round(v))
      .replace('₫', 'đ');
  };

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
                            <div className="flex flex-col">
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
                              <div className="flex items-center gap-1.5">
                                <CornerDownRight size={12} className="text-indigo-400 shrink-0" />
                                <div className="min-w-0">
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
                                    <div className="space-y-0.5">
                                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-wider block">Danh quà quy hoạch:</span>
                                      {customVar.gifts.map((g, gi) => (
                                        <div key={gi} className="flex items-center gap-1">
                                          <span className="text-amber-500">🎁</span>
                                          <span className="text-slate-705">{g.productName}</span>
                                          <span className="text-slate-450 font-mono text-[9px]">(SL: {g.quantity} - Cost: {formatVND(g.giftCogs)})</span>
                                        </div>
                                      ))}
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
                <div className="bg-indigo-50/20 border border-indigo-100/50 p-3 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Đang kiểm duyệt</span>
                    {activeGroupItem.campaignType && (
                      <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                        Chiến dịch: {activeGroupItem.campaignType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-extrabold text-slate-800 mt-1">{activeGroupItem.productName}</p>
                  <p className="text-[10px] text-slate-405 font-mono mt-0.5 font-bold">Cổng giá bán ròng: {formatVND(activeGroupItem.lowestPrice)}</p>
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

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-705">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-slide-up flex flex-col max-h-[85vh] text-left">
              
              {/* Header */}
              <div className="px-5 py-4 bg-amber-500/10 border-b border-amber-500/20 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles size={14} className="text-amber-600 shrink-0" />
                    Cấu hình biến thể so sánh
                  </h3>
                  <p className="text-[10px] text-amber-800/80 font-bold font-sans mt-0.5 leading-snug truncate max-w-[280px]">
                    Sản phẩm: {item.productName}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingVariant(null);
                    setGiftSearchTerm('');
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-black p-1 bg-white/50 rounded-lg hover:bg-slate-100 transition whitespace-nowrap"
                  title="Đóng cấu hình"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Label of choice */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Tên nhãn phương án so sánh</label>
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
                    className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 transition"
                    placeholder="e.g. Điều chỉnh giá và quà"
                  />
                </div>

                {/* Pricing Config */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Giá bán trả thương lượng (VND)</label>
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
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono font-black text-slate-800 transition"
                      placeholder="Ví dụ: 1150000"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] uppercase font-black text-slate-400 font-mono">đ</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold italic">
                    * Giá bán hiện tại gốc trên Sheet: {formatVND(item.lowestPrice)}
                  </p>
                </div>

                {/* Gifts Configuration */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Cấu hình quà tặng mới</label>
                  
                  {/* List of current gifts */}
                  <div className="space-y-1.5">
                    {variant.gifts.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] italic font-semibold">
                        Không áp dụng quà nào trong phương án này
                      </div>
                    ) : (
                      variant.gifts.map((g, gi) => (
                        <div key={gi} className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-2 rounded-xl text-xs font-semibold relative leading-snug">
                          <span className="text-amber-500 text-xs shrink-0 select-none">🎁</span>
                          <div className="flex-1 min-w-0 pr-12">
                            <p className="text-slate-800 font-bold truncate text-[11px]">{g.productName}</p>
                            <p className="text-[8.5px] text-indigo-600 font-extrabold font-mono mt-0.5 truncate">
                              SKU: {g.vpCode} | Capital: {formatVND(g.giftCogs)}
                            </p>
                          </div>

                          {/* Quantity Selector & Direct COGS Override */}
                          <div className="flex items-center gap-1 select-none text-[10px] shrink-0">
                            <span className="text-[8px] uppercase font-bold text-slate-400">SL:</span>
                            <input 
                              type="number"
                              min="1"
                              value={g.quantity}
                              onChange={(e) => {
                                const newQty = Math.max(1, Number(e.target.value) || 1);
                                setCustomVariants(prev => {
                                  const list = [...(prev[itemId] || [])];
                                  const varGifts = [...list[variantIndex].gifts];
                                  varGifts[gi] = { ...varGifts[gi], quantity: newQty };
                                  list[variantIndex] = { ...list[variantIndex], gifts: varGifts };
                                  return { ...prev, [itemId]: list };
                                });
                              }}
                              className="w-10 bg-white border border-slate-250 rounded px-1 py-0.5 text-center font-bold font-mono text-[10px]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCustomVariants(prev => {
                                const list = [...(prev[itemId] || [])];
                                const varGifts = list[variantIndex].gifts.filter((_, idx) => idx !== gi);
                                list[variantIndex] = { ...list[variantIndex], gifts: varGifts };
                                return { ...prev, [itemId]: list };
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-md transition cursor-pointer text-[10px]"
                            title="Xóa quà này"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Selector helper for custom gifts search */}
                  <div className="space-y-1.5 pt-1.5">
                    <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Tìm kiếm quà từ Danh lục giá vốn:</span>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={giftSearchTerm}
                        onChange={(e) => setGiftSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden transition"
                        placeholder="Gõ tên SKU phân loại hoặc Tên hàng..."
                      />
                      
                      {/* Search Result Drops */}
                      {giftSearchTerm.trim().length > 1 && (() => {
                        const query = giftSearchTerm.toLowerCase();
                        const matches = (cogsProducts || []).filter(p => 
                          p.name.toLowerCase().includes(query) || 
                          p.skuPhanLoai.toLowerCase().includes(query)
                        ).slice(0, 5);

                        if (matches.length === 0) return null;

                        return (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-60 overflow-hidden divide-y divide-slate-50 max-h-[160px] overflow-y-auto">
                            {matches.map((p, pi) => (
                              <div 
                                key={pi}
                                onClick={() => {
                                  // Check if already exist
                                  const existIdx = variant.gifts.findIndex(g => g.vpCode === p.skuPhanLoai);
                                  setCustomVariants(prev => {
                                    const list = [...(prev[itemId] || [])];
                                    const varGifts = [...list[variantIndex].gifts];
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
                                    list[variantIndex] = { ...list[variantIndex], gifts: varGifts };
                                    return { ...prev, [itemId]: list };
                                  });
                                  setGiftSearchTerm('');
                                }}
                                className="px-3 py-2 text-[10.5px] font-semibold text-slate-700 hover:bg-amber-50 cursor-pointer transition flex justify-between items-center gap-1.5 text-left"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-slate-850 font-bold">{p.name}</span>
                                  <span className="block text-[8px] text-slate-400 font-mono">SKU: {p.skuPhanLoai}</span>
                                </div>
                                <span className="text-[9px] text-cyan-600 font-mono font-bold shrink-0">{formatVND(p.cogs)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>

              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setEditingVariant(null);
                    setGiftSearchTerm('');
                  }}
                  className="cursor-pointer text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl transition shadow-3xs uppercase tracking-wider"
                >
                  Xác nhận & Lưu cấu hình
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
