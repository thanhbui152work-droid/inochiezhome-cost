import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MainProduct, CogsProduct, StockRecord, ShopVoucher } from '../types';
import { 
  Calculator, Settings, Gift, HelpCircle, Info, CheckCircle, 
  PlusCircle, Trash2, ArrowRightLeft, DollarSign, Percent, AlertCircle, Sparkles, Download, Plus,
  ListFilter
} from 'lucide-react';

interface PricingCalculatorProps {
  shopeeProducts: MainProduct[];
  tiktokProducts: MainProduct[];
  cogsProducts: CogsProduct[];
  stockRecords?: StockRecord[];
  shopVouchers?: ShopVoucher[];
}

interface FeeItem {
  type: 'percent' | 'value';
  val: number;
}

interface SelectedGiftItem {
  product: CogsProduct;
  quantity: number;
}

interface SimulatedLine {
  id: string;
  product: MainProduct;
  selectedPriceType: 'rsp' | 'minPrice' | 'kolPrice' | 'spike' | 'miniSpike' | 'bau' | 'custom';
  customPrice: number;
  userVoucherPct: number;
  userVoucherType: 'percent' | 'value';
  userVoucherVal: number;
  selectedGift: CogsProduct | null;
  selectedGifts: SelectedGiftItem[];
  voucherMode?: 'auto' | 'manual' | 'custom' | 'none';
  selectedVoucherId?: string;
}

export default function PricingCalculator({ shopeeProducts, tiktokProducts, cogsProducts, stockRecords, shopVouchers: propsShopVouchers }: PricingCalculatorProps) {
  const [activePlatform, setActivePlatform] = useState<'shopee' | 'tiktok'>('shopee');

  const activeProducts = useMemo(() => {
    return shopeeProducts;
  }, [shopeeProducts]);

  // Simulator fee settings states (separate for Shopee and Tiktok)
  const [shopeeFeeConfigs, setShopeeFeeConfigs] = useState({
    fixedFee: { type: 'percent', val: 17 } as FeeItem,
    infraFee: { type: 'value', val: 3000 } as FeeItem,
    paymentFee: { type: 'percent', val: 6.0 } as FeeItem,
    voucherXtra: { type: 'percent', val: 5.0 } as FeeItem,
    voucherXtraCap: 50000,
    cfFee: { type: 'percent', val: 0.0 } as FeeItem,
    commission: { type: 'percent', val: 15.0 } as FeeItem,
    ffmFee: { type: 'percent', val: 5.0 } as FeeItem,
    returnFee: { type: 'percent', val: 1.0 } as FeeItem,
    platformVoucher: { type: 'percent', val: 20.0 } as FeeItem,
    platformVoucherCap: 150005,
    giftQuota: { type: 'percent', val: 8.0 } as FeeItem
  });

  const [tiktokFeeConfigs, setTiktokFeeConfigs] = useState({
    fixedFee: { type: 'percent', val: 14.7 } as FeeItem,
    infraFee: { type: 'value', val: 3000 } as FeeItem,
    paymentFee: { type: 'percent', val: 5.0 } as FeeItem,
    voucherXtra: { type: 'percent', val: 3.0 } as FeeItem,
    voucherXtraCap: 0,
    cfFee: { type: 'percent', val: 10.0 } as FeeItem,
    commission: { type: 'percent', val: 15.0 } as FeeItem,
    ffmFee: { type: 'percent', val: 5.0 } as FeeItem,
    returnFee: { type: 'percent', val: 0.0 } as FeeItem,
    platformVoucher: { type: 'percent', val: 20.0 } as FeeItem,
    platformVoucherCap: 0,
    giftQuota: { type: 'percent', val: 8.0 } as FeeItem
  });

  const [shopeeSimulatedLines, setShopeeSimulatedLines] = useState<SimulatedLine[]>([
    {
      id: 'shopee-initial',
      product: shopeeProducts[0] || {
        barcode: "", vpCode: "HNK.NCKD.AK40DNS", name: "Nồi chiên không dầu 4L",
        rsp: 1700000, cogs: 448000, cogsUpdated: 475000, pool: 1225000,
        minPrice: 950000, kolPrice: 1100000, spike: 1200000, miniSpike: 1300000, bau: 1500000
      },
      selectedPriceType: 'minPrice',
      customPrice: 950000,
      userVoucherPct: 0,
      userVoucherType: 'percent',
      userVoucherVal: 0,
      selectedGift: null,
      selectedGifts: [],
      voucherMode: 'auto',
      selectedVoucherId: ''
    }
  ]);

  const [tiktokSimulatedLines, setTiktokSimulatedLines] = useState<SimulatedLine[]>([
    {
      id: 'tiktok-initial',
      product: shopeeProducts[0] || {
        barcode: "", vpCode: "HNK.NCKD.AK40DNS", name: "Nồi chiên không dầu 4L",
        rsp: 1700000, cogs: 448000, cogsUpdated: 475000, pool: 1225000,
        minPrice: 950000, kolPrice: 1100000, spike: 1200000, miniSpike: 1300000, bau: 1500000
      },
      selectedPriceType: 'minPrice',
      customPrice: 950000,
      userVoucherPct: 0,
      userVoucherType: 'percent',
      userVoucherVal: 0,
      selectedGift: null,
      selectedGifts: [],
      voucherMode: 'auto',
      selectedVoucherId: ''
    }
  ]);

  const [shopeeActiveLineId, setShopeeActiveLineId] = useState<string>('shopee-initial');
  const [tiktokActiveLineId, setTiktokActiveLineId] = useState<string>('tiktok-initial');

  const activeLineId = activePlatform === 'shopee' ? shopeeActiveLineId : tiktokActiveLineId;
  const setActiveLineId = (val: string) => {
    if (activePlatform === 'shopee') {
      setShopeeActiveLineId(val);
    } else {
      setTiktokActiveLineId(val);
    }
  };

  const feeConfigs = activePlatform === 'shopee' ? shopeeFeeConfigs : tiktokFeeConfigs;
  const setFeeConfigs = (update: any) => {
    if (activePlatform === 'shopee') {
      setShopeeFeeConfigs(prev => typeof update === 'function' ? update(prev) : update);
    } else {
      setTiktokFeeConfigs(prev => typeof update === 'function' ? update(prev) : update);
    }
  };

  const simulatedLines = activePlatform === 'shopee' ? shopeeSimulatedLines : tiktokSimulatedLines;
  const setSimulatedLines = (update: any) => {
    if (activePlatform === 'shopee') {
      setShopeeSimulatedLines(prev => typeof update === 'function' ? update(prev) : update);
    } else {
      setTiktokSimulatedLines(prev => typeof update === 'function' ? update(prev) : update);
    }
  };

  // Sync state first row with sheet data when loaded
  React.useEffect(() => {
    if (shopeeProducts.length > 0 && shopeeSimulatedLines.length === 1 && shopeeSimulatedLines[0].id === 'shopee-initial' && shopeeSimulatedLines[0].product.name === "Nồi chiên không dầu 4L" && shopeeSimulatedLines[0].product.rsp === 1700000) {
      setShopeeSimulatedLines([
        {
          id: 'shopee-initial',
          product: shopeeProducts[0],
          selectedPriceType: 'minPrice',
          customPrice: shopeeProducts[0].minPrice || 0,
          userVoucherPct: 0,
          userVoucherType: 'percent',
          userVoucherVal: 0,
          selectedGift: null,
          selectedGifts: [],
          voucherMode: 'auto',
          selectedVoucherId: ''
        }
      ]);
    }
  }, [shopeeProducts]);

  React.useEffect(() => {
    if (shopeeProducts.length > 0 && tiktokSimulatedLines.length === 1 && tiktokSimulatedLines[0].id === 'tiktok-initial' && tiktokSimulatedLines[0].product.name === "Nồi chiên không dầu 4L") {
      setTiktokSimulatedLines([
        {
          id: 'tiktok-initial',
          product: shopeeProducts[0],
          selectedPriceType: 'minPrice',
          customPrice: shopeeProducts[0].minPrice || 0,
          userVoucherPct: 0,
          userVoucherType: 'percent',
          userVoucherVal: 0,
          selectedGift: null,
          selectedGifts: [],
          voucherMode: 'auto',
          selectedVoucherId: ''
        }
      ]);
    }
  }, [shopeeProducts]);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState<boolean>(false);
  const [giftSearchTerm, setGiftSearchTerm] = useState<string>('');
  const [giftBudgetFilter, setGiftBudgetFilter] = useState<'all' | 'suitable' | 'exceeded'>('all');
  const [selectedGiftGroupSku, setSelectedGiftGroupSku] = useState<string | null>(null);

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        const canScrollLeft = container.scrollLeft > 0;
        const canScrollRight = container.scrollLeft < (container.scrollWidth - container.clientWidth - 1);
        if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Shop vouchers managed state (min spend condition & cap reduction & priorities order)
  const [shopVouchers, setShopVouchers] = useState<ShopVoucher[]>(() => {
    if (propsShopVouchers && propsShopVouchers.length > 0) {
      return propsShopVouchers;
    }
    return [
      { id: 'sv-1', code: 'VC 15K, MBS 199K', type: 'percent', val: 5, minSpent: 199000, capVal: 15000, priority: 1, active: true },
      { id: 'sv-2', code: 'VC 40K, MBS 399K', type: 'percent', val: 7, minSpent: 399000, capVal: 40000, priority: 2, active: true },
      { id: 'sv-3', code: 'VC 55K, MBS 599K', type: 'percent', val: 7, minSpent: 599000, capVal: 55000, priority: 3, active: true },
      { id: 'sv-4', code: 'VC 100K, MBS 999K', type: 'percent', val: 7, minSpent: 999000, capVal: 100000, priority: 4, active: true },
    ];
  });

  useEffect(() => {
    if (propsShopVouchers && propsShopVouchers.length > 0) {
      setShopVouchers(propsShopVouchers);
    }
  }, [propsShopVouchers]);

  const addShopVoucher = () => {
    const nextPriority = shopVouchers.length > 0 ? Math.max(...shopVouchers.map(v => v.priority)) + 1 : 1;
    const newVoucher: ShopVoucher = {
      id: `sv-${Date.now()}`,
      code: `INOCHI_CODE${shopVouchers.length + 1}`,
      type: 'percent',
      val: 10,
      minSpent: 500000,
      capVal: 50000,
      priority: nextPriority,
      active: true
    };
    setShopVouchers([...shopVouchers, newVoucher]);
  };

  const updateShopVoucher = (id: string, updatedFields: Partial<ShopVoucher>) => {
    setShopVouchers(prev => prev.map(v => v.id === id ? { ...v, ...updatedFields } : v));
  };

  const deleteShopVoucher = (id: string) => {
    setShopVouchers(prev => prev.filter(v => v.id !== id));
  };

  // Grouped gifts for display in the matching gifts picker
  const inochiGifts = useMemo(() => {
    return cogsProducts.filter(p => {
      // Exclude main appliances to focus on actual gift items
      const isAppliance = p.name.includes("Nồi chiên") || p.name.includes("Cơm điện") || p.name.includes("Máy rửa rau");
      return !isAppliance && p.cogs > 0;
    });
  }, [cogsProducts]);

  // Active simulated line
  const activeLine = useMemo(() => {
    return simulatedLines.find(l => l.id === activeLineId) || simulatedLines[0];
  }, [simulatedLines, activeLineId]);

  // Selectable prices list for manual overrides
  const selectedProductPrices = useMemo(() => {
    if (!activeLine) return [];
    const p = activeLine.product;
    return [
      { type: 'minPrice', label: 'MIN PRICE', val: p.minPrice },
      { type: 'kolPrice', label: 'KOL PRICE', val: p.kolPrice },
      { type: 'spike', label: 'SPIKE PRICE', val: p.spike },
      { type: 'miniSpike', label: 'MINI SPIKE', val: p.miniSpike },
      { type: 'bau', label: 'BAU PRICE', val: p.bau },
      { type: 'rsp', label: 'RSP (Niêm yết)', val: p.rsp }
    ];
  }, [activeLine]);

  // Currency utility formatting
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Resolve image for MainProduct
  const getProductImage = (mainProd: MainProduct) => {
    // 0. Prioritize image link if parsed directly from Google Sheets (Column A)
    if (mainProd.img && mainProd.img.trim() !== "" && !mainProd.img.includes("placeholder")) {
      return mainProd.img;
    }
    // 1. Try to find a direct match in cogsProducts by barcode or mainSku
    const match = cogsProducts.find(c => 
      c.skuPhanLoai === mainProd.vpCode || 
      c.mainSku === mainProd.name || 
      c.barcode === mainProd.barcode
    );
    if (match && match.img && match.img !== "" && !match.img.includes("placeholder")) {
      return match.img;
    }
    // 2. Fallbacks based on strings in the name or code
    const key = mainProd.vpCode.toUpperCase();
    if (key.includes("NCKD") || key.includes("AK40")) return "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400";
    if (key.includes("OCOD") || key.includes("NCCT")) return "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=400";
    if (key.includes("CRCD") || key.includes("OS")) return "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400";
    if (key.includes("BIGR") || key.includes("BIKG")) return "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400";
    if (key.includes("NOICOM") || key.includes("NOI_COM")) return "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=500";
    if (key.includes("MAYRUA") || key.includes("MAY_RUA")) return "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=500";
    
    return "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500";
  };

  // Safe percentage helper
  const cleanPct = (val: string) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
  };

  // Safe integer helper
  const cleanInt = (val: string) => {
    const num = parseInt(val.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  // Helper to compute a fee value which can be either a percentage of base price or a flat value
  const calculateValue = (feeItem: FeeItem | number | undefined, basePriceVal: number, capAmt?: number) => {
    if (feeItem === undefined || feeItem === null) return 0;
    if (typeof feeItem === 'number') {
      return feeItem;
    }
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

  // Helper to format a fee label for headers or display labels
  const formatFeeConfigLabel = (feeItem: FeeItem) => {
    if (feeItem.type === 'percent') {
      return `${feeItem.val}%`;
    }
    return formatVND(feeItem.val);
  };

  // Calculate full list of 19 spreadsheet metrics for each line
  const calculatedLines = useMemo(() => {
    return simulatedLines.map(line => {
      const p = line.product;
      
      // 1. RSP
      const rsp = p.rsp;
      // 2. COGS
      const cogs = p.cogs;
      // 3. COGS updated
      const cogsUpdated = p.cogsUpdated || cogs;
      // 4. pool = RSP - COGS updated
      const pool = rsp - cogsUpdated;
      // 5. Selected Selling Price
      let basePrice = 0;
      if (line.selectedPriceType === 'custom') {
        basePrice = line.customPrice;
      } else {
        const matchingPrice = selectedProductPrices.find(pr => pr.type === line.selectedPriceType);
        basePrice = matchingPrice ? matchingPrice.val : p.minPrice;
      }

      // 6. Voucher Shop evaluation based on prioritized list or manual overridden/custom entries
      const vMode = line.voucherMode || 'auto';
      let shopVoucher = 0;
      let appliedVoucherCode = "";
      let appliedVoucherId = "";

      if (vMode === 'auto') {
        const eligibleVouchers = activePlatform === 'tiktok'
          ? []
          : shopVouchers
              .filter(v => v.active && basePrice >= v.minSpent)
              .sort((a, b) => b.priority - a.priority); // Highest priority first
        
        if (eligibleVouchers.length > 0) {
          const mainVoucher = eligibleVouchers[0];
          appliedVoucherCode = mainVoucher.code;
          appliedVoucherId = mainVoucher.id;
          if (mainVoucher.type === 'percent') {
            const rawDiscount = basePrice * (mainVoucher.val / 100);
            shopVoucher = mainVoucher.capVal > 0 ? Math.min(rawDiscount, mainVoucher.capVal) : rawDiscount;
          } else {
            shopVoucher = mainVoucher.val;
          }
        }
      } else if (vMode === 'manual' && line.selectedVoucherId) {
        const selectedV = shopVouchers.find(v => v.id === line.selectedVoucherId);
        if (selectedV && basePrice >= selectedV.minSpent) {
          appliedVoucherCode = selectedV.code;
          appliedVoucherId = selectedV.id;
          if (selectedV.type === 'percent') {
            const rawDiscount = basePrice * (selectedV.val / 100);
            shopVoucher = selectedV.capVal > 0 ? Math.min(rawDiscount, selectedV.capVal) : rawDiscount;
          } else {
            shopVoucher = selectedV.val;
          }
        }
      } else if (vMode === 'custom') {
        const vType = line.userVoucherType || 'percent';
        const vVal = line.userVoucherVal !== undefined ? line.userVoucherVal : (line.userVoucherPct || 0);
        shopVoucher = vType === 'percent' ? basePrice * (vVal / 100) : vVal;
        appliedVoucherCode = "Mã tùy chỉnh";
      }

      // 7. Dynamic Gift Quota Limit (8% of selling price or custom config)
      const giftAllowance = calculateValue(feeConfigs.giftQuota, basePrice);

      // Actual gift cost if selected (sum of COGS * quantity)
      const actualGiftCogs = line.selectedGifts && line.selectedGifts.length > 0 
        ? line.selectedGifts.reduce((acc, item) => acc + (item.product.cogs * item.quantity), 0)
        : 0;

      // 15. Platform Voucher (subsidy) capped - CALCULATED STRICTLY ONCE SHOP VOUCHERS SUBTRACTED FIRST
      const platformBasePrice = Math.max(0, basePrice - shopVoucher);
      const platformVoucherCost = calculateValue(feeConfigs.platformVoucher, platformBasePrice, feeConfigs.platformVoucherCap);

      // 8. Fixed platform taxes / Phí cố định % of selling price
      const fixedFee = calculateValue(feeConfigs.fixedFee, basePrice);

      // 9. Flat Infrastructure / operation fee
      const infraFee = calculateValue(feeConfigs.infraFee, basePrice);

      // 10. Payment gateway fee %
      const paymentFee = calculateValue(feeConfigs.paymentFee, basePrice);

      // 11. Voucher X-tra capped
      const voucherXtra = calculateValue(feeConfigs.voucherXtra, basePrice, feeConfigs.voucherXtraCap);

      // 12. Sàn Commission
      // For TikTok Shop, commission is calculated over the price customer pays after all vouchers (vouchers shop and voucher sàn)
      const commissionBase = activePlatform === 'tiktok' ? Math.max(0, basePrice - shopVoucher - platformVoucherCost) : basePrice;
      const commission = calculateValue(feeConfigs.commission, commissionBase);

      // CF fee (Only computed for TikTok)
      const cfFee = activePlatform === 'tiktok' ? calculateValue(feeConfigs.cfFee, basePrice) : 0;

      // 13. Fulfillment by Merchant / cost (FFM)
      const ffmFee = calculateValue(feeConfigs.ffmFee, basePrice);

      // 14. Customer returns and damages fee
      const returnFee = activePlatform === 'tiktok' ? 0 : calculateValue(feeConfigs.returnFee, basePrice);

      // 16. Total Platform and operating fees (excluding Gift)
      const totalFees = activePlatform === 'tiktok'
        ? fixedFee + paymentFee + infraFee + voucherXtra + cfFee + commission + ffmFee
        : fixedFee + infraFee + paymentFee + voucherXtra + commission + ffmFee + returnFee;

      // 17. GM, %GM, Net Sale, %NM formulas based on platform
      let gm = 0;
      let percentageGM = 0;
      let netSale = 0;
      let percentageNM = 0;
      let customerBuyPrice = 0;
      let netPool = 0;
      let netProfit = 0;

      if (activePlatform === 'tiktok') {
        // TikTok matching screenshot formula:
        gm = basePrice - cogsUpdated - actualGiftCogs;
        percentageGM = basePrice > 0 ? (gm / basePrice) * 100 : 0;
        netSale = gm - totalFees;
        percentageNM = gm !== 0 ? (netSale / gm) * 100 : 0;
        customerBuyPrice = basePrice - shopVoucher - platformVoucherCost;
        netPool = basePrice - shopVoucher - totalFees - actualGiftCogs;
        netProfit = netSale; // since Net Sale is netProfit
      } else {
        // Shopee Standard formula:
        customerBuyPrice = basePrice - shopVoucher - platformVoucherCost;
        netPool = basePrice - shopVoucher - totalFees - actualGiftCogs;
        netProfit = netPool - cogsUpdated;
        percentageGM = basePrice > 0 ? ((basePrice - shopVoucher - actualGiftCogs - cogsUpdated) / basePrice) * 105 : 0; // wait, let's keep it clean
        percentageGM = basePrice > 0 ? ((basePrice - shopVoucher - actualGiftCogs - cogsUpdated) / basePrice) * 100 : 0;
        percentageNM = netPool !== 0 ? ((netPool - cogsUpdated) / netPool) * 100 : 0;
        gm = basePrice - shopVoucher - actualGiftCogs;
        netSale = netProfit;
      }

      // Gift threshold gap evaluation
      const giftCogsLimit = calculateValue(feeConfigs.giftQuota, basePrice);
      const isGiftUnsuitable = actualGiftCogs > giftCogsLimit;
      const giftCogsGap = isGiftUnsuitable ? (actualGiftCogs - giftCogsLimit) : 0;

      return {
        lineId: line.id,
        productName: p.name,
        vpCode: p.vpCode,
        selectedPriceType: line.selectedPriceType,
        basePrice,
        rsp,
        cogs,
        cogsUpdated,
        pool,
        shopVoucher,
        giftAllowance,
        actualGiftCogs,
        fixedFee,
        infraFee,
        paymentFee,
        voucherXtra,
        commission,
        cfFee,
        ffmFee,
        returnFee,
        platformVoucherCost,
        netPool,
        customerBuyPrice,
        percentageGM,
        percentageNM,
        netProfit,
        isGiftUnsuitable,
        giftCogsGap,
        selectedGift: line.selectedGifts && line.selectedGifts[0] ? line.selectedGifts[0].product : null,
        selectedGifts: line.selectedGifts || [],
        userVoucherType: line.userVoucherType || 'percent',
        userVoucherVal: line.userVoucherVal !== undefined ? line.userVoucherVal : 0,
        userVoucherPct: line.userVoucherPct !== undefined ? line.userVoucherPct : 0,
        voucherMode: line.voucherMode || 'auto',
        selectedVoucherId: line.selectedVoucherId || '',
        appliedVoucherCode: appliedVoucherCode || '',
        appliedVoucherId: appliedVoucherId || ''
      };
    });
  }, [simulatedLines, feeConfigs, selectedProductPrices, shopVouchers, activePlatform]);

  // Active line calculation metrics
  const activeLineMetrics = useMemo(() => {
    return calculatedLines.find(l => l.lineId === activeLineId) || calculatedLines[0];
  }, [calculatedLines, activeLineId]);

  // Available gifts matching "approx 8% of selling price" suitable criteria
  const eligibleGifts = useMemo(() => {
    if (!activeLineMetrics) return [];
    const limitBudget = calculateValue(feeConfigs.giftQuota, activeLineMetrics.basePrice);
    return inochiGifts.filter(g => g.cogs <= limitBudget);
  }, [inochiGifts, activeLineMetrics, feeConfigs.giftQuota]);

  // Grouped and filtered gifts for display in the matching gifts picker
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

    const budgetLimit = activeLineMetrics 
      ? calculateValue(feeConfigs.giftQuota, activeLineMetrics.basePrice) 
      : 0;

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
      return {
        mainSku,
        img,
        category,
        variants: filteredVariants
      };
    }).filter(item => item.variants.length > 0);

    // 3. Filter by search term if active
    if (!giftSearchTerm.trim()) return mapped;

    const rawTerm = giftSearchTerm.trim();
    let isMultiSearch = false;
    let tokens: string[] = [];

    if (rawTerm.includes(',') || rawTerm.includes(';') || rawTerm.includes('\n') || rawTerm.includes('\t')) {
      isMultiSearch = true;
      tokens = rawTerm.split(/[,;\n\t\r]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
    } else {
      // If delimited by spaces, check if it looks like a list of SKUs/Codes
      const words = rawTerm.split(/\s+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      if (words.length > 1) {
        // If at least one word looks like a code (contains dot, number, or length >= 5)
        const hasCodeSpec = words.some(w => w.includes('.') || w.match(/\d/) || w.length >= 5);
        if (hasCodeSpec) {
          isMultiSearch = true;
          tokens = words;
        }
      }
    }

    if (isMultiSearch && tokens.length > 0) {
      return mapped.filter(item => {
        return tokens.some(tok => {
          const matchMain = item.mainSku.toLowerCase().includes(tok) || item.category.toLowerCase().includes(tok);
          const matchVariant = item.variants.some(v => 
            v.name.toLowerCase().includes(tok) || 
            v.skuPhanLoai.toLowerCase().includes(tok)
          );
          return matchMain || matchVariant;
        });
      });
    } else {
      const query = rawTerm.toLowerCase();
      return mapped.filter(item => {
        const matchMain = item.mainSku.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
        const matchVariant = item.variants.some(v => 
          v.name.toLowerCase().includes(query) || 
          v.skuPhanLoai.toLowerCase().includes(query)
        );
        return matchMain || matchVariant;
      });
    }
  }, [inochiGifts, giftSearchTerm, giftBudgetFilter, activeLineMetrics, feeConfigs.giftQuota]);

  const currentGroup = useMemo(() => {
    if (filteredGroupedGifts.length === 0) return null;
    const found = filteredGroupedGifts.find(g => g.mainSku === selectedGiftGroupSku);
    return found || filteredGroupedGifts[0];
  }, [filteredGroupedGifts, selectedGiftGroupSku]);

  React.useEffect(() => {
    if (giftPickerOpen && filteredGroupedGifts.length > 0) {
      const exists = filteredGroupedGifts.some(g => g.mainSku === selectedGiftGroupSku);
      if (!exists || !selectedGiftGroupSku) {
        setSelectedGiftGroupSku(filteredGroupedGifts[0]?.mainSku || null);
      }
    }
  }, [giftPickerOpen, filteredGroupedGifts, selectedGiftGroupSku]);

  React.useEffect(() => {
    if (giftPickerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [giftPickerOpen]);

  // Handle product selected changes
  const handleProductChange = (prodVpCode: string) => {
    const prod = activeProducts.find(p => p.vpCode === prodVpCode);
    if (!prod) return;

    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        return {
          ...l,
          product: prod,
          customPrice: prod.minPrice,
          selectedPriceType: 'minPrice',
          selectedGift: null,
          selectedGifts: []
        };
      }
      return l;
    }));
  };

  // Handle selected price preset modification
  const handlePriceTypeChange = (type: any) => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        const val = type === 'custom' ? l.customPrice : (l.product[type as keyof MainProduct] as number || l.product.minPrice);
        return {
          ...l,
          selectedPriceType: type,
          customPrice: val
        };
      }
      return l;
    }));
  };

  // Handle manual pricing overrides input box
  const handleCustomPriceChange = (val: number) => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        return { ...l, customPrice: val };
      }
      return l;
    }));
  };

  // Handle Voucher percentage & value type adjustments
  const handleVoucherTypeChange = (type: 'percent' | 'value') => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        return {
          ...l,
          userVoucherType: type,
          userVoucherVal: 0,
          userVoucherPct: 0
        };
      }
      return l;
    }));
  };

  const handleVoucherValChange = (val: number) => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        const type = l.userVoucherType || 'percent';
        const finalVal = type === 'percent' ? Math.min(100, val) : val;
        return {
          ...l,
          userVoucherType: type,
          userVoucherVal: finalVal,
          userVoucherPct: type === 'percent' ? finalVal : 0
        };
      }
      return l;
    }));
  };

  // Single gift selector mapping (clearing or fast pairing)
  const handleSelectGift = (gift: CogsProduct | null) => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        if (gift === null) {
          return { ...l, selectedGift: null, selectedGifts: [] };
        } else {
          return { ...l, selectedGift: gift, selectedGifts: [{ product: gift, quantity: 1 }] };
        }
      }
      return l;
    }));
    setGiftPickerOpen(false);
  };

  // Multi-gift quantity updates
  const handleToggleOrUpdateGift = (gift: CogsProduct, increment: number) => {
    setSimulatedLines(lines => lines.map(l => {
      if (l.id === activeLineId) {
        const currentGifts = l.selectedGifts || [];
        const existingIdx = currentGifts.findIndex(item => item.product.skuPhanLoai === gift.skuPhanLoai);
        
        let updatedGifts = [...currentGifts];
        if (existingIdx > -1) {
          const newQty = updatedGifts[existingIdx].quantity + increment;
          if (newQty <= 0) {
            updatedGifts.splice(existingIdx, 1);
          } else {
            updatedGifts[existingIdx] = {
              ...updatedGifts[existingIdx],
              quantity: newQty
            };
          }
        } else if (increment > 0) {
          updatedGifts.push({ product: gift, quantity: increment });
        }
        
        return {
          ...l,
          selectedGifts: updatedGifts,
          selectedGift: updatedGifts[0]?.product || null
        };
      }
      return l;
    }));
  };

  // Add another product simulation row to comparison dashboard list
  const handleAddProductRow = () => {
    const defaultProduct = activeProducts[0] || {
      barcode: "", vpCode: "Mới", name: "Chọn sản phẩm",
      rsp: 0, cogs: 0, cogsUpdated: 0, pool: 0,
      minPrice: 0, kolPrice: 0, spike: 0, miniSpike: 0, bau: 0
    };
    const newId = `row-${Date.now()}`;
    setSimulatedLines([
      ...simulatedLines,
      {
        id: newId,
        product: defaultProduct,
        selectedPriceType: 'minPrice',
        customPrice: defaultProduct.minPrice,
        userVoucherPct: 0,
        userVoucherType: 'percent',
        userVoucherVal: 0,
        selectedGift: null,
        selectedGifts: []
      }
    ]);
    setActiveLineId(newId);
  };

  // Delete product simulation row from comparison grid list
  const handleDeleteRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (simulatedLines.length <= 1) return;
    const remaining = simulatedLines.filter(l => l.id !== id);
    setSimulatedLines(remaining);
    if (activeLineId === id) {
      setActiveLineId(remaining[0].id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Calculator className="text-indigo-600" size={24} />
            Bảng Tính Giá Sàn Thương Mại Điện Tử
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Mô phỏng 19 đầu mục giá chi tiết, tùy biến tham số thuế phí sàn & hỗ trợ rà và chặn quà tặng Inochi phù hợp quy chuẩn 8% giá bán.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-150 px-2.5 py-1.5 rounded-xl font-mono">
            ● Real-time console active
          </span>
          <button
            onClick={handleAddProductRow}
            className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus size={14} /> So sánh thêm
          </button>
        </div>
      </div>

      {/* Platform Tabs Switcher (Shopee Mall vs TikTok Shop) */}
      <div className="flex bg-slate-100 hover:bg-slate-150/50 p-1 rounded-2xl select-none max-w-sm border border-slate-200/40">
        <button
          type="button"
          onClick={() => setActivePlatform('shopee')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black tracking-wider transition-all duration-200 uppercase cursor-pointer ${
            activePlatform === 'shopee'
              ? 'bg-orange-600 text-white shadow-md'
              : 'text-slate-550 hover:text-slate-850'
          }`}
        >
          🎁 PHÂN KHÚC: SHOPEE MALL
        </button>
        <button
          type="button"
          onClick={() => setActivePlatform('tiktok')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black tracking-wider transition-all duration-200 uppercase cursor-pointer ${
            activePlatform === 'tiktok'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-550 hover:text-slate-850'
          }`}
        >
          🎵 PHÂN KHÚC: TIKTOK SHOP
        </button>
      </div>

      {/* Grid Comparison List Tab Selector */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto">
        {simulatedLines.map((line, idx) => {
          const isActive = line.id === activeLineId;
          const label = line.product.name ? line.product.name : `Sản phẩm ${idx + 1}`;
          return (
            <button
              key={line.id}
              onClick={() => setActiveLineId(line.id)}
              className={`cursor-pointer shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                isActive 
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-600' : 'bg-slate-400'}`} />
              <span className="max-w-[140px] truncate">{label}</span>
              {simulatedLines.length > 1 && (
                <Trash2 
                  size={12} 
                  className="text-slate-400 hover:text-rose-600 transition ml-1"
                  onClick={(e) => handleDeleteRow(line.id, e)}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Simulator Playground (Active Item Details) */}
      {activeLine && activeLineMetrics && (
        <div className="space-y-6">
          
          {/* Customizable Sàn Fees Control Panel */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800">
            <div className="absolute right-0 top-0 bg-indigo-610 text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-bl-xl font-mono text-indigo-100">
              Cơ Chế Thu Thuế Phí Linh Hoạt % / đ cố định
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Settings size={15} /> THAY ĐỔI CÁC ĐẦU MỤC PHÍ SÀN (NHẬP LINH HOẠT % HOẶC GIÁ TIỀN)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-4 mt-5">
              {activePlatform === 'shopee' ? (
                <>
                  {/* Phí cố định */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí cố định sàn</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.fixedFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.fixedFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, type: 'percent', val: Math.min(100, feeConfigs.fixedFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.fixedFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.fixedFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phí Giao dịch */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí cổng thanh toán sàn</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.paymentFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.paymentFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, type: 'percent', val: Math.min(100, feeConfigs.paymentFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.paymentFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.paymentFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Voucher X-tra */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Gói dịch vụ Voucher X-tra</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.voucherXtra.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.voucherXtra.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, type: 'percent', val: Math.min(100, feeConfigs.voucherXtra.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.voucherXtra.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.voucherXtra.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trần Voucher X-tra */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Trần Voucher X-tra Capped</label>
                    <div className="mt-1.5 relative rounded-xl shadow-3xs">
                      <input 
                        type="text" 
                        value={feeConfigs.voucherXtraCap.toLocaleString('vi-VN')}
                        onChange={(e) => setFeeConfigs({ ...feeConfigs, voucherXtraCap: cleanInt(e.target.value) })}
                        className="bg-slate-800 border border-slate-700/60 rounded-xl text-sm w-full py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-550 font-mono font-bold text-right"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 text-xs font-bold font-mono">đ</div>
                    </div>
                  </div>

                  {/* Hoa hồng sàn */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hoa hồng sàn liên kết (Affiliate)</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.commission.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.commission.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, type: 'percent', val: Math.min(100, feeConfigs.commission.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.commission.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.commission.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Platform Voucher */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Platform Voucher Trợ giá</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.platformVoucher.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.platformVoucher.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, type: 'percent', val: Math.min(100, feeConfigs.platformVoucher.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.platformVoucher.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.platformVoucher.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trần Platform Voucher */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide">Trần Platform Voucher</label>
                    <div className="mt-1.5 relative rounded-xl shadow-3xs">
                      <input 
                        type="text" 
                        value={feeConfigs.platformVoucherCap.toLocaleString('vi-VN')}
                        onChange={(e) => setFeeConfigs({ ...feeConfigs, platformVoucherCap: cleanInt(e.target.value) })}
                        className="bg-slate-800 border border-slate-700/60 rounded-xl text-sm w-full py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-550 font-mono font-bold text-right"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 text-xs font-bold font-mono">đ</div>
                    </div>
                  </div>

                  {/* Định mức quà tặng */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Định mức Quà Tặng Quota</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.giftQuota.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.giftQuota.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, type: 'percent', val: Math.min(100, feeConfigs.giftQuota.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.giftQuota.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.giftQuota.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Chi phí FFM */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Chi phí FFM kho bãi (Fulfillment)</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.ffmFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.ffmFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, type: 'percent', val: Math.min(100, feeConfigs.ffmFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.ffmFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.ffmFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Tỉ lệ hao mòn hoàn hàng & rủi ro */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tỉ lệ Hoàn hàng & Hao mòn rủi ro</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.returnFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.returnFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, returnFee: { ...feeConfigs.returnFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, returnFee: { ...feeConfigs.returnFee, type: 'percent', val: Math.min(100, feeConfigs.returnFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.returnFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, returnFee: { ...feeConfigs.returnFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.returnFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hạ tầng vận hành đơn hàng */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Hạ tầng vận hành đơn hàng</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.infraFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.infraFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, type: 'percent', val: Math.min(100, feeConfigs.infraFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.infraFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.infraFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* TikTok Shop specific fields */}
                  {/* Phí cố định */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí cố định</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.fixedFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.fixedFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, type: 'percent', val: Math.min(100, feeConfigs.fixedFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.fixedFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, fixedFee: { ...feeConfigs.fixedFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.fixedFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phí xử lý giao dịch */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí xử lý giao dịch</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.paymentFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.paymentFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, type: 'percent', val: Math.min(100, feeConfigs.paymentFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.paymentFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, paymentFee: { ...feeConfigs.paymentFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.paymentFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phí xử lý đơn hàng */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí xử lý đơn hàng</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.infraFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.infraFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, type: 'percent', val: Math.min(100, feeConfigs.infraFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.infraFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, infraFee: { ...feeConfigs.infraFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.infraFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phí Extra voucher */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Phí Extra voucher</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.voucherXtra.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.voucherXtra.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, type: 'percent', val: Math.min(100, feeConfigs.voucherXtra.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.voucherXtra.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, voucherXtra: { ...feeConfigs.voucherXtra, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.voucherXtra.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CF Fee */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">CF</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.cfFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.cfFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, cfFee: { ...feeConfigs.cfFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-850 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, cfFee: { ...feeConfigs.cfFee, type: 'percent', val: Math.min(100, feeConfigs.cfFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.cfFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, cfFee: { ...feeConfigs.cfFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.cfFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CMS */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">CMS (Commission)</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.commission.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.commission.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, type: 'percent', val: Math.min(100, feeConfigs.commission.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.commission.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, commission: { ...feeConfigs.commission, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.commission.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FFM */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">FFM</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.ffmFee.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.ffmFee.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, type: 'percent', val: Math.min(100, feeConfigs.ffmFee.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.ffmFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, ffmFee: { ...feeConfigs.ffmFee, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.ffmFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Voucher Sàn */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-widest">Voucher Sàn (Trợ giá) 25% mặc định</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.platformVoucher.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.platformVoucher.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, type: 'percent', val: Math.min(100, feeConfigs.platformVoucher.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.platformVoucher.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, platformVoucher: { ...feeConfigs.platformVoucher, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.platformVoucher.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trần Voucher Sàn */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wide">Trần Voucher Sàn</label>
                    <div className="mt-1.5 relative rounded-xl shadow-3xs">
                      <input 
                        type="text" 
                        value={feeConfigs.platformVoucherCap.toLocaleString('vi-VN')}
                        onChange={(e) => setFeeConfigs({ ...feeConfigs, platformVoucherCap: cleanInt(e.target.value) })}
                        className="bg-slate-800 border border-slate-700/60 rounded-xl text-sm w-full py-2 px-3 text-white focus:outline-none focus:ring-1 focus:ring-indigo-550 font-mono font-bold text-right"
                      />
                      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 text-xs font-bold font-mono">đ</div>
                    </div>
                  </div>

                  {/* Định mức quà tặng */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">Định mức Quà Tặng Quota</label>
                    <div className="mt-1.5 flex bg-slate-800 border border-slate-700/60 rounded-xl p-0.5 items-center justify-between">
                      <input 
                        type="text" 
                        value={feeConfigs.giftQuota.val.toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const raw = cleanInt(e.target.value);
                          const finalVal = feeConfigs.giftQuota.type === 'percent' ? Math.min(100, raw) : raw;
                          setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, val: finalVal } });
                        }}
                        className="bg-transparent text-sm w-full py-1.5 px-3 text-white focus:outline-none font-mono font-bold"
                      />
                      <div className="flex rounded-lg bg-slate-950 border border-slate-855 p-0.5 shrink-0 select-none mr-1">
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, type: 'percent', val: Math.min(100, feeConfigs.giftQuota.val) } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.giftQuota.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFeeConfigs({ ...feeConfigs, giftQuota: { ...feeConfigs.giftQuota, type: 'value' } })}
                          className={`px-2 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${feeConfigs.giftQuota.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                          đ
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex items-end mb-1 col-span-2 sm:col-span-3 lg:col-span-4 mt-2">
                <button 
                  onClick={() => {
                    if (activePlatform === 'shopee') {
                      setFeeConfigs({
                        fixedFee: { type: 'percent', val: 17 },
                        infraFee: { type: 'value', val: 3000 },
                        paymentFee: { type: 'percent', val: 6.0 },
                        voucherXtra: { type: 'percent', val: 5.0 },
                        voucherXtraCap: 50000,
                        cfFee: { type: 'percent', val: 0.0 },
                        commission: { type: 'percent', val: 15.0 },
                        ffmFee: { type: 'percent', val: 5.0 },
                        returnFee: { type: 'percent', val: 1.0 },
                        platformVoucher: { type: 'percent', val: 20.0 },
                        platformVoucherCap: 150000,
                        giftQuota: { type: 'percent', val: 8.0 }
                      });
                    } else {
                      setFeeConfigs({
                        fixedFee: { type: 'percent', val: 14.7 },
                        infraFee: { type: 'value', val: 3000 },
                        paymentFee: { type: 'percent', val: 5.0 },
                        voucherXtra: { type: 'percent', val: 3.0 },
                        voucherXtraCap: 0,
                        cfFee: { type: 'percent', val: 10.0 },
                        commission: { type: 'percent', val: 15.0 },
                        ffmFee: { type: 'percent', val: 5.0 },
                        returnFee: { type: 'percent', val: 0.0 },
                        platformVoucher: { type: 'percent', val: 20.0 },
                        platformVoucherCap: 0,
                        giftQuota: { type: 'percent', val: 8.0 }
                      });
                    }
                  }}
                  className="cursor-pointer text-xs bg-slate-800 border border-slate-700/60 hover:bg-slate-750 text-indigo-300 font-bold px-3 py-2.5 rounded-lg text-center w-full transition"
                >
                  Reset Default Sàn
                </button>
              </div>
            </div>

            {/* New explainer for Voucher X-tra */}
            <div className="mt-5 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-xs text-indigo-200 space-y-2 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <Info size={14} className="shrink-0" />
                <span>💡 Giải thích Voucher X-tra và Voucher Shop</span>
              </div>
              <p className="pl-5 text-[11px]">
                <strong>Gói Voucher X-tra (Trần chi trả):</strong> Đây là chi phí dịch vụ tham gia các gói ưu tiên của sàn (ví dụ như gói Hoàn Xu Xtra / Xu Voucher của Shopee). Người kinh doanh chịu phí và sàn <strong>giới hạn mức tối đa (Capped) ở mức trần tối đa</strong> cho mỗi sản phẩm.
              </p>
              <p className="pl-5 text-[11px]">
                <strong>Voucher Shop:</strong> Chi phí mã giảm giá do chính chủ gian hàng của bạn thiết lập để thu hút khách chọn mua sản phẩm, có thể tùy biến theo phần trăm (%) hoặc số tiền mặt cố định cụ thể bằng VNĐ (đ).
              </p>
            </div>
          </div>

          {/* Cấu Hình & Quản Lý Voucher Toàn Gian Hàng Block */}
          <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-rose-100 pb-4">
              <div className="flex items-start gap-2.5">
                <Percent className="text-rose-500 shrink-0 mt-1" size={18} />
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 flex items-center gap-2">
                    CƠ CHẾ & QUẢN LÝ VOUCHER TOÀN GIAN HÀNG (MIN SPEND & CAP GIỚI HẠN)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                    Khi bật chế độ <strong>TỰ ĐỘNG (ƯU TIÊN)</strong> trên từng dòng sản phẩm, hệ thống tự động quét & kích hoạt mã có <strong>độ ưu tiên lớn nhất</strong> thỏa điều kiện <strong>Min Spend ≤ Giá bán</strong> của dòng đó.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={addShopVoucher}
                className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 text-xs font-black bg-rose-50 border border-rose-150 text-rose-700 px-3.5 py-2.5 rounded-xl hover:bg-rose-100/50 transition duration-150 align-middle"
              >
                <Plus size={14} className="stroke-[3px]" /> Thêm Voucher Shop
              </button>
            </div>

            {/* List Table of Shop Vouchers */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-150 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse min-w-[750px] font-sans">
                <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                  <tr className="border-b border-slate-150 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-2.5 px-3">Mã Voucher (Code)</th>
                    <th className="py-2.5 px-3">Phân loại giảm</th>
                    <th className="py-2.5 px-3">Giá trị giảm (Val)</th>
                    <th className="py-2.5 px-3" title="Giá bán sản phẩm tối thiểu ban đầu để được áp mã">Min Spend (Giá bán tối thiểu)</th>
                    <th className="py-2.5 px-3" title="Hạn mức giảm tối đa của Voucher %">Cap tối đa (Giới hạn Cap)</th>
                    <th className="py-2.5 px-3 text-center" title="Độ ưu tiên để hệ thống tự động chọn (Priority càng lớn càng ưu tiên trước)">Cấp ưu tiên (Priority)</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 divide-dashed">
                  {shopVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                        Chưa có voucher shop nào được tạo. Hãy nhấn "Thêm Voucher" để tạo cấu hình mẫu!
                      </td>
                    </tr>
                  ) : (
                    [...shopVouchers].sort((a,b) => b.priority - a.priority).map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition">
                        {/* 1. Code */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={v.code}
                            onChange={(e) => updateShopVoucher(v.id, { code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                            className="bg-white border border-slate-200 rounded-lg py-1 px-2.5 font-mono font-bold text-slate-800 text-xs w-full focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[155px]"
                          />
                        </td>
                        
                        {/* 2. Type */}
                        <td className="py-3 px-3">
                          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-205">
                            <button
                              type="button"
                              onClick={() => {
                                const newVal = v.type === 'percent' ? v.val : Math.min(100, v.val);
                                updateShopVoucher(v.id, { type: 'percent', val: newVal });
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer transition ${v.type === 'percent' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              %
                            </button>
                            <button
                              type="button"
                              onClick={() => updateShopVoucher(v.id, { type: 'value' })}
                              className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer transition ${v.type === 'value' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                              đ
                            </button>
                          </div>
                        </td>

                        {/* 3. Value */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={v.val.toLocaleString('vi-VN')}
                              onChange={(e) => {
                                const clean = cleanInt(e.target.value);
                                updateShopVoucher(v.id, { val: v.type === 'percent' ? Math.min(100, clean) : clean });
                              }}
                              className="bg-white border border-slate-200 rounded-lg py-1 pl-2.5 pr-6 font-mono font-bold text-slate-800 text-xs w-full focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[95px] text-right"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-[9px] text-slate-400 font-bold font-mono">
                              {v.type === 'percent' ? '%' : 'đ'}
                            </div>
                          </div>
                        </td>

                        {/* 4. Min Spend */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              value={v.minSpent.toLocaleString('vi-VN')}
                              onChange={(e) => updateShopVoucher(v.id, { minSpent: cleanInt(e.target.value) })}
                              className="bg-white border border-slate-200 rounded-lg py-1 pl-2.5 pr-6 font-mono font-bold text-slate-800 text-xs w-full focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[130px] text-right"
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-[9px] text-slate-400 font-bold font-mono">đ</div>
                          </div>
                        </td>

                        {/* 5. Cap Value */}
                        <td className="py-3 px-3">
                          <div className="relative">
                            <input
                              type="text"
                              disabled={v.type === 'value'}
                              value={v.type === 'value' ? 'N/A' : v.capVal.toLocaleString('vi-VN')}
                              onChange={(e) => updateShopVoucher(v.id, { capVal: cleanInt(e.target.value) })}
                              className={`bg-white border border-slate-200 rounded-lg py-1 pl-2.5 pr-6 font-mono font-bold text-slate-800 text-xs w-full focus:outline-none focus:ring-1 focus:ring-rose-500 max-w-[130px] text-right ${v.type === 'value' ? 'opacity-30 select-none bg-slate-50' : ''}`}
                            />
                            {v.type !== 'value' && (
                              <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-[9px] text-slate-400 font-bold font-mono">đ</div>
                            )}
                          </div>
                        </td>

                        {/* 6. Priority */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 max-w-[90px] mx-auto select-none">
                            <button
                              type="button"
                              onClick={() => updateShopVoucher(v.id, { priority: Math.max(1, v.priority - 1) })}
                              className="cursor-pointer w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 text-xs"
                            >
                              -
                            </button>
                            <span className="font-mono font-extrabold text-xs text-slate-800 w-6 text-center">{v.priority}</span>
                            <button
                              type="button"
                              onClick={() => updateShopVoucher(v.id, { priority: v.priority + 1 })}
                              className="cursor-pointer w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 text-xs"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* 7. Active Status Toggle */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={v.active}
                            onChange={(e) => updateShopVoucher(v.id, { active: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer accent-indigo-600"
                          />
                        </td>

                        {/* 8. Deletion */}
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteShopVoucher(v.id)}
                            className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                            title="Xóa voucher này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-150 p-3 rounded-2xl flex items-start gap-1.5 leading-normal">
              <span className="font-bold text-indigo-700">💡 Hướng dẫn vận hành:</span>
              <span>
                Cơ chế tối ưu (AUTO) sẽ tự động duyệt từ Voucher có <strong>Độ ưu tiên cao nhất</strong> xuống thấp dần, áp dụng mã đầu tiên thỏa mãn điều kiện mua hàng tối thiểu. 
                Voucher Platform trợ giá được cấu hình trong bảng điều khiển phía trên sẽ được tính trên <strong>Giá sau khi trừ toàn bộ Voucher Shop</strong> như quy tắc thực tế của sàn thương mại điện tử.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column Configuration Controls */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calculator size={15} /> 1. Định hình chính sách giá
              </h3>
            </div>
            
            {/* 1. Select core appliance product */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Lựa chọn sản phẩm chính</label>
              <select
                value={activeLine.product.vpCode}
                onChange={(e) => handleProductChange(e.target.value)}
                className="mt-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full p-3 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 cursor-pointer"
              >
                {activeProducts.map(p => (
                  <option key={p.vpCode} value={p.vpCode}>
                    {p.name} ({p.vpCode}) - COGS: {formatVND(p.cogsUpdated || p.cogs)}
                  </option>
                ))}
              </select>

              {/* Dynamic image display for selected product */}
              <div className="mt-3.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-3 flex items-center gap-4 transition duration-200">
                <div className="w-16 h-16 bg-white border border-slate-100 rounded-xl overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                  <img 
                    src={getProductImage(activeLine.product)}
                    alt={activeLine.product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover cursor-zoom-in hover:opacity-90"
                    onClick={() => {
                      const img = getProductImage(activeLine.product);
                      if (typeof window !== 'undefined' && window.showImagePreview) {
                        window.showImagePreview(img);
                      }
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=200";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-black tracking-wider uppercase bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                    {activeLine.product.vpCode}
                  </span>
                  <h4 className="font-bold text-slate-800 text-xs truncate mt-1">{activeLine.product.name}</h4>
                  <div className="flex gap-2.5 mt-1 font-mono text-[9px] text-slate-500">
                    <span>COGS: <strong className="text-slate-700">{formatVND(activeLine.product.cogsUpdated || activeLine.product.cogs)}</strong></span>
                    <span>RSP: <strong className="text-slate-700">{formatVND(activeLine.product.rsp)}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Selling Price Selection Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Áp dụng mức giá sản phẩm</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {selectedProductPrices.map(p => {
                  const isSelected = activeLine.selectedPriceType === p.type;
                  return (
                    <button
                      key={p.type}
                      onClick={() => handlePriceTypeChange(p.type)}
                      className={`cursor-pointer p-2.5 rounded-xl border text-left transition ${
                        isSelected 
                          ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50'
                      }`}
                    >
                      <div className={`text-[9px] font-mono font-bold tracking-wider uppercase leading-none block ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {p.label}
                      </div>
                      <div className="text-xs font-extrabold font-mono mt-1 block">
                        {p.val > 0 ? p.val.toLocaleString('vi-VN') : '—'}
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePriceTypeChange('custom')}
                  className={`cursor-pointer p-2.5 rounded-xl border text-left transition ${
                    activeLine.selectedPriceType === 'custom' 
                      ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  <span className={`text-[9px] font-mono font-bold tracking-wider uppercase leading-none block ${activeLine.selectedPriceType === 'custom' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    TỰ NHẬP GIÁ
                  </span>
                  <span className="text-xs font-extrabold mt-1 block">Tùy chỉnh</span>
                </button>
              </div>

              {/* Custom price field */}
              {activeLine.selectedPriceType === 'custom' && (
                <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-fade-in">
                  <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest font-mono">Nhập giá trị tiền mặt (VNĐ)</label>
                  <div className="relative rounded-lg shadow-sm mt-1">
                    <input
                      type="text"
                      value={activeLine.customPrice.toLocaleString('vi-VN')}
                      onChange={(e) => handleCustomPriceChange(cleanInt(e.target.value))}
                      className="bg-white border border-indigo-200 rounded-lg text-sm w-full py-1.5 pl-3 pr-8 text-slate-800 font-mono font-extrabold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400 text-xs font-bold font-mono">đ</div>
                  </div>
                </div>
              )}
            </div>

             {/* 3. Shop-issued platform campaign Voucher Policy */}
             <div className="space-y-3.5 border-t border-slate-100 pt-4">
               <div className="flex justify-between items-baseline">
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Cơ chế áp dụng Voucher Shop</label>
                 <span className="text-xs font-mono font-semibold text-slate-500">Thành tiền giảm: {formatVND(activeLineMetrics.shopVoucher)}</span>
               </div>
               
               {/* Option Selector Pill group */}
               <div className="flex gap-1 p-1 bg-slate-100 rounded-xl select-none">
                 <button
                   type="button"
                   onClick={() => {
                     setSimulatedLines(lines => lines.map(l => l.id === activeLineId ? { ...l, voucherMode: 'auto' } : l))
                   }}
                   className={`flex-1 text-center py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                     (!activeLine.voucherMode || activeLine.voucherMode === 'auto')
                       ? 'bg-indigo-600 text-white shadow-3xs'
                       : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                   }`}
                 >
                   TỰ ĐỘNG
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     const firstActiveSV = shopVouchers.filter(v => v.active)[0]?.id || '';
                     setSimulatedLines(lines => lines.map(l => l.id === activeLineId ? { ...l, voucherMode: 'manual', selectedVoucherId: l.selectedVoucherId || firstActiveSV } : l))
                   }}
                   className={`flex-1 text-center py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                     activeLine.voucherMode === 'manual'
                       ? 'bg-indigo-600 text-white shadow-3xs'
                       : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                   }`}
                 >
                   CHỌN MÃ
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     setSimulatedLines(lines => lines.map(l => l.id === activeLineId ? { ...l, voucherMode: 'custom' } : l))
                   }}
                   className={`flex-1 text-center py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                     activeLine.voucherMode === 'custom'
                       ? 'bg-indigo-600 text-white shadow-3xs'
                       : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                   }`}
                 >
                   TỰ NHẬP
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     setSimulatedLines(lines => lines.map(l => l.id === activeLineId ? { ...l, voucherMode: 'none' } : l))
                   }}
                   className={`flex-1 text-center py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                     activeLine.voucherMode === 'none'
                       ? 'bg-indigo-600 text-white shadow-3xs'
                       : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                   }`}
                 >
                   KHÔNG
                 </button>
               </div>

               {/* Dynamic feedback display depending on mode */}
               {(!activeLine.voucherMode || activeLine.voucherMode === 'auto') && (
                 <div className="p-3 bg-indigo-50/40 border border-indigo-150/40 rounded-2xl text-xs space-y-1.5">
                   <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-wider">
                     <span>Hệ thống tự động kích hoạt:</span>
                     <span className="bg-emerald-50 text-emerald-700 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold animate-pulse-subtle">OPTIMIZED</span>
                   </div>
                   {activeLineMetrics.appliedVoucherCode ? (
                     <div>
                       <div className="flex justify-between items-center font-bold text-slate-800">
                         <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-[10px] font-mono">
                           {activeLineMetrics.appliedVoucherCode}
                         </span>
                         <span className="text-emerald-600 font-mono font-extrabold">-{formatVND(activeLineMetrics.shopVoucher)}</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                         Mã có cấp ưu tiên (Priority) cao nhất thỏa điều kiện áp dụng với mức giá bán hiện tại là <strong>{formatVND(activeLineMetrics.basePrice)}</strong>.
                       </p>
                     </div>
                   ) : (
                     <div className="text-[10px] text-amber-600 font-medium">
                       ⚠️ Không có shop voucher hợp lệ nào thỏa điều kiện (Giá bán {formatVND(activeLineMetrics.basePrice)} nhỏ hơn Min Spend của tất cả các dòng voucher).
                     </div>
                   )}
                 </div>
               )}

               {activeLine.voucherMode === 'manual' && (
                 <div className="p-3 bg-slate-50 border border-slate-205 rounded-2xl space-y-2">
                   <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                     <span>Danh mục mã voucher hoạt động:</span>
                     <span className="bg-indigo-50 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded font-bold font-mono">MANUAL</span>
                   </div>
                   <select
                     value={activeLine.selectedVoucherId || ''}
                     onChange={(e) => {
                       const vId = e.target.value;
                       setSimulatedLines(lines => lines.map(l => l.id === activeLineId ? { ...l, selectedVoucherId: vId } : l));
                     }}
                     className="bg-white border border-slate-200 rounded-xl text-xs w-full p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                   >
                     <option value="">-- Chọn mã ưu đãi --</option>
                     {shopVouchers.map(v => {
                       const suffix = v.type === 'percent' ? `${v.val}% (Capped ${formatVND(v.capVal)})` : formatVND(v.val);
                       return (
                         <option key={v.id} value={v.id} disabled={!v.active}>
                           {v.code} ({suffix}) - Min: {formatVND(v.minSpent)} {(!v.active) ? '[TẮT]' : ''}
                         </option>
                       );
                     })}
                   </select>

                   {activeLine.selectedVoucherId && (
                     (() => {
                       const v = shopVouchers.find(v => v.id === activeLine.selectedVoucherId);
                       if (v && activeLineMetrics.basePrice < v.minSpent) {
                         return (
                           <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2 rounded-lg leading-normal">
                             ⚠️ Điểm mua hàng chưa thỏa hạn định! Trị giá {formatVND(activeLineMetrics.basePrice)} nhỏ hơn Min Buy {formatVND(v.minSpent)}.
                           </div>
                         );
                       }
                       return null;
                     })()
                   )}
                 </div>
               )}

               {activeLine.voucherMode === 'custom' && (
                 <div className="space-y-2">
                   <div className="flex bg-white border border-slate-200 rounded-xl p-0.5 items-center justify-between shadow-xs">
                     <input 
                       type="text" 
                       value={(activeLine.userVoucherType === 'value' ? activeLine.userVoucherVal : (activeLine.userVoucherVal || activeLine.userVoucherPct || 0)).toLocaleString('vi-VN')}
                       onChange={(e) => handleVoucherValChange(cleanInt(e.target.value))}
                       className="bg-transparent text-sm w-full py-1.5 px-3 text-slate-800 focus:outline-none font-mono font-extrabold"
                       placeholder="0"
                     />
                     <div className="flex rounded-lg bg-slate-100 border border-slate-200/50 p-0.5 shrink-0 select-none mr-1.5">
                       <button 
                         type="button"
                         onClick={() => handleVoucherTypeChange('percent')}
                         className={`px-3 py-1 rounded-md text-[10px] font-black transition cursor-pointer ${(!activeLine.userVoucherType || activeLine.userVoucherType === 'percent') ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                       >
                         %
                       </button>
                       <button 
                         type="button"
                         onClick={() => handleVoucherTypeChange('value')}
                         className={`px-3 py-1 rounded-md text-[10px] font-black transition cursor-pointer ${activeLine.userVoucherType === 'value' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                       >
                         đ
                       </button>
                     </div>
                   </div>
                 </div>
               )}

               {activeLine.voucherMode === 'none' && (
                 <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-[10px] text-slate-500 text-center">
                   🚫 Đã chọn bỏ qua toàn bộ Voucher Shop cho SKU này.
                 </div>
               )}
             </div>

            {/* 4. Gift Selection and Allowance Controls */}
            <div className="border-t border-slate-100 pt-5 space-y-3.5">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="flex items-center gap-2"><Gift size={15} /> 2. Định mức quà tặng</span>
                <span className="bg-slate-100 text-[10px] lowercase text-slate-500 font-mono font-bold px-2.5 py-0.5 rounded-full">
                  Quota ({formatFeeConfigLabel(feeConfigs.giftQuota)})
                </span>
              </h3>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span>Hạng mục quà tối đa bảo hành (8%):</span>
                <span className="font-extrabold text-teal-600 font-mono">
                  {formatVND(activeLineMetrics.giftAllowance)}
                </span>
              </div>

              {/* Active Gift Pair */}
              <div className="relative">
                {activeLine.selectedGifts && activeLine.selectedGifts.length > 0 ? (
                  <div className="space-y-2">
                    {/* Selected Gifts List card */}
                    <div className={`p-4 border rounded-2xl transition ${
                      activeLineMetrics.isGiftUnsuitable 
                        ? 'bg-rose-50/50 border-rose-250' 
                        : 'bg-indigo-50/15 border-indigo-200'
                    }`}>
                      <div className="flex justify-between items-center pb-2 border-b border-indigo-100/10 mb-3">
                        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Danh sách quà tặng ({activeLine.selectedGifts.length})</span>
                        <button 
                          onClick={() => handleSelectGift(null)}
                          className="text-[10px] font-black text-rose-600 hover:underline cursor-pointer"
                        >
                          Xoá tất cả
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {activeLine.selectedGifts.map((giftItem, gIdx) => (
                          <div key={gIdx} className="flex items-center justify-between gap-3 bg-white border border-slate-200/50 p-2.5 rounded-xl shadow-3xs">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs truncate" title={giftItem.product.name}>
                                {giftItem.product.name}
                              </h4>
                              <p className="text-[8px] text-slate-400 font-mono mt-0.5 truncate leading-none">
                                SKU: <span className="text-slate-500 font-bold tracking-wider">{giftItem.product.skuPhanLoai}</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-sans mt-1 leading-none">
                                Cost vốn: <strong className="text-emerald-600 font-mono font-bold">{formatVND(giftItem.product.cogs)}</strong>
                              </p>
                            </div>

                            {/* Quantity edit controls */}
                            <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleToggleOrUpdateGift(giftItem.product, -1)}
                                className="cursor-pointer w-5 h-5 rounded flex items-center justify-center text-xs font-black bg-white shadow-3xs border border-slate-200 text-slate-600 hover:bg-slate-50"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-mono font-bold text-xs text-slate-800">
                                {giftItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleOrUpdateGift(giftItem.product, 1)}
                                className="cursor-pointer w-5 h-5 rounded flex items-center justify-center text-xs font-black bg-white shadow-3xs border border-slate-200 text-slate-600 hover:bg-slate-50"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary calculations under budget of the list */}
                      <div className="mt-3 pt-2.5 border-t border-slate-150/60 flex justify-between items-baseline font-mono">
                        <div>
                          <span className="text-[9px] text-slate-400 font-sans font-bold uppercase leading-none block">Cực đại quỹ:</span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">{formatVND(activeLineMetrics.giftAllowance)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 font-sans font-bold uppercase leading-none block">Tổng Cogs quà:</span>
                          <span className={`text-xs font-black block mt-0.5 ${activeLineMetrics.isGiftUnsuitable ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatVND(activeLineMetrics.actualGiftCogs)}
                          </span>
                        </div>
                      </div>

                      {activeLineMetrics.isGiftUnsuitable && (
                        <div className="mt-3 flex items-center gap-1.5 bg-rose-100/60 p-2 rounded-xl border border-rose-200">
                          <AlertCircle size={14} className="text-rose-600 shrink-0" />
                          <span className="text-[10px] font-extrabold text-rose-800 leading-tight block">
                            Vượt định mức an toàn! Lệch (GAP): {formatVND(activeLineMetrics.giftCogsGap)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Button to click to add more gifts */}
                    <button
                      type="button"
                      onClick={() => setGiftPickerOpen(true)}
                      className="cursor-pointer w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/15 rounded-xl transition font-sans text-xs font-extrabold text-indigo-700 bg-white"
                    >
                      <Plus size={14} /> Chọn thêm quà tặng
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setGiftPickerOpen(true);
                    }}
                    className="cursor-pointer w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 rounded-2xl transition duration-200"
                  >
                    <Gift className="text-slate-400" size={18} />
                    <span className="text-xs font-bold text-slate-600">Ấn để chọn vật phẩm Quà Tặng phù hợp</span>
                    <span className="bg-indigo-50 border border-indigo-100/50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">8% limit</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Right Column Visual Analytics Ledger and Waterfall */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between self-stretch">
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Sparkles size={14} className="text-amber-500" /> BÁO CÁO PHÂN TÍCH ĐIỂM HOÀ VỐN CHUYÊN SÂU
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">Giá khách trả</span>
                  <span className="text-lg font-black font-mono text-indigo-700 block mt-1">
                    {formatVND(activeLineMetrics.customerBuyPrice)}
                  </span>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] text-slate-500 leading-none block">Gồm Platform subsidy</span>
                    {activeLineMetrics.rsp > 0 && (
                      <span className="text-[10px] text-indigo-600 font-extrabold font-sans block animate-pulse-subtle">
                        Giảm {(((activeLineMetrics.rsp - activeLineMetrics.customerBuyPrice) / activeLineMetrics.rsp) * 100).toFixed(1)}% so với RSP
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono block">Lợi Nhuận Ròng (VND)</span>
                  <span className={`text-lg font-black font-mono block mt-1 ${activeLineMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-650'}`}>
                    {formatVND(activeLineMetrics.netProfit)}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-none block mt-1">Sau khi trừ giá vốn sản phẩm</span>
                </div>
              </div>

              {/* Profit Percent Pills */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="border border-slate-200/60 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase font-mono">Tỉ suất Gộp (%GM)</span>
                    <span className="text-[10px] text-slate-500 leading-none mt-1 block font-mono">
                      {activePlatform === 'tiktok' ? '(Price - COGS - Quà) / Price' : '(Price - Voucher Shop - Quà - COGS) / Price'}
                    </span>
                  </div>
                  <span className={`text-sm font-black font-mono bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-xl block text-indigo-700`}>
                    {activeLineMetrics.percentageGM.toFixed(1)}%
                  </span>
                </div>

                <div className="border border-slate-200/60 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase font-mono">Tỉ suất Ròng (%NM)</span>
                    <span className="text-[10px] text-slate-500 leading-none mt-1 block font-mono">
                      {activePlatform === 'tiktok' ? 'Net Sale / GM' : '(Netpool - COGS) / Price'}
                    </span>
                  </div>
                  <span className={`text-sm font-black font-mono px-2.5 py-1 rounded-xl block ${
                    activeLineMetrics.percentageNM >= 15 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : activeLineMetrics.percentageNM >= 0 
                        ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}>
                    {activeLineMetrics.percentageNM.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Cost of Goods & Fees Waterfall visually parsed */}
              <div className="pt-4 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Cấu trúc phân bổ doanh thu (Từ Giá bán)</span>
                
                <div className="space-y-2 font-mono text-xs">
                  {/* Revenue Base Price row */}
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="font-bold">Giá bán thoả thuận (100%):</span>
                    <span className="font-extrabold">{formatVND(activeLineMetrics.basePrice)}</span>
                  </div>

                  {/* COGS Segment Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>1. Giá vốn sản phẩm (COGS updated):</span>
                      <span className="font-semibold text-rose-600">-{formatVND(activeLineMetrics.cogsUpdated)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (activeLineMetrics.cogsUpdated / activeLineMetrics.basePrice) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Operational Fees Segment Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>2. Chi phí thuế sàn + Vận hành (Platform Fees):</span>
                      <span className="font-semibold text-amber-600">
                        -{formatVND(
                          activeLineMetrics.fixedFee + 
                          activeLineMetrics.paymentFee + 
                          activeLineMetrics.infraFee + 
                          activeLineMetrics.commission + 
                          activeLineMetrics.ffmFee + 
                          activeLineMetrics.voucherXtra +
                          activeLineMetrics.returnFee +
                          activeLineMetrics.cfFee
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-amber-400 h-full transition-all duration-300 animate-slide-left"
                        style={{ 
                          width: `${Math.min(100, ((
                            activeLineMetrics.fixedFee + 
                            activeLineMetrics.paymentFee + 
                            activeLineMetrics.infraFee + 
                            activeLineMetrics.commission + 
                            activeLineMetrics.ffmFee + 
                            activeLineMetrics.voucherXtra +
                            activeLineMetrics.returnFee +
                            activeLineMetrics.cfFee
                          ) / activeLineMetrics.basePrice) * 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Gift Cost Segment Bar */}
                  {activeLineMetrics.actualGiftCogs > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>3. Giá vốn phân bổ quà tặng thực tế (Gift):</span>
                        <span className="font-semibold text-cyan-600">-{formatVND(activeLineMetrics.actualGiftCogs)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-cyan-500 h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (activeLineMetrics.actualGiftCogs / activeLineMetrics.basePrice) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Net Pool remaining */}
                  <div className="flex justify-between pr-1 border-t border-slate-100 pt-3 text-slate-800 font-bold font-sans">
                    <span>Doanh thu thuần về tay (net pool):</span>
                    <span className="text-teal-600 font-extrabold font-mono">{formatVND(activeLineMetrics.netPool)}</span>
                  </div>
                </div>

                {/* Detailed Fee & Cost Ledger Table */}
                <div className="mt-4 border border-slate-200/65 rounded-2xl overflow-hidden bg-slate-50/40 shadow-3xs">
                  <div className="bg-slate-100/90 px-3 py-2 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-600 font-sans flex justify-between items-center">
                    <span>Hạng mục chi tiết bảng phí</span>
                    <span className="text-[8px] text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded font-bold font-mono">Real-time</span>
                  </div>
                  <table className="w-full text-xs font-mono text-slate-700">
                    <tbody>
                      {/* Row 1: Selling Price */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                        <td className="py-2 px-3.5 font-sans font-semibold text-slate-600">Giá bán thỏa thuận (Price)</td>
                        <td className="py-2 px-2 text-slate-400 text-[10px] text-right font-sans">Mức giá áp đặt</td>
                        <td className="py-2 px-3.5 font-bold text-indigo-700 text-right">{formatVND(activeLineMetrics.basePrice)}</td>
                      </tr>
                      {/* Row 2: COGS Updated */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30 bg-rose-50/5">
                        <td className="py-2 px-3.5 font-sans font-semibold text-slate-600">Giá vốn sản phẩm (COGS)</td>
                        <td className="py-2 px-2 text-slate-405 text-[10px] text-right font-sans truncate max-w-[120px]">Danh mục updated</td>
                        <td className="py-2 px-3.5 font-bold text-rose-600 text-right">-{formatVND(activeLineMetrics.cogsUpdated)}</td>
                      </tr>
                      {/* Row 3: Shop Voucher */}
                      {activeLineMetrics.shopVoucher > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                          <td className="py-2 px-3.5 font-sans font-semibold text-slate-600">Giảm giá mã (Voucher Shop)</td>
                          <td className="py-2 px-2 text-slate-400 text-[10px] text-right font-sans">
                            {activeLineMetrics.userVoucherType === 'percent' ? `${activeLineMetrics.userVoucherVal || activeLineMetrics.userVoucherPct}%` : 'Giảm trực tiếp'}
                          </td>
                          <td className="py-2 px-3.5 font-bold text-amber-600 text-right">-{formatVND(activeLineMetrics.shopVoucher)}</td>
                        </tr>
                      )}
                      {/* Row 3b: Gift */}
                      {activeLineMetrics.actualGiftCogs > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30 bg-cyan-50/5">
                          <td className="py-2 px-3.5 font-sans font-semibold text-slate-600">Chi phí quà tặng (Gift COGS)</td>
                          <td className="py-2 px-2 text-cyan-600 text-[9px] text-right font-sans truncate max-w-[130px]" title={activeLineMetrics.selectedGifts?.map(s => `${s.product.name} (x${s.quantity})`).join('\n')}>
                            {activeLineMetrics.selectedGifts && activeLineMetrics.selectedGifts.length === 1 
                              ? `${activeLineMetrics.selectedGifts[0].product.name} (x${activeLineMetrics.selectedGifts[0].quantity})` 
                              : `Có ${activeLineMetrics.selectedGifts?.length || 0} quà tặng`
                            }
                          </td>
                          <td className="py-2 px-3.5 font-bold text-cyan-600 text-right">-{formatVND(activeLineMetrics.actualGiftCogs)}</td>
                        </tr>
                      )}
                      {/* Row 4: Phí cố định */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                        <td className="py-1.5 px-3.5 font-sans text-slate-500">Phí cố định sàn</td>
                        <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.fixedFee)}</td>
                        <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.fixedFee)}</td>
                      </tr>
                      {/* Row 5: Infra Fee */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                        <td className="py-1.5 px-3.5 font-sans text-slate-500">Phí hạ tầng vận hành sản phẩm</td>
                        <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.infraFee)}</td>
                        <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.infraFee)}</td>
                      </tr>
                      {/* Row 6: Payment Fee */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                        <td className="py-1.5 px-3.5 font-sans text-slate-500">Phí cổng thanh toán sàn</td>
                        <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.paymentFee)}</td>
                        <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.paymentFee)}</td>
                      </tr>
                      {/* Row 7: Voucher X-tra */}
                      {activeLineMetrics.voucherXtra > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                          <td className="py-1.5 px-3.5 font-sans text-slate-500">Gói dịch vụ Voucher Xtra sàn</td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.voucherXtra)} (Trần {formatVND(feeConfigs.voucherXtraCap)})</td>
                          <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.voucherXtra)}</td>
                        </tr>
                      )}
                      {/* Row 8: Commission */}
                      <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                        <td className="py-1.5 px-3.5 font-sans text-slate-500">Chi phí phân bổ hoa hồng ngoại ngoại lực</td>
                        <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.commission)}</td>
                        <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.commission)}</td>
                      </tr>
                      {/* Row 9: FFM Fee */}
                      {activeLineMetrics.ffmFee > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                          <td className="py-1.5 px-3.5 font-sans text-slate-500">Chi phí quy đổi FFM kho bãi</td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.ffmFee)}</td>
                          <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.ffmFee)}</td>
                        </tr>
                      )}
                      {/* Row 9b: CF Fee (Only for TikTok if cfFee > 0) */}
                      {activePlatform === 'tiktok' && activeLineMetrics.cfFee > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                          <td className="py-1.5 px-3.5 font-sans text-slate-500">Phí chiến dịch đồng tài trợ (CF Fee)</td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.cfFee)}</td>
                          <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.cfFee)}</td>
                        </tr>
                      )}
                      {/* Row 10: Return Fee */}
                      {activeLineMetrics.returnFee > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30">
                          <td className="py-1.5 px-3.5 font-sans text-slate-500">Phí hao mòn hoàn hàng & rủi ro</td>
                          <td className="py-1.5 px-2 text-slate-400 text-[10px] text-right font-sans">{formatFeeConfigLabel(feeConfigs.returnFee)}</td>
                          <td className="py-1.5 px-3.5 text-slate-700 text-right">-{formatVND(activeLineMetrics.returnFee)}</td>
                        </tr>
                      )}
                      {/* Row 11: Platform Voucher Subsidy */}
                      {activeLineMetrics.platformVoucherCost > 0 && (
                        <tr className="border-b border-slate-150/50 hover:bg-slate-100/30 bg-indigo-50/5 transition animate-fade-in">
                          <td className="py-1.5 px-3.5 font-sans font-semibold text-indigo-700">Trợ giá Voucher từ Sàn</td>
                          <td className="py-1.5 px-2 text-indigo-400 text-[10px] text-right font-sans">Sàn bù tiền (+{formatFeeConfigLabel(feeConfigs.platformVoucher)})</td>
                          <td className="py-1.5 px-3.5 font-bold text-indigo-600 text-right">+{formatVND(activeLineMetrics.platformVoucherCost)}</td>
                        </tr>
                      )}
                      {/* Row 12: Customer buy price */}
                      <tr className="border-b border-slate-150/50 bg-slate-100/20 font-bold text-slate-800">
                        <td className="py-2 px-3.5 font-sans">Giá KHÁCH TRẢ cuối cùng</td>
                        <td className="py-2 px-2 text-slate-400 text-[10px] text-right font-sans font-normal">
                          {activeLineMetrics.rsp > 0 && (
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded inline-block mr-1.5">
                              Giảm {(((activeLineMetrics.rsp - activeLineMetrics.customerBuyPrice) / activeLineMetrics.rsp) * 100).toFixed(1)}% RSP
                            </span>
                          )}
                          Sàn trợ giá & Vouchers trừ
                        </td>
                        <td className="py-2 px-3.5 text-right font-black text-indigo-700">{formatVND(activeLineMetrics.customerBuyPrice)}</td>
                      </tr>
                      {/* Row 13: Net Pool remaining */}
                      <tr className="bg-emerald-50/20 font-bold text-slate-900">
                        <td className="py-2 px-3.5 font-sans text-emerald-800">DOANH THU THUẦN VỀ TAY (net pool)</td>
                        <td className="py-2 px-2 text-emerald-600 text-[10px] text-right font-sans font-normal">Doanh thu trước trừ COGS</td>
                        <td className="py-2 px-3.5 text-right font-black text-emerald-700">{formatVND(activeLineMetrics.netPool)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="mt-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
              <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                <strong>Grounding AI Advisor:</strong> Biên lợi nhuận tịnh mục tiêu khuyên dùng cho ngành gia dụng Inochi là <strong>&gt;= 15%</strong>. 
                {activeLineMetrics.percentageNM < 15 ? (
                  <span className="text-rose-600 font-semibold block mt-1">💡 Khuyến nghị: Hãy tăng giá bán sàn hoặc giảm định mức Voucher / lựa chọn quà tặng mức giá thấp hơn để cứu vớt biên lợi nhuận ròng.</span>
                ) : (
                  <span className="text-emerald-700 font-semibold block mt-1">💡 Trạng thái: Cực kì an toàn để tham gia chiến dịch Shopee / TikTok Shop!</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ----------------------------------------------------------- */}
      {/* 3. The Grand Interactive Spreadsheet Tab (All 19 Columns Requested) */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/75 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Bảng Tổng Hợp Doanh Thu Chi Tiết (19 Cột Quy Chuẩn)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toàn bộ dữ liệu hiển thị theo bảng tính thực hiện tổng hợp biên giá của tất cả sản phẩm đang so sánh.
            </p>
          </div>
          <button 
            onClick={() => {
              // Copy mock csv representation to clipboard
              const headers = [
                'VP Code', 'RSP', 'COGS $ Base', 'COGS $ Updated', 'pool base', 'Giá bán (Price)', 'Voucher Shop', 'Quà tặng (Gift)',
                'Phí cố định (17%)', 'Infra Fee', 'Payment Fee (6%)', 'Voucher X-tra', 'Commission (15%)',
                'Chi phí FFM (5%)', 'Chi phí return (1%)', 'Platform Voucher (20%)', 'net pool', 'Giá Khách Trả', '%GM', '%NM'
              ];
              const rows = calculatedLines.map(line => [
                `"${line.vpCode}"`, line.rsp, line.cogs, line.cogsUpdated, line.pool, line.basePrice, line.shopVoucher, line.actualGiftCogs,
                line.fixedFee, line.infraFee, line.paymentFee, line.voucherXtra, line.commission,
                line.ffmFee, line.returnFee, line.platformVoucherCost, line.netPool, line.customerBuyPrice,
                `"${line.percentageGM.toFixed(0)}%"`, `"${line.percentageNM.toFixed(0)}%"`
              ]);
              const csvContent = "data:text/csv;charset=utf-8," 
                + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `Inochi_Pricing_Ledger_${Date.now()}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-indigo-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-50 font-bold transition shadow-2xs"
          >
            <Download size={13} /> Xuất Báo Cáo excel
          </button>
        </div>

        <div ref={tableContainerRef} className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[2100px]">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                <th className="py-3.5 px-4 sticky left-0 bg-slate-100 z-10 w-[240px]">Sản Phẩm</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right">RSP (Catalog)</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right">COGS Vốn</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-rose-50/50 text-rose-800">COGS updated (19.05)</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right">pool (RSP)</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-indigo-50 text-indigo-800 font-extrabold font-mono">Giá bán (Price)</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right">Voucher Shop</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-cyan-50/50 font-semibold text-cyan-800">Vật Phẩm Gift</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Phí cố định ({formatFeeConfigLabel(feeConfigs.fixedFee)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Infra ({formatFeeConfigLabel(feeConfigs.infraFee)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Cổng thanh toán ({formatFeeConfigLabel(feeConfigs.paymentFee)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">
                  {activePlatform === 'tiktok' ? `CF Fee (${formatFeeConfigLabel(feeConfigs.cfFee)})` : `Voucher X-tra (${formatFeeConfigLabel(feeConfigs.voucherXtra)})`}
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Commission ({formatFeeConfigLabel(feeConfigs.commission)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Phí FFM ({formatFeeConfigLabel(feeConfigs.ffmFee)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">Tỷ lệ Trả lại ({formatFeeConfigLabel(feeConfigs.returnFee)})</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right font-sans">
                  {activePlatform === 'tiktok' ? `Voucher Sàn (${formatFeeConfigLabel(feeConfigs.platformVoucher)})` : `Platform Voucher (${formatFeeConfigLabel(feeConfigs.platformVoucher)})`}
                </th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-emerald-50 text-emerald-800 font-extrabold font-mono">net pool</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-right bg-indigo-50 text-indigo-900 font-bold">Giá Khách Mua cuối cùng</th>
                <th className="py-3.5 px-3 border-r border-slate-200/60 text-center font-bold bg-amber-50 text-amber-800">%GM</th>
                <th className="py-3.5 px-4 text-center font-bold bg-emerald-100 text-emerald-800">%NM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {calculatedLines.map((line, idx) => {
                const isActive = line.lineId === activeLineId;
                return (
                  <tr 
                    key={line.lineId} 
                    onClick={() => setActiveLineId(line.lineId)}
                    className={`cursor-pointer transition-all duration-150 leading-relaxed ${
                      isActive ? 'bg-indigo-50/30' : 'hover:bg-slate-50/55'
                    }`}
                  >
                    {/* Stuck Left product label col */}
                    <td className="py-3 px-4 font-bold text-slate-800 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)] z-10 bg-white group-hover:bg-indigo-50">
                      <div className="truncate max-w-[190px]">{line.productName}</div>
                      <div className="text-[10px] text-slate-400 font-normal font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>{line.vpCode}</span>
                        {stockRecords && (
                          (() => {
                            const matching = stockRecords.filter(s => s.skuPhanLoai === line.vpCode);
                            const total = matching.reduce((sum, s) => sum + s.quantity, 0);
                            const south = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                            const north = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                            if (total > 0) {
                              return (
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1 rounded text-[8px] font-bold font-sans" title={`Bắc: ${north} | Nam: ${south}`}>
                                  Tồn: {total} (B: {north} | N: {south})
                                </span>
                              );
                            }
                            return (
                              <span className="bg-rose-50 border border-rose-105 text-rose-700 px-1 rounded text-[8px] font-bold font-sans">
                                Hết hàng (0)
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </td>
                    
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.rsp)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.cogs)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono font-bold text-right bg-rose-50/10 text-rose-700">{formatVND(line.cogsUpdated)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.pool)}</td>
                    
                    {/* Selling price overrides col */}
                    <td className="py-1.5 px-2 border-r border-slate-150 text-right bg-indigo-50/10 min-w-[150px]">
                      <div className="flex items-center gap-1.5 justify-end">
                        <input
                          type="text"
                          value={line.basePrice.toLocaleString('vi-VN')}
                          onChange={(e) => {
                            const val = cleanInt(e.target.value);
                            setSimulatedLines(lines => lines.map(l => {
                              if (l.id === line.lineId) {
                                return {
                                  ...l,
                                  selectedPriceType: 'custom',
                                  customPrice: val
                                };
                              }
                              return l;
                            }));
                          }}
                          className="bg-white border border-indigo-200 rounded-lg text-xs font-mono font-black text-right text-indigo-700 p-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs max-w-[120px]"
                        />
                        <span className="text-[10px] text-indigo-400 font-bold font-sans">đ</span>
                      </div>
                      <div className="text-[8px] uppercase font-mono font-bold text-slate-400 mt-0.5 mr-4 leading-none text-right">
                        Linh hoạt ({line.selectedPriceType})
                      </div>
                    </td>

                     {/* Voucher Shop overrides col */}
                     <td className="py-1.5 px-2 border-r border-slate-150 text-right bg-slate-50/20 min-w-[195px]">
                       {line.voucherMode === 'auto' ? (
                         <div className="text-right">
                           <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 rounded px-1.5 py-0.5 font-bold font-mono">
                             AUTO: {line.appliedVoucherCode || "Không có"}
                           </span>
                           <div className="text-[10px] font-black font-mono text-emerald-600 mt-1">
                             -{formatVND(line.shopVoucher)}
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               setSimulatedLines(lines => lines.map(l => l.id === line.lineId ? { ...l, voucherMode: 'custom' } : l));
                             }}
                             className="text-[8px] font-extrabold text-indigo-600 hover:underline hover:text-indigo-850 tracking-wide mt-1 block ml-auto select-none"
                           >
                             ✎ Số t.biến
                           </button>
                         </div>
                       ) : line.voucherMode === 'manual' ? (
                         <div className="text-right">
                           <select
                             value={line.selectedVoucherId || ''}
                             onChange={(e) => {
                               const vId = e.target.value;
                               setSimulatedLines(lines => lines.map(l => l.id === line.lineId ? { ...l, selectedVoucherId: vId } : l));
                             }}
                             className="bg-white border border-slate-205 rounded text-[9px] font-black text-slate-700 p-0.5 max-w-[110px] focus:outline-none focus:ring-1 focus:ring-indigo-550 inline-block font-mono"
                           >
                             <option value="">-- Chọn --</option>
                             {shopVouchers.map(v => (
                               <option key={v.id} value={v.id} disabled={!v.active}>
                                 {v.code}
                               </option>
                             ))}
                           </select>
                           <span className="inline-block text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-150 rounded px-1 py-0.5 font-bold font-mono ml-1">
                             M_MÃ
                           </span>
                           <div className="text-[10px] font-black font-mono text-slate-600 mt-1">
                             -{formatVND(line.shopVoucher)}
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               setSimulatedLines(lines => lines.map(l => l.id === line.lineId ? { ...l, voucherMode: 'auto' } : l));
                             }}
                             className="text-[8px] font-extrabold text-emerald-650 hover:underline tracking-wide mt-1 block ml-auto select-none"
                           >
                             ↺ Tự động
                           </button>
                         </div>
                       ) : line.voucherMode === 'none' ? (
                         <div className="text-right">
                           <span className="text-[10px] text-slate-400 block font-semibold">TẮT VOUCHER</span>
                           <button
                             type="button"
                             onClick={() => {
                               setSimulatedLines(lines => lines.map(l => l.id === line.lineId ? { ...l, voucherMode: 'auto' } : l));
                             }}
                             className="text-[8px] font-extrabold text-emerald-650 hover:underline tracking-wide mt-1 block ml-auto select-none"
                           >
                             ↺ Bật lại
                           </button>
                         </div>
                       ) : (
                         // Custom manual voucher override Inputs
                         <div>
                           <div className="flex items-center gap-1 justify-end">
                             <input
                               type="text"
                               value={(line.userVoucherType === 'value' ? line.userVoucherVal : (line.userVoucherVal || line.userVoucherPct || 0)).toLocaleString('vi-VN')}
                               onChange={(e) => {
                                 const val = cleanInt(e.target.value);
                                 setSimulatedLines(lines => lines.map(l => {
                                   if (l.id === line.lineId) {
                                     const type = l.userVoucherType || 'percent';
                                     const finalVal = type === 'percent' ? Math.min(100, val) : val;
                                     return {
                                       ...l,
                                       userVoucherVal: finalVal,
                                       userVoucherPct: type === 'percent' ? finalVal : 0
                                     };
                                   }
                                   return l;
                                 }));
                               }}
                               className="bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right text-slate-700 p-1 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs max-w-[80px]"
                             />
                             
                             <button
                               type="button"
                               onClick={() => {
                                 setSimulatedLines(lines => lines.map(l => {
                                   if (l.id === line.lineId) {
                                     const currentType = l.userVoucherType || 'percent';
                                     const newType = currentType === 'percent' ? 'value' : 'percent';
                                     return {
                                       ...l,
                                       userVoucherType: newType,
                                       userVoucherVal: 0,
                                       userVoucherPct: 0
                                     };
                                   }
                                   return l;
                                 }));
                               }}
                               className="px-1.5 py-0.5 rounded text-[8px] font-black cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 tracking-wider shrink-0 transition"
                               title="Click để đổi loại giảm giá (% hoặc VNĐ)"
                             >
                               {line.userVoucherType === 'value' ? 'đ' : '%'}
                             </button>
                           </div>
                           <div className="text-[8px] text-slate-400 font-bold mr-4 font-mono leading-none mt-1 text-right">
                             Giảm: {formatVND(line.shopVoucher)}
                           </div>
                           <button
                             type="button"
                             onClick={() => {
                               setSimulatedLines(lines => lines.map(l => l.id === line.lineId ? { ...l, voucherMode: 'auto' } : l));
                             }}
                             className="text-[8px] font-extrabold text-emerald-650 hover:underline tracking-wide mt-1 block ml-auto select-none"
                           >
                             ↺ Tự động
                           </button>
                         </div>
                       )}
                     </td>
                    
                    {/* Gift allocation highlight gap col */}
                    <td className={`py-3 px-3 border-r border-slate-150 font-mono text-right min-w-[200px] ${
                      line.isGiftUnsuitable 
                        ? 'bg-rose-50 border-rose-200 text-rose-800' 
                        : line.actualGiftCogs > 0 
                          ? 'bg-emerald-50/40 text-emerald-800' 
                          : 'text-slate-400'
                    }`}>
                      {line.selectedGifts && line.selectedGifts.length > 0 ? (
                        <div>
                          {line.selectedGifts.map((selected, sIdx) => (
                            <div key={sIdx} className="border-b border-dashed border-slate-200/55 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                              <div className="font-bold text-[11px] truncate w-[180px] text-left" title={selected.product.name}>
                                {selected.product.name}
                              </div>
                              <div className="flex justify-between items-center text-[9px] mt-0.5 text-slate-500">
                                <span>SL: {selected.quantity} x {formatVND(selected.product.cogs)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between items-center text-[10px] mt-1 pt-1 border-t border-slate-100 font-extrabold text-slate-700">
                            <span>Tổng Cost:</span>
                            <span>{formatVND(line.actualGiftCogs)}</span>
                          </div>
                          {line.isGiftUnsuitable && (
                            <div className="text-[9px] font-extrabold text-rose-600 block leading-tight mt-0.5 text-left animate-pulse">
                              ⚠️ Vượt định mức: +{formatVND(line.giftCogsGap)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-slate-400">Không tặng quà</span>
                      )}
                    </td>

                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.fixedFee)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.infraFee)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.paymentFee)}</td>
                    
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">
                      {activePlatform === 'tiktok' ? formatVND(line.cfFee) : formatVND(line.voucherXtra)}
                      {activePlatform !== 'tiktok' && line.voucherXtra === feeConfigs.voucherXtraCap && <span className="text-[8px] bg-amber-50 rounded text-amber-700 p-0.5 font-bold font-mono block">CAPPED</span>}
                    </td>

                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.commission)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.ffmFee)}</td>
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">{formatVND(line.returnFee)}</td>
                    
                    <td className="py-3 px-3 border-r border-slate-150 font-mono text-right text-slate-500">
                      {formatVND(line.platformVoucherCost)}
                      {line.platformVoucherCost === feeConfigs.platformVoucherCap && <span className="text-[8px] bg-amber-50 rounded text-amber-700 p-0.5 font-bold font-mono block">CAPPED</span>}
                    </td>

                    <td className="py-3 px-3 border-r border-slate-200 font-mono font-extrabold text-emerald-700 text-right bg-emerald-50/10">{formatVND(line.netPool)}</td>
                    
                    {/* Buyer Price final payout reference */}
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-right text-slate-800 bg-slate-50/80">
                      <div className="font-bold">{formatVND(line.customerBuyPrice)}</div>
                      {line.rsp > 0 && (
                        <div className="mt-1">
                          <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 inline-block leading-none" title="Tỉ lệ phần trăm giảm giá so với giá RSP niêm yết gốc">
                            giảm {(((line.rsp - line.customerBuyPrice) / line.rsp) * 100).toFixed(1)}% vs RSP
                          </span>
                        </div>
                      )}
                    </td>
                    
                    <td className="py-3 px-3 border-r border-slate-200 text-center bg-slate-50/40">
                      <span className="font-mono font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                        {line.percentageGM.toFixed(0)}%
                      </span>
                    </td>
                    
                    <td className="py-3 px-4 text-center">
                      <span className={`font-mono font-extrabold px-2 py-0.5 rounded-lg border ${
                        line.percentageNM >= 15 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : line.percentageNM >= 0 
                            ? 'bg-amber-100 text-amber-800 border-amber-200' 
                            : 'bg-rose-100 text-rose-800 border-rose-220'
                      }`}>
                        {line.percentageNM.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* 4. Elegant Overlay Drawer/Modal to Select Gift with Budget Indicator */}
      {giftPickerOpen && activeLineMetrics && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 bg-slate-950/65 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-3xl max-w-6xl w-full h-[85vh] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/60 transition-all">
            {/* Modal Header & Search */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-sans font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Gift className="text-indigo-600" size={18} /> Lựa chọn Quà Tặng Cho Sản Phẩm
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Giá bán hiện tại: <strong className="text-slate-800">{formatVND(activeLineMetrics.basePrice)}</strong> | Ngân sách quà {formatFeeConfigLabel(feeConfigs.giftQuota)} định mức an toàn: <strong className="text-teal-600 font-mono">{formatVND(activeLineMetrics.giftAllowance)}</strong>
                  </p>
                </div>
                
                {/* Search Box */}
                <div className="flex-1 max-w-md relative">
                  <input 
                    type="text"
                    value={giftSearchTerm}
                    onChange={(e) => setGiftSearchTerm(e.target.value)}
                    placeholder="Tìm kiếm: Tên, mã SKU phân loại quà..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-3.5 pr-8 text-xs font-sans placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                  />
                  {giftSearchTerm && (
                    <button 
                      onClick={() => setGiftSearchTerm('')}
                      className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setGiftPickerOpen(false);
                    setGiftSearchTerm('');
                  }}
                  className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 p-2 rounded-xl transition shrink-0 uppercase self-end md:self-auto"
                >
                  Đóng ✕
                </button>
              </div>

              {/* Segmented Budget Filters */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-200/60">
                <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-xl border border-slate-200/50 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setGiftBudgetFilter('all')}
                    className={`cursor-pointer px-4.5 py-1.5 text-xs font-bold rounded-lg transition-all flex-1 sm:flex-none ${
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
                    className={`cursor-pointer px-4.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none ${
                      giftBudgetFilter === 'suitable'
                        ? 'bg-emerald-600 text-white shadow-3xs'
                        : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${giftBudgetFilter === 'suitable' ? 'bg-white' : 'bg-emerald-500'}`}></span>
                    Phù hợp định mức
                  </button>
                  <button
                    type="button"
                    onClick={() => setGiftBudgetFilter('exceeded')}
                    className={`cursor-pointer px-4.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none ${
                      giftBudgetFilter === 'exceeded'
                        ? 'bg-rose-600 text-white shadow-3xs'
                        : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${giftBudgetFilter === 'exceeded' ? 'bg-white' : 'bg-rose-500'}`}></span>
                    Vượt định mức
                  </button>
                </div>

                <div className="text-[11px] text-slate-450 font-medium font-sans">
                  {giftBudgetFilter === 'suitable' && "Chỉ hiển thị quà tặng có Cost vốn ≤ " + formatVND(activeLineMetrics.giftAllowance)}
                  {giftBudgetFilter === 'exceeded' && "Chỉ hiển thị quà tặng có phân loại vượt " + formatVND(activeLineMetrics.giftAllowance)}
                  {giftBudgetFilter === 'all' && "Hiển thị đầy đủ danh sách quà tặng Inochi"}
                </div>
              </div>

            </div>

            {/* Modal Two-Panel Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50/30">
              
              {/* Left Pane: Gift Groups List */}
              <div className="w-full md:w-[350px] shrink-0 border-r border-slate-200/60 bg-white flex flex-col h-[200px] md:h-full min-h-0">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-150/80 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>Nhóm quà ({filteredGroupedGifts.length})</span>
                  <span className="text-[9px] text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded-full lowercase normal-case">xem phân loại</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-350 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {/* Option to clear gift pairs, placed at top of list */}
                  <div 
                    onClick={() => {
                      handleSelectGift(null);
                      setGiftSearchTerm('');
                    }}
                    className={`cursor-pointer border border-dashed rounded-xl p-3 flex items-center gap-2.5 transition duration-150 ${
                      activeLine.selectedGifts?.length === 0 || !activeLine.selectedGifts
                        ? 'bg-rose-50 border-rose-450 ring-1 ring-rose-300 text-rose-700'
                        : 'bg-white border-rose-300 hover:border-rose-450 hover:bg-rose-50/20 text-slate-600 hover:text-rose-600'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-black text-rose-750">✕</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-xs text-rose-600 block">Không áp dụng quà tặng</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Tối ưu biên phần trăm net</span>
                    </div>
                  </div>

                  {filteredGroupedGifts.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <span className="block text-xs font-semibold">Không tìm thấy nhóm quà</span>
                    </div>
                  ) : (
                    filteredGroupedGifts.map((item) => {
                      const isSelected = currentGroup && currentGroup.mainSku === item.mainSku;
                      const minCogs = Math.min(...item.variants.map(v => v.cogs));
                      const maxCogs = Math.max(...item.variants.map(v => v.cogs));
                      const titleName = item.variants[0]?.name || item.mainSku;
                      
                      // Calculate total inventory of all variants of this group
                      const groupStockTotal = item.variants.reduce((acc, v) => {
                        const matching = stockRecords ? stockRecords.filter(s => s.skuPhanLoai === v.skuPhanLoai) : [];
                        return acc + matching.reduce((sum, s) => sum + s.quantity, 0);
                      }, 0);

                      const isGroupOutOfStock = stockRecords && groupStockTotal === 0;

                      return (
                        <div
                          key={item.mainSku}
                          onClick={() => setSelectedGiftGroupSku(item.mainSku)}
                          className={`cursor-pointer p-2.5 rounded-xl border flex gap-3 items-center transition duration-150 ${
                            isGroupOutOfStock
                              ? isSelected
                                ? 'bg-rose-50/35 border-rose-500 ring-1 ring-rose-450'
                                : 'bg-rose-50/15 border-rose-250 hover:border-rose-400 hover:bg-rose-50/25'
                              : isSelected 
                                ? 'bg-indigo-50/40 border-indigo-600 ring-1 ring-indigo-500' 
                                : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                          }`}
                        >
                          <div 
                            className="w-11 h-11 rounded-lg border border-slate-150 overflow-hidden shrink-0 flex items-center justify-center bg-white shadow-3xs cursor-zoom-in"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (typeof window !== 'undefined' && window.showImagePreview) {
                                window.showImagePreview(item.img || "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=600");
                              }
                            }}
                          >
                            <img 
                              src={item.img || "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=60"} 
                              alt={item.mainSku}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=60";
                              }}
                            />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[8px] font-black text-indigo-700 font-mono tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded block uppercase leading-none">
                                {item.mainSku}
                              </span>
                              <div className="flex items-center gap-1">
                                {isGroupOutOfStock && (
                                  <span className="text-[7.5px] font-black font-sans uppercase leading-none bg-rose-600 text-white px-1 py-0.5 rounded shrink-0">
                                    tồn = 0
                                  </span>
                                )}
                                <span className="text-[9px] bg-slate-100 text-slate-550 rounded px-1.5 py-0.2 font-sans font-extrabold leading-none">
                                  {item.variants.length} mã
                                </span>
                              </div>
                            </div>
                            <h5 className="font-extrabold text-slate-800 text-[11px] mt-1 truncate leading-snug text-left">
                              {titleName}
                            </h5>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[9px] leading-none">
                              <span className="text-slate-450 font-mono font-bold block">
                                Cost: {minCogs === maxCogs ? formatVND(minCogs) : `${formatVND(minCogs)} - ${formatVND(maxCogs)}`}
                              </span>
                              {stockRecords && (
                                <span className={`px-1 rounded-sm font-sans font-extrabold leading-none text-[8.5px] py-0.5 shrink-0 ${groupStockTotal > 0 ? 'bg-teal-50 text-teal-700 font-bold border border-teal-150' : 'bg-rose-50 text-rose-600 font-bold border border-rose-150'}`}>
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

              {/* Right Pane: Variants List for the Selected Group */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-50/30">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 hover:[&::-webkit-scrollbar-thumb]:bg-slate-350 [&::-webkit-scrollbar-thumb]:rounded-full bg-slate-50/50">
                {currentGroup ? (
                  <div className="space-y-4">
                    {/* Selected Group Header Summary */}
                    <div className="bg-white border border-slate-200/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
                      <div className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-xl border border-slate-150 overflow-hidden bg-white shrink-0 flex items-center justify-center cursor-zoom-in">
                          <img 
                            src={currentGroup.img} 
                            alt={currentGroup.mainSku}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onClick={() => {
                              if (typeof window !== 'undefined' && window.showImagePreview) {
                                window.showImagePreview(currentGroup.img);
                              }
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=100";
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wide">
                              {currentGroup.category || 'Quà tặng'}
                            </span>
                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                              SKU Gốc: {currentGroup.mainSku}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                            {currentGroup.variants[0]?.name || currentGroup.mainSku}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-sans font-medium">
                            Tăng giảm số lượng hoặc bật/tắt từng phân loại quà cụ thể bên dưới theo định mức quỹ an toàn.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] uppercase font-black tracking-wide text-slate-505 pl-1 flex justify-between items-center">
                      <span>Cơ cấu các phân loại của sản phẩm ({currentGroup.variants.length})</span>
                      {stockRecords && (
                        <span className="text-[9px] text-teal-700 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded font-bold">
                          Đã liên kết tồn kho miền bắc/nam
                        </span>
                      )}
                    </div>

                    {/* Highly polished, responsive vertical list of variants */}
                    <div className="space-y-3">
                      {currentGroup.variants.map((variant, vIdx) => {
                        const budgetLimit = calculateValue(feeConfigs.giftQuota, activeLineMetrics.basePrice);
                        const isUnderQuota = variant.cogs <= budgetLimit;
                        const gapAmt = variant.cogs - budgetLimit;
                        
                        // Active selected qty in current line
                        const activeQty = activeLine.selectedGifts?.find(g => g.product.skuPhanLoai === variant.skuPhanLoai)?.quantity || 0;

                        // Calculate detailed inventory
                        const matching = stockRecords ? stockRecords.filter(s => s.skuPhanLoai === variant.skuPhanLoai) : [];
                        const totalStock = matching.reduce((sum, s) => sum + s.quantity, 0);
                        const isOutOfStock = stockRecords && totalStock === 0;

                        return (
                          <div
                            key={vIdx}
                            className={`bg-white border rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 transition-all duration-200 shadow-3xs ${
                              isOutOfStock
                                ? 'border-rose-450 ring-2 ring-rose-100/70 bg-rose-50/5'
                                : activeQty > 0 
                                  ? 'border-indigo-500 ring-2 ring-indigo-50/70 bg-indigo-50/5'
                                  : 'border-slate-200/80 hover:border-indigo-400/80 hover:shadow-2xs'
                            }`}
                          >
                            {/* Variant Info */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm leading-tight block">
                                  {variant.name}
                                </span>
                                {isOutOfStock && (
                                  <span className="text-[8px] font-black font-sans uppercase leading-none bg-rose-600 text-white border border-rose-750 px-1.5 py-0.5 rounded shrink-0 animate-pulse">
                                    tồn = 0
                                  </span>
                                )}
                                {isUnderQuota ? (
                                  <span className="text-[8px] font-black font-sans uppercase leading-none bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded shrink-0">
                                    Đạt định mức
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black font-sans uppercase leading-none bg-rose-50 text-rose-700 border border-rose-150 px-1.5 py-0.5 rounded shrink-0" title={`Vượt định mức ${formatVND(gapAmt)}`}>
                                    Vượt mốc +{formatVND(gapAmt)}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                                <span className="font-mono text-slate-400">SKU: <strong className="text-slate-700 font-bold tracking-wider">{variant.skuPhanLoai}</strong></span>
                                {(variant.size || variant.color) && (
                                  <>
                                    <span className="text-slate-355 text-[6px]">•</span>
                                    <span className="text-indigo-800 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.2 font-sans font-extrabold text-[9px]">
                                      {[variant.size, variant.color].filter(Boolean).join(' - ')}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-2 font-medium">
                                <span>RSP Hãng: <span className="line-through">{formatVND(variant.rsp)}</span> (0đ, không tính)</span>
                              </div>
                            </div>

                            {/* Stock status side-by-side */}
                            {stockRecords && (
                              (() => {
                                const matching = stockRecords.filter(s => s.skuPhanLoai === variant.skuPhanLoai);
                                const total = matching.reduce((sum, s) => sum + s.quantity, 0);
                                const south = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                                const north = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                                return (
                                  <div className="shrink-0 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-150/50 flex flex-col justify-center min-w-[135px] text-center">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Tồn kho thực tế</span>
                                    {total > 0 ? (
                                      <div className="mt-1">
                                        <div className="text-[12px] font-black text-teal-850 leading-none">
                                          Tổng: {total} chiếc
                                        </div>
                                        <div className="text-[8px] text-slate-400 font-mono mt-1 font-bold flex justify-between gap-1 border-t border-slate-200/50 pt-1">
                                          <span>Bắc: {north}</span>
                                          <span>•</span>
                                          <span>Nam: {south}</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] font-black text-rose-625 mt-0.5 leading-none">Hết hàng (0)</span>
                                    )}
                                  </div>
                                );
                              })()
                            )}

                            {/* Cost Price & Controls */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-slate-100 shrink-0 min-w-[175px]">
                              <div className="text-left sm:text-right">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Cost Vốn COGS</span>
                                <span className={`text-xs font-black font-mono block leading-none mt-1 ${isUnderQuota ? 'text-slate-800' : 'text-rose-600'}`}>
                                  {formatVND(variant.cogs)}
                                </span>
                              </div>

                              {/* Simple Quantity Toggles with smooth animation background */}
                              {activeQty > 0 ? (
                                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl p-1 shadow-3xs">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrUpdateGift(variant, -1)}
                                    className="cursor-pointer w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black bg-white shadow-3xs border border-indigo-200 text-indigo-755 hover:bg-indigo-50 transition active:scale-95"
                                  >
                                    -
                                  </button>
                                  <span className="w-4.5 text-center font-mono font-extrabold text-[12px] text-indigo-950 selection:bg-transparent">
                                    {activeQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOrUpdateGift(variant, 1)}
                                    className="cursor-pointer w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black bg-white shadow-3xs border border-indigo-200 text-indigo-755 hover:bg-indigo-50 transition active:scale-95"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleOrUpdateGift(variant, 1)}
                                  className={`cursor-pointer px-4 py-1.5 rounded-xl border font-sans font-bold text-xs transition duration-150 active:scale-95 flex items-center gap-1.5 ${
                                    isUnderQuota
                                      ? 'bg-indigo-600 hover:bg-indigo-750 text-white border-transparent shadow-3xs hover:shadow-2xs'
                                      : 'bg-white hover:bg-rose-50/20 text-rose-625 border-rose-200 hover:border-rose-450'
                                  }`}
                                >
                                  <Gift size={13} /> {isUnderQuota ? 'Chọn quà' : 'Vẫn chọn'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16 text-slate-400">
                    <Gift size={36} className="text-slate-300 animate-pulse" />
                    <span className="block text-xs font-sans font-bold mt-2">Vui lòng chọn một nhóm quà ở thanh danh mục phía trên</span>
                    <span className="text-[10px] mt-1 block">Tất cả thông tin chi tiết và phân loại của nhóm quà sẽ hiển thị tại đây</span>
                  </div>
                )}
              </div>
              
            </div>

          </div>

          {/* Sticky bottom modal action and summary footer */}
            <div className="px-6 py-4.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                  <span>Tổng số mặt hàng quà: <strong className="text-slate-800 font-mono">{(activeLine.selectedGifts || []).reduce((acc, item) => acc + item.quantity, 0)} sản phẩm</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeLineMetrics.isGiftUnsuitable ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span>Tổng giá COGS quà: <strong className={`${activeLineMetrics.isGiftUnsuitable ? 'text-rose-600' : 'text-emerald-600'} font-mono`}>{formatVND(activeLineMetrics.actualGiftCogs)}</strong></span>
                </div>
                <div className="text-[11px] text-slate-400">
                  (Định mức Quỹ: <strong className="text-slate-600 font-mono">{formatVND(activeLineMetrics.giftAllowance)}</strong>)
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto self-end shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectGift(null);
                  }}
                  className="cursor-pointer text-xs font-bold text-rose-650 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 py-2.5 px-4 rounded-xl transition w-full sm:w-auto text-center"
                >
                  Xoá tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGiftPickerOpen(false);
                    setGiftSearchTerm('');
                  }}
                  className="cursor-pointer text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-2.5 px-6 rounded-xl shadow-xs transition w-full sm:w-auto text-center font-sans tracking-wide uppercase"
                >
                  Hoàn thành ➔
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
