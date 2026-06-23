import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { MainProduct, CogsProduct, StockRecord, ShopVoucher } from '../types';
import ProductCogsBadgeList from './ProductCogsBadgeList';
import { 
  Calculator, Settings, Gift, Eye, Search, Sparkles, Filter, ChevronDown, ChevronUp, 
  Plus, Minus, Trash2, Percent, DollarSign, CornerDownRight, AlertCircle, CheckCircle, 
  Info, RefreshCw, SlidersHorizontal, ArrowUpDown, FileSpreadsheet, X
} from 'lucide-react';

interface SelectedGiftItem {
  product: CogsProduct;
  quantity: number;
}

// State structure for each main product's detailed simulated setup
interface BulkSimLine {
  selectedPriceType: 'rsp' | 'minPrice' | 'kolPrice' | 'spike' | 'miniSpike' | 'bau' | 'custom' | 'backupSpike' | 'backupMiniSpike' | 'backupBau' | 'huntingSpike' | 'huntingMiniSpike';
  customPrice: number;
  userVoucherPct: number;
  userVoucherType: 'percent' | 'value';
  userVoucherVal: number;
  selectedGifts: SelectedGiftItem[];
  voucherMode: 'auto' | 'manual' | 'custom' | 'none';
  selectedVoucherId?: string;
}

interface MainBulkPricingProps {
  shopeeProducts: MainProduct[];
  cogsProducts: CogsProduct[];
  stockRecords: StockRecord[];
  shopVouchersState: ShopVoucher[];
  setShopVouchersState: React.Dispatch<React.SetStateAction<ShopVoucher[]>>;
  shopeeFeeConfigsState: any;
  setShopeeFeeConfigsState: React.Dispatch<React.SetStateAction<any>>;
}

export default function MainBulkPricing({
  shopeeProducts,
  cogsProducts,
  stockRecords,
  shopVouchersState,
  setShopVouchersState,
  shopeeFeeConfigsState,
  setShopeeFeeConfigsState
}: MainBulkPricingProps) {
  
  // Helper to format campaign labels nicely
  const getCampaignLabel = (type: string) => {
    switch (type) {
      case 'bau': return 'BAU';
      case 'miniSpike': return 'MINISPIKE';
      case 'spike': return 'SPIKE';
      case 'backupSpike': return 'BACKUP SPIKE';
      case 'backupMiniSpike': return 'BACKUP MINISPIKE';
      case 'backupBau': return 'BACKUP BAU';
      case 'kolPrice': return 'KOL LIVE';
      case 'huntingSpike': return 'HUNTING SPIKE';
      case 'huntingMiniSpike': return 'HUNTING MINISPIKE';
      case 'minPrice': return 'MINPRICE';
      case 'rsp': return 'RSP';
      case 'custom': return 'Tùy chỉnh';
      default: return type.toUpperCase();
    }
  };

  // Local active product selection
  const [selectedVpCode, setSelectedVpCode] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search and budget filter for main list
  const [searchQuery, setSearchQuery] = useState('');
  const [marginFilter, setMarginFilter] = useState<'all' | 'profitable' | 'marginal' | 'unprofitable' | 'unconfigured'>('all');

  // Search and budget filter for GMD gifts search
  const [giftQuery, setGiftQuery] = useState('');
  const [giftCategory, setGiftCategory] = useState<string>('all');

  // Expandable sections
  const [showSyncConfig, setShowSyncConfig] = useState(false);

  // Core Simulation Cache (stores the simulation state for each vpCode)
  const [bulkCache, setBulkCache] = useState<Record<string, BulkSimLine>>(() => {
    // Attempt local storage recall
    try {
      const saved = localStorage.getItem('inochi_bulk_calc_cache_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Storage read failure", e);
    }
    return {};
  });

  // Persist calculations to localStorage
  useEffect(() => {
    localStorage.setItem('inochi_bulk_calc_cache_v1', JSON.stringify(bulkCache));
  }, [bulkCache]);

  // List of actual clean Inochi Gift Products
  const inochiGifts = useMemo(() => {
    return cogsProducts.filter(p => {
      const isAppliance = p.name.includes("Nồi chiên") || p.name.includes("Cơm điện") || p.name.includes("Máy rửa rau");
      return !isAppliance && p.cogs > 0;
    });
  }, [cogsProducts]);

  // Unique categories of gifts
  const giftCategories = useMemo(() => {
    const cats = new Set<string>();
    inochiGifts.forEach(g => {
      if (g.category) cats.add(g.category);
    });
    return Array.from(cats);
  }, [inochiGifts]);

  // Auto-init matching gifts for all loaded products on mount/change
  useEffect(() => {
    if (shopeeProducts.length === 0 || inochiGifts.length === 0) return;
    
    setBulkCache(prev => {
      const updated = { ...prev };
      let updatedAny = false;

      shopeeProducts.forEach(p => {
        if (!updated[p.vpCode]) {
          // Attempt auto matching gifts
          const matchedGifts = inochiGifts.filter(g => {
            const mainSkuClean = g.mainSku?.trim().toLowerCase();
            if (!mainSkuClean) return false;
            return (
              mainSkuClean === p.vpCode.trim().toLowerCase() ||
              mainSkuClean === p.name.trim().toLowerCase() ||
              p.name.toLowerCase().includes(mainSkuClean) ||
              mainSkuClean.includes(p.vpCode.trim().toLowerCase())
            );
          }).map(g => ({
            product: g,
            quantity: 1
          }));

          updated[p.vpCode] = {
            selectedPriceType: 'minPrice',
            customPrice: p.minPrice || 0,
            userVoucherPct: 0,
            userVoucherType: 'percent',
            userVoucherVal: 0,
            selectedGifts: matchedGifts,
            voucherMode: 'auto',
            selectedVoucherId: '',
          };
          updatedAny = true;
        }
      });

      if (updatedAny) {
        return updated;
      }
      return prev;
    });

    // Pick first product as default selected
    if (!selectedVpCode && shopeeProducts.length > 0) {
      setSelectedVpCode(shopeeProducts[0].vpCode);
    }
  }, [shopeeProducts, inochiGifts, selectedVpCode]);

  // Helper helper to format VND
  const formatVND = (v: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(Math.round(v))
      .replace('₫', 'đ');
  };

  // Safe percentage helper
  const calculateValue = (feeItem: { type: 'percent' | 'value'; val: number } | number | undefined, basePriceVal: number, capAmt?: number) => {
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

  // Helper to fetch product image via classificação SKU code
  const getProductImage = (sku?: string) => {
    if (!sku) return null;
    const cleanSku = sku.trim();
    const cogsProduct = cogsProducts?.find(p => p.skuPhanLoai?.trim() === cleanSku);
    if (cogsProduct?.img) return cogsProduct.img;
    const mainProduct = shopeeProducts?.find(p => p.vpCode?.trim() === cleanSku);
    if (mainProduct?.img) return mainProduct.img;
    return null;
  };

  // Compute calculated values for ALL shopeeProducts
  const calculatedRows = useMemo(() => {
    return shopeeProducts.map(p => {
      // Fetch simulated parameters
      const line = bulkCache[p.vpCode] || {
        selectedPriceType: 'minPrice',
        customPrice: p.minPrice,
        userVoucherPct: 0,
        userVoucherType: 'percent',
        userVoucherVal: 0,
        selectedGifts: [],
        voucherMode: 'auto',
        selectedVoucherId: '',
      };

      // Base price evaluation
      let basePrice = p.minPrice;
      if (line.selectedPriceType === 'custom') {
        basePrice = line.customPrice;
      } else if (line.selectedPriceType === 'rsp') {
        basePrice = p.rsp;
      } else if (line.selectedPriceType === 'minPrice') {
        basePrice = p.minPrice;
      } else if (line.selectedPriceType === 'kolPrice') {
        basePrice = p.kolPrice;
      } else if (line.selectedPriceType === 'spike') {
        basePrice = p.spike;
      } else if (line.selectedPriceType === 'miniSpike') {
        basePrice = p.miniSpike;
      } else if (line.selectedPriceType === 'bau') {
        basePrice = p.bau;
      } else if (line.selectedPriceType === 'backupSpike') {
        basePrice = p.spike;
      } else if (line.selectedPriceType === 'backupMiniSpike') {
        basePrice = p.miniSpike;
      } else if (line.selectedPriceType === 'backupBau') {
        basePrice = p.bau;
      } else if (line.selectedPriceType === 'huntingSpike') {
        basePrice = p.spike;
      } else if (line.selectedPriceType === 'huntingMiniSpike') {
        basePrice = p.miniSpike;
      }

      // 1. Voucher Shop computing
      const vMode = line.voucherMode || 'auto';
      let shopVoucherValue = 0;
      let appliedVoucherCode = "";

      if (vMode === 'auto') {
        const eligibleVouchers = shopVouchersState
          .filter(v => v.active && basePrice >= v.minSpent)
          .map(v => {
            let discount = 0;
            if (v.type === 'percent') {
              const rawDiscount = basePrice * (v.val / 100);
              discount = v.capVal > 0 ? Math.min(rawDiscount, v.capVal) : rawDiscount;
            } else {
              discount = v.val;
            }
            return { v, discount };
          })
          .sort((a, b) => b.discount - a.discount);

        if (eligibleVouchers.length > 0) {
          shopVoucherValue = eligibleVouchers[0].discount;
          appliedVoucherCode = eligibleVouchers[0].v.code;
        }
      } else if (vMode === 'manual' && line.selectedVoucherId) {
        const selectedV = shopVouchersState.find(v => v.id === line.selectedVoucherId);
        if (selectedV && basePrice >= selectedV.minSpent) {
          appliedVoucherCode = selectedV.code;
          if (selectedV.type === 'percent') {
            const rawDiscount = basePrice * (selectedV.val / 100);
            shopVoucherValue = selectedV.capVal > 0 ? Math.min(rawDiscount, selectedV.capVal) : rawDiscount;
          } else {
            shopVoucherValue = selectedV.val;
          }
        }
      } else if (vMode === 'custom') {
        const vVal = line.userVoucherVal || 0;
        shopVoucherValue = line.userVoucherType === 'percent' ? basePrice * (vVal / 100) : vVal;
        appliedVoucherCode = "Tùy chỉnh";
      }

      // Gifts COGS calculation
      const actualGiftCogs = line.selectedGifts.reduce((acc, g) => acc + (g.product.cogs * g.quantity), 0);
      const giftCogsLimit = calculateValue(shopeeFeeConfigsState.giftQuota, basePrice);

      // Shopee fee waterfall mapping
      const fixedFee = calculateValue(shopeeFeeConfigsState.fixedFee, basePrice);
      const infraFee = calculateValue(shopeeFeeConfigsState.infraFee, basePrice);
      const paymentFee = calculateValue(shopeeFeeConfigsState.paymentFee, basePrice);
      const voucherXtra = calculateValue(shopeeFeeConfigsState.voucherXtra, basePrice, shopeeFeeConfigsState.voucherXtraCap);
      const voucherSellerFee = shopeeFeeConfigsState.voucherSellerFeeActive
        ? calculateValue(shopeeFeeConfigsState.voucherSellerFee, basePrice, shopeeFeeConfigsState.voucherSellerFeeCap)
        : 0;
      const commission = calculateValue(shopeeFeeConfigsState.commission, basePrice);
      const ffmFee = calculateValue(shopeeFeeConfigsState.ffmFee, basePrice);
      const returnFee = calculateValue(shopeeFeeConfigsState.returnFee, basePrice);

      const platformBasePrice = Math.max(0, basePrice - shopVoucherValue);
      const platformVoucherCost = calculateValue(shopeeFeeConfigsState.platformVoucher, platformBasePrice, shopeeFeeConfigsState.platformVoucherCap);

      const totalFees = fixedFee + infraFee + paymentFee + voucherXtra + voucherSellerFee + commission + ffmFee + returnFee;

      // Net calculations
      const customerBuyPrice = basePrice - shopVoucherValue - platformVoucherCost;
      const netPool = basePrice - shopVoucherValue - totalFees - actualGiftCogs;
      const cogsUpdated = p.cogsUpdated || p.cogs;
      const netProfit = netPool - cogsUpdated;
      
      const percentageGM = basePrice > 0 ? ((basePrice - shopVoucherValue - actualGiftCogs - cogsUpdated) / basePrice) * 100 : 0;
      const percentageNM = netPool !== 0 ? ((netPool - cogsUpdated) / netPool) * 100 : 0;

      const isGiftUnsuitable = actualGiftCogs > giftCogsLimit;

      return {
        product: p,
        simConfig: line,
        basePrice,
        shopVoucherValue,
        appliedVoucherCode,
        actualGiftCogs,
        giftCogsLimit,
        fixedFee,
        infraFee,
        paymentFee,
        voucherXtra,
        voucherSellerFee,
        commission,
        ffmFee,
        returnFee,
        platformVoucherCost,
        totalFees,
        customerBuyPrice,
        netPool,
        netProfit,
        percentageGM,
        percentageNM,
        isGiftUnsuitable,
        cogsUpdated
      };
    });
  }, [shopeeProducts, bulkCache, shopVouchersState, shopeeFeeConfigsState]);

  // Filtered rows for displaying on left grid
  const filteredRows = useMemo(() => {
    return calculatedRows.filter(row => {
      // Keyword match
      const kw = searchQuery.toLowerCase().trim();
      const matchQuery = !kw || 
        row.product.name.toLowerCase().includes(kw) || 
        row.product.vpCode.toLowerCase().includes(kw) ||
        row.product.barcode.toLowerCase().includes(kw);

      if (!matchQuery) return false;

      // Margin filter
      if (marginFilter === 'profitable') {
        return row.percentageNM >= 10;
      } else if (marginFilter === 'marginal') {
        return row.percentageNM >= 0 && row.percentageNM < 10;
      } else if (marginFilter === 'unprofitable') {
        return row.percentageNM < 0;
      } else if (marginFilter === 'unconfigured') {
        return row.simConfig.selectedGifts.length === 0;
      }

      return true;
    });
  }, [calculatedRows, searchQuery, marginFilter]);

  // Active Selected Product Details (shown on the right details pane)
  const activeCalculatedRow = useMemo(() => {
    return calculatedRows.find(row => row.product.vpCode === selectedVpCode) || calculatedRows[0];
  }, [calculatedRows, selectedVpCode]);

  // Handle price tier change
  const handlePriceTypeChange = (type: any) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;
    
    setBulkCache(prev => {
      const entry = prev[vpCode];
      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedPriceType: type,
          customPrice: type === 'custom' ? (entry?.customPrice || activeCalculatedRow.product.minPrice) : activeCalculatedRow.basePrice
        }
      };
    });
  };

  // Handle specific row price tier/campaign change
  const handleRowPriceTypeChange = (vpCode: string, type: any) => {
    const prod = shopeeProducts.find(p => p.vpCode === vpCode);
    if (!prod) return;
    
    setBulkCache(prev => {
      const entry = prev[vpCode] || {
        selectedPriceType: 'minPrice',
        customPrice: prod.minPrice,
        userVoucherPct: 0,
        userVoucherType: 'percent',
        userVoucherVal: 0,
        selectedGifts: [],
        voucherMode: 'auto',
        selectedVoucherId: '',
      };
      
      let targetPrice = prod.minPrice;
      if (type === 'custom') {
        targetPrice = entry.customPrice || prod.minPrice;
      } else if (type === 'rsp') {
        targetPrice = prod.rsp;
      } else if (type === 'minPrice') {
        targetPrice = prod.minPrice;
      } else if (type === 'kolPrice') {
        targetPrice = prod.kolPrice;
      } else if (type === 'spike') {
        targetPrice = prod.spike;
      } else if (type === 'miniSpike') {
        targetPrice = prod.miniSpike;
      } else if (type === 'bau') {
        targetPrice = prod.bau;
      } else if (type === 'backupSpike') {
        targetPrice = prod.spike;
      } else if (type === 'backupMiniSpike') {
        targetPrice = prod.miniSpike;
      } else if (type === 'backupBau') {
        targetPrice = prod.bau;
      } else if (type === 'huntingSpike') {
        targetPrice = prod.spike;
      } else if (type === 'huntingMiniSpike') {
        targetPrice = prod.miniSpike;
      }

      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedPriceType: type,
          customPrice: targetPrice
        }
      };
    });
  };

  // Handle global campaign type change for all products
  const handleGlobalPriceTypeChange = (type: any) => {
    setBulkCache(prev => {
      const updated = { ...prev };
      shopeeProducts.forEach(prod => {
        const vpCode = prod.vpCode;
        const entry = updated[vpCode] || {
          selectedPriceType: 'minPrice',
          customPrice: prod.minPrice,
          userVoucherPct: 0,
          userVoucherType: 'percent',
          userVoucherVal: 0,
          selectedGifts: [],
          voucherMode: 'auto',
          selectedVoucherId: '',
        };

        let targetPrice = prod.minPrice;
        if (type === 'custom') {
          targetPrice = entry.customPrice || prod.minPrice;
        } else if (type === 'rsp') {
          targetPrice = prod.rsp;
        } else if (type === 'minPrice') {
          targetPrice = prod.minPrice;
        } else if (type === 'kolPrice') {
          targetPrice = prod.kolPrice;
        } else if (type === 'spike') {
          targetPrice = prod.spike;
        } else if (type === 'miniSpike') {
          targetPrice = prod.miniSpike;
        } else if (type === 'bau') {
          targetPrice = prod.bau;
        } else if (type === 'backupSpike') {
          targetPrice = prod.spike;
        } else if (type === 'backupMiniSpike') {
          targetPrice = prod.miniSpike;
        } else if (type === 'backupBau') {
          targetPrice = prod.bau;
        } else if (type === 'huntingSpike') {
          targetPrice = prod.spike;
        } else if (type === 'huntingMiniSpike') {
          targetPrice = prod.miniSpike;
        }

        updated[vpCode] = {
          ...entry,
          selectedPriceType: type,
          customPrice: targetPrice
        };
      });
      return updated;
    });
  };

  // Handle custom price change
  const handleCustomPriceChange = (val: number) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;
    setBulkCache(prev => {
      const entry = prev[vpCode];
      return {
        ...prev,
        [vpCode]: {
          ...entry,
          customPrice: val
        }
      };
    });
  };

  // Handle gift insertion/addition
  const handleAddGift = (id: string) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;
    const giftProduct = inochiGifts.find(g => g.skuPhanLoai === id);
    if (!giftProduct) return;

    setBulkCache(prev => {
      const entry = prev[vpCode] || {
        selectedPriceType: 'minPrice',
        customPrice: activeCalculatedRow.product.minPrice,
        userVoucherPct: 0,
        userVoucherType: 'percent',
        userVoucherVal: 0,
        selectedGifts: [],
        voucherMode: 'auto',
      };

      const existingItem = entry.selectedGifts.find(g => g.product.skuPhanLoai === id);
      let updatedGifts: SelectedGiftItem[];

      if (existingItem) {
        updatedGifts = entry.selectedGifts.map(g => 
          g.product.skuPhanLoai === id ? { ...g, quantity: g.quantity + 1 } : g
        );
      } else {
        updatedGifts = [...entry.selectedGifts, { product: giftProduct, quantity: 1 }];
      }

      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedGifts: updatedGifts
        }
      };
    });
  };

  // Modify gift quantity
  const handleGiftQtyChange = (id: string, delta: number) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;

    setBulkCache(prev => {
      const entry = prev[vpCode];
      if (!entry) return prev;

      const updatedGifts = entry.selectedGifts.map(g => {
        if (g.product.skuPhanLoai === id) {
          const nQty = Math.max(1, g.quantity + delta);
          return { ...g, quantity: nQty };
        }
        return g;
      });

      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedGifts: updatedGifts
        }
      };
    });
  };

  // Remove gift selection
  const handleRemoveGift = (id: string) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;

    setBulkCache(prev => {
      const entry = prev[vpCode];
      if (!entry) return prev;

      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedGifts: entry.selectedGifts.filter(g => g.product.skuPhanLoai !== id)
        }
      };
    });
  };

  // Modify Voucher Mode
  const handleVoucherModeChange = (mode: 'auto' | 'manual' | 'custom' | 'none') => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;

    setBulkCache(prev => {
      const entry = prev[vpCode];
      return {
        ...prev,
        [vpCode]: {
          ...entry,
          voucherMode: mode,
          selectedVoucherId: mode === 'manual' ? (shopVouchersState.find(v => v.active)?.id || '') : entry?.selectedVoucherId
        }
      };
    });
  };

  // Map manual selected voucher
  const handleManualVoucherChange = (vId: string) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;
    setBulkCache(prev => {
      const entry = prev[vpCode];
      return {
        ...prev,
        [vpCode]: {
          ...entry,
          selectedVoucherId: vId
        }
      };
    });
  };

  // Modify Custom Voucher configuration fields
  const handleCustomVoucherChange = (type: 'percent' | 'value', val: number) => {
    if (!activeCalculatedRow) return;
    const vpCode = activeCalculatedRow.product.vpCode;
    setBulkCache(prev => {
      const entry = prev[vpCode];
      return {
        ...prev,
        [vpCode]: {
          ...entry,
          userVoucherType: type,
          userVoucherVal: val
        }
      };
    });
  };

  // Clean formatted parsing helper for numeric inputs
  const parseNumberInput = (vStr: string) => {
    const num = parseInt(vStr.replace(/[^0-9]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  // Filter gift search results based on input
  const searchedGifts = useMemo(() => {
    return inochiGifts.filter(g => {
      const kw = giftQuery.toLowerCase();
      const matchesSearch = !kw || g.name.toLowerCase().includes(kw) || g.skuPhanLoai.toLowerCase().includes(kw);
      const matchesCat = giftCategory === 'all' || g.category === giftCategory;
      return matchesSearch && matchesCat;
    });
  }, [inochiGifts, giftQuery, giftCategory]);

  // Export calculated main products list to Excel (.xlsx)
  const handleExportExcel = () => {
    if (calculatedRows.length === 0) return;

    const headers = [
      'Mã VP (VP Code)', 
      'Tên Sản Phẩm', 
      'Loại dòng', 
      'Giá Bán Thấp Nhất (Base Price)', 
      'Gói Voucher Shop Áp Dụng', 
      'Giá Trị Voucher Shop', 
      'COGS Sản Phẩm', 
      'Tổng COGS Quà Tặng', 
      'Phí Cố Định Shopee', 
      'Phí Cơ Sở FFM', 
      'Phí Thanh Toán', 
      'Voucher X-tra/Freeship X-tra', 
      'Phí Hoa Hồng', 
      'Phí Vận Hành', 
      'Dự Phòng Hoàn Hàng', 
      'TỔNG PHÍ SÀN', 
      'NET POOL (Doanh Thu Thuần)', 
      'LỢI NHUẬN THUẦN', 
      'BIÊN GỘP %GM', 
      'BIÊN RÒNG %NM'
    ];

    const dataRows: any[][] = [headers];

    calculatedRows.forEach(row => {
      // 1. Main Product row
      dataRows.push([
        row.product.vpCode || "",
        row.product.name || "",
        'Sản phẩm chính',
        row.basePrice,
        row.appliedVoucherCode || "Không áp dụng",
        row.shopVoucherValue,
        row.cogsUpdated,
        row.actualGiftCogs,
        row.fixedFee,
        row.infraFee,
        row.paymentFee,
        row.voucherXtra,
        row.commission,
        row.ffmFee,
        row.returnFee,
        row.totalFees,
        row.netPool,
        row.netProfit,
        `${row.percentageGM.toFixed(1)}%`,
        `${row.percentageNM.toFixed(1)}%`
      ]);

      // 2. Nested Gifts of this main product campaign setup
      (row.simConfig.selectedGifts || []).forEach(gift => {
        dataRows.push([
          gift.product.skuPhanLoai || "",
          `  --> TẶNG KÈM: ${gift.product.name} (SL: ${gift.quantity})`,
          'Quà tặng',
          0,
          "",
          0,
          0,
          gift.product.cogs * gift.quantity,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          "-",
          "-"
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // Dynamic column widths
    const colWidths = headers.map((_, i) => {
      let maxLen = 12;
      dataRows.forEach(r => {
        const cellVal = r[i];
        if (cellVal !== undefined && cellVal !== null) {
          const s = String(cellVal);
          if (s.length > maxLen) maxLen = s.length;
        }
      });
      return { wch: Math.min(maxLen + 2, 55) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sản Phẩm Chính");
    XLSX.writeFile(wb, `Inochi_Danh_Ba_Tinh_Gia_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">

      {/* Banner Intro Tab */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-violet-750/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="bg-violet-500/20 text-violet-300 font-black text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-violet-500/30 inline-block">
              ⚡ Tải Đầy Đủ Danh Mục
            </span>
            <h2 className="text-xl font-extrabold tracking-tight font-sans">
              Bảng Tính Giá Toàn Bộ SP Main (Shopee)
            </h2>
            <p className="text-indigo-200/80 text-xs max-w-xl">
              Cổng quy hoạch trọn vẹn mọi dòng sản phẩm chính của hệ sinh thái Inochi. Chỉ cần nhấp chọn sản phẩm ở panel danh mục lớn để điều tiết giá bán thích hợp và phân bổ quà tặng COGS thông minh.
            </p>
          </div>

          <button
            onClick={() => setShowSyncConfig(!showSyncConfig)}
            className="cursor-pointer text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-100 font-extrabold px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition shrink-0 active:scale-98"
          >
            <SlidersHorizontal size={14} className="text-violet-400" />
            {showSyncConfig ? "Ẩn Phí sàn & Voucher toàn shop" : "Cấu hình Phí sàn & Vouchers ({0})"}
          </button>
        </div>
      </div>

      {/* EXPANDABLE COLLAPSIBLE PANEL FOR SYNCHRONIZED CORE SHOPEE FEETS & SHOP VOUCHERS */}
      {showSyncConfig && (
        <div className="bg-white border border-indigo-100 rounded-3xl p-5 shadow-md flex flex-col space-y-6 animate-fade-in">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 flex items-center gap-2">
                <Settings size={15} className="text-indigo-600 spin-slow" />
                Đồng bộ trung tâm chi phí sàn Shopee & Shop Vouchers
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                Các chỉnh sửa thông số tại đây sẽ <strong className="text-indigo-600 font-extrabold">ĐỒNG BỘ lập tức</strong> với Tab "Bảng tính giá chi tiết".
              </p>
            </div>
            <button 
              onClick={() => setShowSyncConfig(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-extrabold cursor-pointer"
            >
              Thu nhỏ ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Shopee Fee Column 1 */}
            <div className="space-y-3 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider block">1. Nhóm Phí cố định cố hữu</span>
              
              {/* Fixed Fee */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Phí cố định Shopee</span>
                  <span className="text-indigo-650 font-extrabold">
                    {shopeeFeeConfigsState.fixedFee.type === 'percent' ? `${shopeeFeeConfigsState.fixedFee.val}%` : formatVND(shopeeFeeConfigsState.fixedFee.val)}
                  </span>
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={shopeeFeeConfigsState.fixedFee.val}
                    onChange={(e) => {
                      const v = parseNumberInput(e.target.value);
                      setShopeeFeeConfigsState((prev: any) => ({
                        ...prev,
                        fixedFee: { ...prev.fixedFee, val: prev.fixedFee.type === 'percent' ? Math.min(100, v) : v }
                      }));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0 text-[10px] font-bold">
                    <button
                      onClick={() => setShopeeFeeConfigsState((prev: any) => ({ ...prev, fixedFee: { ...prev.fixedFee, type: 'percent', val: Math.min(100, prev.fixedFee.val) } }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${shopeeFeeConfigsState.fixedFee.type === 'percent' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => setShopeeFeeConfigsState((prev: any) => ({ ...prev, fixedFee: { ...prev.fixedFee, type: 'value' } }))}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${shopeeFeeConfigsState.fixedFee.type === 'value' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      đ
                    </button>
                  </div>
                </div>
              </div>

              {/* Commission fee */}
              <div className="space-y-1.5 mt-3">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Hoa hồng sàn (Commission)</span>
                  <span className="text-indigo-655 font-extrabold">{shopeeFeeConfigsState.commission.val}%</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={shopeeFeeConfigsState.commission.val}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setShopeeFeeConfigsState((prev: any) => ({
                        ...prev,
                        commission: { ...prev.commission, val: Math.min(100, Math.max(0, v)) }
                      }));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Shopee Fee Column 2 */}
            <div className="space-y-3 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black uppercase text-indigo-755 tracking-wider block">2. Nhóm Phí Giao dịch & Hạ tầng</span>

              {/* Payment fee */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Phí thanh toán cổng</span>
                  <span className="text-indigo-650 font-extrabold">{shopeeFeeConfigsState.paymentFee.val}%</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={shopeeFeeConfigsState.paymentFee.val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setShopeeFeeConfigsState((prev: any) => ({
                      ...prev,
                      paymentFee: { ...prev.paymentFee, val: Math.min(100, Math.max(0, v)) }
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold leading-tight font-mono"
                />
              </div>

              {/* Infra fee */}
              <div className="space-y-1.5 mt-3">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Phí chuyển phát hạ tầng</span>
                  <span className="text-indigo-650 font-extrabold font-mono">{formatVND(shopeeFeeConfigsState.infraFee.val)}</span>
                </label>
                <input
                  type="text"
                  value={shopeeFeeConfigsState.infraFee.val.toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const v = parseNumberInput(e.target.value);
                    setShopeeFeeConfigsState((prev: any) => ({
                      ...prev,
                      infraFee: { ...prev.infraFee, val: v }
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold leading-tight font-mono"
                />
              </div>
            </div>

            {/* Shopee Fee Column 3 */}
            <div className="space-y-3 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black uppercase text-indigo-755 tracking-wider block">3. Marketing & Logistic Co-pay</span>

              {/* Voucher Xtra */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Gói Voucher Xtra</span>
                  <span className="text-indigo-650 font-extrabold">{shopeeFeeConfigsState.voucherXtra.val}%</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={shopeeFeeConfigsState.voucherXtra.val}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0;
                      setShopeeFeeConfigsState((prev: any) => ({
                        ...prev,
                        voucherXtra: { ...prev.voucherXtra, val: Math.min(100, Math.max(0, v)) }
                      }));
                    }}
                    className="w-1/2 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Cap (đ)"
                    value={shopeeFeeConfigsState.voucherXtraCap.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const v = parseNumberInput(e.target.value);
                      setShopeeFeeConfigsState((prev: any) => ({
                        ...prev,
                        voucherXtraCap: v
                      }));
                    }}
                    className="w-1/2 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold font-mono text-right"
                    title="Capped discount amount"
                  />
                </div>
              </div>

              {/* Phí sử dụng Voucher */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60 mt-3">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between cursor-pointer select-none" htmlFor="shopee_bulk_voucher_seller">
                  <div className="flex items-center gap-1.5">
                    <input
                      id="shopee_bulk_voucher_seller"
                      type="checkbox"
                      checked={shopeeFeeConfigsState.voucherSellerFeeActive || false}
                      onChange={(e) => {
                        setShopeeFeeConfigsState((prev: any) => ({
                          ...prev,
                          voucherSellerFeeActive: e.target.checked
                        }));
                      }}
                      className="w-3.5 h-3.5 text-indigo-650 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer accent-indigo-600"
                    />
                    <span>Phí sử dụng Voucher</span>
                  </div>
                  {shopeeFeeConfigsState.voucherSellerFeeActive && (
                    <span className="text-indigo-650 font-extrabold">{(shopeeFeeConfigsState.voucherSellerFee?.val ?? 2.0)}%</span>
                  )}
                </label>
                {shopeeFeeConfigsState.voucherSellerFeeActive && (
                  <div className="flex gap-2 animate-fade-in">
                    <input
                      type="number"
                      step="0.1"
                      value={shopeeFeeConfigsState.voucherSellerFee?.val ?? 2.0}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value) || 0;
                        setShopeeFeeConfigsState((prev: any) => ({
                          ...prev,
                          voucherSellerFee: { ...(prev.voucherSellerFee || { type: 'percent', val: 2.0 }), val: Math.min(100, Math.max(0, v)) }
                        }));
                      }}
                      className="w-1/2 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Cap (đ)"
                      value={(shopeeFeeConfigsState.voucherSellerFeeCap ?? 50000).toLocaleString('vi-VN')}
                      onChange={(e) => {
                        const v = parseNumberInput(e.target.value);
                        setShopeeFeeConfigsState((prev: any) => ({
                          ...prev,
                          voucherSellerFeeCap: v
                        }));
                      }}
                      className="w-1/2 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold font-mono text-right"
                    />
                  </div>
                )}
              </div>

              {/* Warehouse FFM */}
              <div className="space-y-1.5 mt-3">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Phí kho bãi & đóng gói FFM</span>
                  <span className="text-indigo-650 font-bold">{shopeeFeeConfigsState.ffmFee.val}%</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={shopeeFeeConfigsState.ffmFee.val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setShopeeFeeConfigsState((prev: any) => ({
                      ...prev,
                      ffmFee: { ...prev.ffmFee, val: Math.min(100, Math.max(0, v)) }
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold font-mono"
                />
              </div>
            </div>

            {/* Shopee Fee Column 4 */}
            <div className="space-y-3 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-150">
              <span className="text-[10px] font-black uppercase text-indigo-755 tracking-wider block">4. Quỹ Hạn Mức Quà Tặng (Quota)</span>

              {/* Gift Quota limit  */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 flex justify-between">
                  <span>Hạn mức vốn tặng (% Đơn giá)</span>
                  <span className="text-rose-600 font-extrabold">{shopeeFeeConfigsState.giftQuota.val}%</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={shopeeFeeConfigsState.giftQuota.val}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setShopeeFeeConfigsState((prev: any) => ({
                      ...prev,
                      giftQuota: { ...prev.giftQuota, val: Math.min(100, Math.max(0, v)) }
                    }));
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2.5 text-xs font-bold font-mono"
                />
                <span className="text-[9px] text-slate-400 font-medium block">
                  Cơ sở cảnh báo nếu vốn quà tặng thực tế (GMD COGS) lớn hơn tỷ lệ này của giá bán.
                </span>
              </div>
            </div>
          </div>

          {/* Shopee Shop Vouchers Global List Editor */}
          <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-indigo-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                🎟️ QUẢN LÝ VOUCHER TOÀN GIAN HÀNG ({shopVouchersState.length})
              </span>
              <button
                onClick={() => {
                  const nId = `sv-${Date.now()}`;
                  const nVoucher: ShopVoucher = {
                    id: nId,
                    code: `INOCHI_VC_${shopVouchersState.length + 1}`,
                    type: 'percent',
                    val: 5,
                    minSpent: 200000,
                    capVal: 20000,
                    priority: shopVouchersState.length + 1,
                    active: true
                  };
                  setShopVouchersState([...shopVouchersState, nVoucher]);
                }}
                className="cursor-pointer text-[10px] bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold px-3 py-1.5 rounded-xl transition flex items-center gap-1 active:scale-95"
              >
                <Plus size={12} /> Thêm Mã Voucher mới
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-2">
              {shopVouchersState.map((v, idx) => (
                <div key={v.id} className={`bg-white p-3 rounded-2xl border ${v.active ? 'border-indigo-100 hover:shadow-2xs' : 'border-slate-200 bg-slate-50/30'} flex flex-col justify-between space-y-2`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={v.code}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, code: val } : item));
                        }}
                        className="text-xs font-black font-mono text-slate-800 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
                      />
                      <input
                        type="checkbox"
                        checked={v.active}
                        onChange={(e) => {
                          setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, active: e.target.checked } : item));
                        }}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        title="Bật/Tắt Voucher"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-semibold text-slate-600 font-mono">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold">Mức Giảm</span>
                        <div className="flex bg-slate-50 border border-slate-150 rounded overflow-hidden">
                          <input
                            type="number"
                            value={v.val}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, val: val } : item));
                            }}
                            className="bg-transparent border-0 px-1 w-12 text-center text-[10px] focus:outline-none"
                          />
                          <button
                            onClick={() => setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, type: item.type === 'percent' ? 'value' : 'percent' } : item))}
                            className="px-1 bg-slate-100 text-[8px] text-slate-600 font-bold border-l border-slate-150"
                          >
                            {v.type === 'percent' ? '%' : 'đ'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase font-bold">Min đơn hàng</span>
                        <input
                          type="text"
                          value={v.minSpent.toLocaleString('vi-VN')}
                          onChange={(e) => {
                            const val = parseNumberInput(e.target.value);
                            setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, minSpent: val } : item));
                          }}
                          className="bg-slate-50 border border-slate-150 rounded px-1 text-[10px] w-full text-center focus:outline-none"
                        />
                      </div>
                    </div>

                    {v.type === 'percent' && (
                      <div className="text-[10px] text-slate-650 font-semibold font-mono">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Giảm Tối Đa (Cap)</span>
                        <input
                          type="text"
                          value={v.capVal.toLocaleString('vi-VN')}
                          onChange={(e) => {
                            const val = parseNumberInput(e.target.value);
                            setShopVouchersState(prev => prev.map(item => item.id === v.id ? { ...item, capVal: val } : item));
                          }}
                          className="bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5 text-[10px] w-full focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                    <span className="text-[9px] text-slate-400">Ưu tiên {idx + 1}</span>
                    <button
                      onClick={() => setShopVouchersState(prev => prev.filter(item => item.id !== v.id))}
                      className="text-rose-600 text-[10px] hover:bg-rose-50 px-2 py-0.5 rounded cursor-pointer font-bold"
                    >
                      Xoá
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Main Structural Layout: List all Main products (Full Width) */}
      <div className="w-full">
        
        {/* LEFT COLUMN PANEL: List all Main products (Full Width) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col space-y-4">
          
          {/* Header Actions for items listing */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Calculator size={15} className="text-indigo-600" />
                Danh bạ sản phẩm chính Inochi ({shopeeProducts.length})
              </h3>
              <p className="text-[9px] text-slate-400 font-semibold">
                Bấm vào dòng sản phẩm tương ứng để thiết lập thông số tính toán và phân phối quà tặng trong cửa sổ popup.
              </p>
            </div>

            {/* Real Search Input & Excel Export Wrapper Container */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
              {/* Quick search input */}
              <div className="relative w-full sm:w-56 shrink-0">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Tìm tên, mã VP, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Tải về Excel button */}
              <button
                onClick={handleExportExcel}
                className="cursor-pointer text-[11px] bg-emerald-600 hover:bg-emerald-550 active:scale-97 hover:scale-101 text-white font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-3xs transition"
              >
                <FileSpreadsheet size={13} />
                Tải file Excel bảng tính
              </button>
            </div>
          </div>

          {/* Quick margin status filters & Global Campaign Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 text-[10px] font-bold">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setMarginFilter('all')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer border transition ${marginFilter === 'all' ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'}`}
              >
                Tất cả ({calculatedRows.length})
              </button>
              <button
                onClick={() => setMarginFilter('profitable')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer border transition ${marginFilter === 'profitable' ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs' : 'bg-slate-50 border-emerald-250 text-emerald-700 hover:bg-emerald-50'}`}
              >
                Đạt Biên (%NM ≥ 10%) ({calculatedRows.filter(r => r.percentageNM >= 10).length})
              </button>
              <button
                onClick={() => setMarginFilter('marginal')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer border transition ${marginFilter === 'marginal' ? 'bg-amber-500 border-amber-600 text-white shadow-xs' : 'bg-slate-50 border-amber-250 text-amber-700 hover:bg-amber-50'}`}
              >
                Cận biên (0% - 10%) ({calculatedRows.filter(r => r.percentageNM >= 0 && r.percentageNM < 10).length})
              </button>
              <button
                onClick={() => setMarginFilter('unprofitable')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer border transition ${marginFilter === 'unprofitable' ? 'bg-rose-600 border-rose-700 text-white shadow-xs' : 'bg-slate-50 border-rose-250 text-rose-600 hover:bg-rose-50'}`}
              >
                Lỗ / Cảnh báo (&lt; 0%) ({calculatedRows.filter(r => r.percentageNM < 0).length})
              </button>
              <button
                onClick={() => setMarginFilter('unconfigured')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer border transition ${marginFilter === 'unconfigured' ? 'bg-slate-600 border-slate-700 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                Chưa gán quà ({calculatedRows.filter(r => r.simConfig.selectedGifts.length === 0).length})
              </button>
            </div>

            {/* Global Campaign Selector widget with special visual badge */}
            <div className="flex items-center gap-1.5 bg-indigo-50/50 border border-indigo-100 rounded-xl px-2.5 py-1.5 text-[10px] sm:ml-auto shadow-3xs shrink-0 self-end lg:self-auto">
              <span className="text-indigo-950 uppercase tracking-wider text-[8.5px] font-black flex items-center gap-1 shrink-0">
                <Sparkles size={11} className="text-indigo-650 animate-pulse" />
                ÁP DỤNG CAMPAIGN TOÀN BỘ ({shopeeProducts.length}):
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleGlobalPriceTypeChange(e.target.value);
                    e.target.value = ""; // Reset showing option
                  }
                }}
                className="bg-white border border-slate-250 hover:border-slate-350 rounded-lg px-2.5 py-1 text-[10px] font-extrabold text-indigo-750 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-3xs"
                defaultValue=""
              >
                <option value="" disabled>--- Chọn chiến dịch ---</option>
                <option value="bau">BAU</option>
                <option value="miniSpike">MINISPIKE</option>
                <option value="spike">SPIKE</option>
                <option value="backupSpike">BACKUP SPIKE</option>
                <option value="backupMiniSpike">BACKUP MINISPIKE</option>
                <option value="backupBau">BACKUP BAU</option>
                <option value="kolPrice">KOL LIVE</option>
                <option value="huntingSpike">HUNTING SPIKE</option>
                <option value="huntingMiniSpike">HUNTING MINISPIKE</option>
                <option value="minPrice">MINPRICE</option>
                <option value="rsp">RSP</option>
              </select>
            </div>
          </div>

          {/* Table container of main products */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold">
                  <th className="py-2.5 px-4">Sản Phẩm</th>
                  <th className="py-2.5 px-3">Campaign Type</th>
                  <th className="py-2.5 px-3 text-right">Giá Bán</th>
                  <th className="py-2.5 px-3">Cơ cấu Quà tặng</th>
                  <th className="py-2.5 px-3 text-center">Biên Gộp (%GM)</th>
                  <th className="py-2.5 px-4 text-center">Biên Ròng (%NM)</th>
                  <th className="py-2.5 px-3 text-right">Lợi Nhuận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      <AlertCircle className="mx-auto text-slate-350 mb-2" size={24} />
                      Không tìm thấy sản phẩm nào khớp bộ lọc lựa chọn.
                    </td>
                  </tr>
                ) : (
                      filteredRows.map(row => {
                        const isSelected = row.product.vpCode === selectedVpCode;
                        const nm = row.percentageNM;
                        const gm = row.percentageGM;
                        
                        // Lookup detailed cogs product to display requested columns
                        const cogsProductMatched = cogsProducts.find(p => p.skuPhanLoai === row.product.vpCode || p.barcode === row.product.vpCode);

                        return (
                          <React.Fragment key={row.product.vpCode}>
                            <tr
                              onClick={() => {
                                setSelectedVpCode(row.product.vpCode);
                                setIsModalOpen(true);
                              }}
                              className={`cursor-pointer transition hover:bg-slate-50/70 border-b border-slate-100 ${isSelected ? 'bg-indigo-50/45 font-semibold' : ''}`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-3">
                                  {/* thumbnail */}
                                  {(() => {
                                    const img = getProductImage(row.product.vpCode);
                                    return (
                                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-150 flex items-center justify-center overflow-hidden shrink-0 mt-0.5 shadow-4xs">
                                        {img ? (
                                          <img src={img} alt={row.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <span className="text-[8px] uppercase tracking-wide text-slate-400 font-extrabold">Inochi</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="text-slate-800 font-black truncate max-w-[220px]">{row.product.name}</p>
                                    <div className="flex items-center gap-1.5 text-[9px] text-slate-450 font-mono">
                                      <span className="bg-slate-100 text-slate-600 px-1 py-0.2 rounded leading-none font-bold">VP: {row.product.vpCode}</span>
                                      {cogsProductMatched && cogsProductMatched.name !== row.product.name && (
                                        <span className="text-indigo-650 bg-indigo-50/60 px-1 py-0.2 rounded leading-none font-bold truncate max-w-[130px]" title={`Tên gốc: ${cogsProductMatched.name}`}>
                                          Gốc: {cogsProductMatched.name}
                                        </span>
                                      )}
                                    </div>
                                    {cogsProductMatched && (
                                      <ProductCogsBadgeList product={cogsProductMatched} />
                                    )}
                                  </div>
                                </div>
                              </td>

                          <td className="py-3 px-3">
                            <select
                              value={row.simConfig.selectedPriceType}
                              onChange={(e) => {
                                handleRowPriceTypeChange(row.product.vpCode, e.target.value);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] px-2 py-1 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-550 cursor-pointer shadow-3xs"
                            >
                              <option value="bau">BAU</option>
                              <option value="miniSpike">MINISPIKE</option>
                              <option value="spike">SPIKE</option>
                              <option value="backupSpike">BACKUP SPIKE</option>
                              <option value="backupMiniSpike">BACKUP MINISPIKE</option>
                              <option value="backupBau">BACKUP BAU</option>
                              <option value="kolPrice">KOL LIVE</option>
                              <option value="huntingSpike">HUNTING SPIKE</option>
                              <option value="huntingMiniSpike">HUNTING MINISPIKE</option>
                              <option value="minPrice">MINPRICE</option>
                              <option value="rsp">RSP</option>
                              <option value="custom">Tùy chỉnh</option>
                            </select>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-750">
                            <p>{formatVND(row.basePrice)}</p>
                            <span className="text-[8.5px] uppercase tracking-wide px-1 rounded-sm bg-slate-100 text-slate-500 block w-fit ml-auto mt-0.5 font-bold">
                              {getCampaignLabel(row.simConfig.selectedPriceType)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            {row.simConfig.selectedGifts.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic">Chưa gán quà tặng</span>
                            ) : (
                              <div className="space-y-0.5 font-sans">
                                <p className="text-[10px] font-extrabold text-slate-700">
                                  {row.simConfig.selectedGifts.length} quà | Vốn: <span className="font-mono text-indigo-600">{formatVND(row.actualGiftCogs)}</span>
                                </p>
                                {row.isGiftUnsuitable && (
                                  <span className="text-[8.5px] bg-rose-50 text-rose-600 px-1 py-0.2 rounded font-black mt-0.5 block w-fit border border-rose-100">
                                    Vượt Quota ({formatVND(row.giftCogsLimit)})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* GM percentage */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-block bg-slate-50/50 p-1.5 rounded-lg border border-slate-150">
                              <span className={`text-[11px] font-black leading-none ${gm >= 20 ? 'text-emerald-700' : 'text-amber-600'}`}>
                                {gm.toFixed(0)}%
                              </span>
                            </div>
                          </td>

                          {/* NM Percentage */}
                          <td className="py-3 px-4 text-center">
                            <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black inline-block ${
                              nm >= 10 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : nm >= 0
                                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                                  : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                              {nm.toFixed(0)}%
                            </div>
                          </td>

                          {/* Net profit */}
                          <td className="py-3 px-3 text-right font-mono font-black">
                            <p className={row.netProfit >= 0 ? "text-emerald-650" : "text-rose-600"}>
                              {row.netProfit >= 0 ? '+' : ''}{formatVND(row.netProfit)}
                            </p>
                          </td>
                        </tr>

                        {/* Nested simulated gifts lists, rendering below main product just like in Check Scheme Promotion */}
                        {row.simConfig.selectedGifts.length > 0 && row.simConfig.selectedGifts.map((giftItem, gi) => (
                          <tr 
                            key={`${row.product.vpCode}-gift-${gi}`} 
                            onClick={() => {
                              setSelectedVpCode(row.product.vpCode);
                              setIsModalOpen(true);
                            }} 
                            className={`bg-slate-50/30 select-none text-[11px] border-b border-slate-150/40 hover:bg-indigo-50/25 ${isSelected ? 'bg-indigo-50/15' : ''}`}
                          >
                            <td className="py-2.5 px-4 pl-9" colSpan={3}>
                              <div className="flex items-center gap-3">
                                <CornerDownRight size={11} className="text-indigo-400 shrink-0" />
                                {(() => {
                                  const img = getProductImage(giftItem.product.skuPhanLoai);
                                  return (
                                    <div className="w-7 h-7 rounded border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden bg-white shadow-4xs">
                                      {img ? (
                                        <img src={img} alt={giftItem.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span className="text-[7px] text-slate-400 font-extrabold">🎁</span>
                                      )}
                                    </div>
                                  );
                                })()}
                                <div className="min-w-0 flex-1">
                                  <p className="text-slate-705 font-semibold truncate max-w-[220px]" title={giftItem.product.name}>
                                    {giftItem.product.name}
                                  </p>
                                  <p className="text-[8px] font-mono font-bold text-slate-400 mt-0.5">Mã VP: {giftItem.product.skuPhanLoai}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-550 text-[10px] font-bold">
                              Số lượng: <span className="font-mono text-slate-700">{giftItem.quantity}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-550 font-mono text-[9px]">
                              Quà vốn: {formatVND(giftItem.product.cogs * giftItem.quantity)}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-400 font-mono font-extrabold">-</td>
                            <td className="py-2.5 px-3 text-right text-slate-400 font-mono font-extrabold">-</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COLUMN PANEL: Active simulation detail builder (1/3 width, disabled in favor of beautiful full-height portal modal) */}
        {false && (
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 h-fit">
          
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Eye size={15} className="text-indigo-650 animate-pulse" />
              Sản phẩm điều phối chi tiết
            </h3>
            <p className="text-[9px] text-slate-400 font-bold">
              Kiểm định cơ cấu quà tặng và biên gộp/ròng đối với sản phẩm chính đang chọn.
            </p>
          </div>

          {activeCalculatedRow ? (
            <div className="space-y-4">
              
              {/* Product Card Brief */}
              <div className="bg-indigo-50/15 border border-indigo-50 p-3.5 rounded-2xl flex gap-3.5">
                {(() => {
                  const img = getProductImage(activeCalculatedRow.product.vpCode);
                  return (
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-150 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                      {img ? (
                        <img src={img} alt={activeCalculatedRow.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[10px] uppercase font-black text-slate-400">Inochi</span>
                      )}
                    </div>
                  );
                })()}

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] bg-indigo-100 text-indigo-750 px-1.5 py-0.5 rounded font-black uppercase font-mono tracking-wide">VP: {activeCalculatedRow.product.vpCode}</span>
                    <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">Shopee</span>
                  </div>
                  <h4 className="text-xs font-black text-slate-800 truncate leading-snug" title={activeCalculatedRow.product.name}>
                    {activeCalculatedRow.product.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Đề xuất COGS gốc: <span className="text-indigo-600 font-bold">{formatVND(activeCalculatedRow.product.cogs)}</span> 
                    {activeCalculatedRow.product.cogsUpdated > 0 && activeCalculatedRow.product.cogsUpdated !== activeCalculatedRow.product.cogs && (
                      <span className="block text-[9px] text-slate-400">Vốn mới: {formatVND(activeCalculatedRow.product.cogsUpdated)}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* 1. PRICE TIER SELECT PANEL */}
              <div className="space-y-2.5 bg-slate-50/40 p-3.5 rounded-2xl border border-slate-150/60 font-sans">
                <span className="text-[9.5px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                  💡 1. CHỌN KHUNG GIÁ BÁN SÀN:
                </span>
                
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'minPrice', label: 'Min Price', val: activeCalculatedRow.product.minPrice },
                    { key: 'kolPrice', label: 'KOL Price', val: activeCalculatedRow.product.kolPrice },
                    { key: 'spike', label: 'Spike', val: activeCalculatedRow.product.spike },
                    { key: 'miniSpike', label: 'Mini Spike', val: activeCalculatedRow.product.miniSpike },
                    { key: 'bau', label: 'BAU Price', val: activeCalculatedRow.product.bau },
                    { key: 'rsp', label: 'RSP (Đề xuất)', val: activeCalculatedRow.product.rsp }
                  ].map(tier => (
                    <button
                      key={tier.key}
                      onClick={() => handlePriceTypeChange(tier.key)}
                      className={`px-2.5 py-1.5 rounded-xl cursor-pointer text-left border text-[11px] flex flex-col justify-between transition ${
                        activeCalculatedRow.simConfig.selectedPriceType === tier.key
                          ? 'bg-indigo-600 border-indigo-750 text-white shadow-2xs font-bold'
                          : 'bg-white border-slate-205 text-slate-705 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-[8px] opacity-75 font-bold uppercase">{tier.label}</span>
                      <span className="font-semibold font-mono leading-none mt-0.5">
                        {tier.val > 0 ? formatVND(tier.val) : '--'}
                      </span>
                    </button>
                  ))}
                  
                  {/* Custom Price toggle button */}
                  <button
                    onClick={() => handlePriceTypeChange('custom')}
                    className={`col-span-2 px-2.5 py-1.5 rounded-xl cursor-pointer border text-[11px] text-left transition select-none ${
                      activeCalculatedRow.simConfig.selectedPriceType === 'custom'
                        ? 'bg-indigo-600 border-indigo-750 text-white shadow-2xs font-extrabold'
                        : 'bg-white border-slate-205 text-indigo-650 hover:bg-slate-50 font-bold'
                    }`}
                  >
                    <span className="block text-[8px] uppercase tracking-wide">Điền giá bán tự chọn</span>
                    <span className="text-[10px] block mt-0.5">Giá riêng cấu hình độc quyền</span>
                  </button>
                </div>

                {activeCalculatedRow.simConfig.selectedPriceType === 'custom' && (
                  <div className="space-y-1 pt-1 animate-fade-in text-[11px] font-semibold text-slate-600">
                    <span className="block text-[10px] text-indigo-700 font-bold">Giá bán tự chọn VND:</span>
                    <input
                      type="text"
                      value={activeCalculatedRow.simConfig.customPrice.toLocaleString('vi-VN')}
                      onChange={(e) => handleCustomPriceChange(parseNumberInput(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-850"
                    />
                  </div>
                )}
              </div>

              {/* 2. VOUCHER SELECTION BAR */}
              <div className="space-y-2 bg-slate-50/40 p-3 rounded-2xl border border-slate-150/60 font-sans">
                <span className="text-[9.5px] font-black uppercase text-indigo-750 tracking-wider block">
                  🎟️ 2. CHỌN MÃ VOUCHER SHOP ÁP DỤNG:
                </span>

                <div className="flex gap-1 bg-white p-0.5 border border-slate-200 rounded-lg text-[9px] font-semibold">
                  {[
                    { id: 'auto', label: 'Tối ưu (Auto)' },
                    { id: 'manual', label: 'Chỉ định' },
                    { id: 'custom', label: 'Tự gõ' },
                    { id: 'none', label: 'Tắt' }
                  ].map(vOpt => (
                    <button
                      key={vOpt.id}
                      type="button"
                      onClick={() => handleVoucherModeChange(vOpt.id as any)}
                      className={`flex-1 py-1 rounded cursor-pointer transition text-center ${
                        activeCalculatedRow.simConfig.voucherMode === vOpt.id
                          ? 'bg-indigo-600 text-white font-black'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {vOpt.label}
                    </button>
                  ))}
                </div>

                {/* Voucher dropdown trigger */}
                {activeCalculatedRow.simConfig.voucherMode === 'auto' && (
                  <div className="bg-indigo-50/30 p-2 rounded-xl text-[10px] font-semibold text-indigo-805 text-center font-mono">
                    {activeCalculatedRow.shopVoucherValue > 0 ? (
                      (() => {
                        const vObj = shopVouchersState.find(v => v.code === activeCalculatedRow.appliedVoucherCode);
                        return (
                          <p>
                            ✨ Đã chọn tối ưu: <strong className="text-indigo-700">{activeCalculatedRow.appliedVoucherCode}</strong>
                            {vObj?.voucherType ? <span className="bg-purple-100 text-purple-750 px-1 py-0.5 rounded text-[8px] font-bold font-sans ml-1">Type: {vObj.voucherType}</span> : ''}
                            {' '}(-{formatVND(activeCalculatedRow.shopVoucherValue)})
                          </p>
                        );
                      })()
                    ) : (
                      <p className="text-slate-400 italic">Không tìm được Voucher phù hợp hạn mức Min Spend</p>
                    )}
                  </div>
                )}

                {activeCalculatedRow.simConfig.voucherMode === 'manual' && (
                  <div className="space-y-1">
                    <select
                      value={activeCalculatedRow.simConfig.selectedVoucherId || ''}
                      onChange={(e) => handleManualVoucherChange(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl text-[11px] w-full p-2 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Chọn voucher muốn ép --</option>
                      {shopVouchersState.map(v => {
                        const suffix = v.type === 'percent' ? `${v.val}% (Capped ${formatVND(v.capVal)})` : formatVND(v.val);
                        const typeInfo = v.voucherType ? ` [${v.voucherType}]` : '';
                        return (
                          <option key={v.id} value={v.id} disabled={!v.active}>
                            {v.code}{typeInfo} ({suffix}) - Min: {formatVND(v.minSpent)}
                          </option>
                        );
                      })}
                    </select>
                    {activeCalculatedRow.shopVoucherValue === 0 && activeCalculatedRow.simConfig.selectedVoucherId && (
                      <p className="text-[9px] text-rose-500 font-semibold italic">⚠️ Voucher này không được cứu xét vì giá bán ({formatVND(activeCalculatedRow.basePrice)}) chưa đạt yêu cầu tối thiểu.</p>
                    )}
                  </div>
                )}

                {activeCalculatedRow.simConfig.voucherMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in font-mono">
                    <div>
                      <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Hình Thức</span>
                      <select
                        value={activeCalculatedRow.simConfig.userVoucherType || 'percent'}
                        onChange={(e) => handleCustomVoucherChange(e.target.value as any, activeCalculatedRow.simConfig.userVoucherVal)}
                        className="bg-white border border-slate-200 rounded-lg text-[10px] w-full p-1.5 font-bold"
                      >
                        <option value="percent">Giảm Theo %</option>
                        <option value="value">Giảm Tiền mặt</option>
                      </select>
                    </div>

                    <div>
                      <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Mức Giảm</span>
                      <input
                        type="number"
                        value={activeCalculatedRow.simConfig.userVoucherVal || 0}
                        onChange={(e) => handleCustomVoucherChange(activeCalculatedRow.simConfig.userVoucherType, parseFloat(e.target.value) || 0)}
                        className="bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold w-full focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. GIFT SELECT PANEL & STOCK CHECK */}
              <div className="space-y-3 bg-slate-50/40 p-3.5 rounded-2xl border border-slate-150/60 font-sans">
                
                <div className="flex justify-between items-center">
                  <span className="text-[9.5px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                    🎁 3. PHÂN BỔ QUÀ TẶNG:
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    activeCalculatedRow.isGiftUnsuitable ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Quota: {shopeeFeeConfigsState.giftQuota.val}% ({formatVND(activeCalculatedRow.giftCogsLimit)})
                  </span>
                </div>

                {/* List currently selected gifts */}
                {activeCalculatedRow.simConfig.selectedGifts.length === 0 ? (
                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[10px] font-semibold leading-relaxed">
                    Chưa phân phối bất kỳ quà tặng nào.<br />Tìm kiếm các quà bên dưới để gán sản phẩm.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {activeCalculatedRow.simConfig.selectedGifts.map((item, idx) => {
                      const giftStock = stockRecords.filter(s => s.skuPhanLoai === item.product.skuPhanLoai);
                      const totalStock = giftStock.reduce((sum, s) => sum + s.quantity, 0);

                      return (
                        <div key={item.product.skuPhanLoai} className="flex justify-between items-center bg-white border border-slate-150 p-2.5 rounded-xl shadow-4xs text-[10px] font-semibold gap-1.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-850 font-black truncate leading-snug">{item.product.name}</p>
                            <p className="text-[9px] text-slate-450 font-mono mt-0.5">
                              COGS: <strong className="text-indigo-650">{formatVND(item.product.cogs)}</strong> | SKU: {item.product.skuPhanLoai}
                            </p>
                            <span className={`text-[8.5px] font-semibold font-mono block mt-0.5 ${totalStock > 10 ? 'text-teal-650' : totalStock > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                              Kho {item.product.size || 'Inochi'}: {totalStock} chiếc
                            </span>
                          </div>

                          <div className="flex items-center gap-1 border border-slate-150 rounded-lg p-0.5 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => handleGiftQtyChange(item.product.skuPhanLoai, -1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded transition cursor-pointer font-extrabold text-[12px]"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-mono font-bold font-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleGiftQtyChange(item.product.skuPhanLoai, 1)}
                              className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded transition cursor-pointer font-extrabold text-[12px]"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveGift(item.product.skuPhanLoai)}
                            className="bg-slate-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-100 cursor-pointer hover:bg-rose-50 transition shrink-0"
                            title="Xoá quà này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center text-[10px] font-black font-mono pt-1">
                      <span className="text-slate-500 font-sans font-bold">TỔNG VỐN QUÀ (COGS) ÁP DỤNG:</span>
                      <span className={activeCalculatedRow.isGiftUnsuitable ? 'text-rose-600' : 'text-indigo-650'}>
                        {formatVND(activeCalculatedRow.actualGiftCogs)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Eligible Gifts Search / Picker in Details sidebar */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">Giao diện tìm thêm Quà tặng Inochi COGS:</span>
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Gõ tên quà tặng..."
                      value={giftQuery}
                      onChange={(e) => setGiftQuery(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-205 rounded-lg py-1 px-2.5 text-[10px] font-bold"
                    />

                    <select
                      value={giftCategory}
                      onChange={(e) => setGiftCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-205 rounded-lg py-1 px-1.5 text-[9px] font-black text-slate-700 font-sans"
                    >
                      <option value="all">Tất cả lọc</option>
                      {giftCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tiny list of searched gifts with ADD button */}
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                    {searchedGifts.slice(0, 15).map(g => (
                      <div key={g.skuPhanLoai} className="p-1 px-2.5 flex justify-between items-center text-[10px] hover:bg-slate-50/50 font-semibold gap-1">
                        <div className="min-w-0">
                          <p className="truncate text-slate-800" title={g.name}>{g.name}</p>
                          <p className="text-[8px] text-slate-400 font-mono">COGS: {formatVND(g.cogs)} | {g.skuPhanLoai}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddGift(g.skuPhanLoai)}
                          className="cursor-pointer text-[9px] bg-slate-100 hover:bg-indigo-600 border border-slate-200 hover:border-indigo-700 hover:text-white px-2 py-0.5 rounded font-black transition whitespace-nowrap active:scale-95"
                        >
                          + Gán Quà
                        </button>
                      </div>
                    ))}
                    {searchedGifts.length === 0 && (
                      <p className="py-6 text-center text-slate-400 text-[9px] font-semibold">Không tìm thấy quà nào phù hợp</p>
                    )}
                  </div>
                </div>

              </div>

              {/* 4. WATERFALL WATERFALL SHEET BIỂU QUY CHÕ CHI TIẾT */}
              <div className="space-y-2 bg-slate-50/40 p-3.5 rounded-2xl border border-slate-150/60 text-xs font-mono">
                <span className="text-[9.5px] font-black uppercase text-indigo-750 tracking-wider block font-sans">
                  📊 4. PHÂN RÃ CHỈ TIÊU CHI PHÍ VÀ LỢI NHUẬN:
                </span>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between border-b border-white pb-1">
                    <span className="text-slate-400 font-sans font-bold">Giá bán gốc từ sàn:</span>
                    <span className="font-extrabold text-slate-800">{formatVND(activeCalculatedRow.basePrice)}</span>
                  </div>

                  <div className="flex justify-between border-b border-white pb-1">
                    <span className="text-slate-400 font-sans font-bold">Shop áp Voucher giảm (-)</span>
                    <span className="font-bold text-rose-550">-{formatVND(activeCalculatedRow.shopVoucherValue)}</span>
                  </div>

                  <div className="flex justify-between border-b border-white pb-1">
                    <span className="text-slate-400 font-sans font-bold">Vốn sản phẩm (COGS) (-)</span>
                    <span className="font-bold text-rose-600">-{formatVND(activeCalculatedRow.cogsUpdated)}</span>
                  </div>

                  {activeCalculatedRow.actualGiftCogs > 0 && (
                    <div className="flex justify-between border-b border-white pb-1">
                      <span className="text-slate-400 font-sans font-bold">Vốn quà tặng gán (Gifts) (-)</span>
                      <span className="font-bold text-cyan-600">-{formatVND(activeCalculatedRow.actualGiftCogs)}</span>
                    </div>
                  )}

                  {/* Sàn fees box */}
                  <div className="bg-white/80 p-2 rounded-xl text-[10px] space-y-1 text-slate-550">
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí cố định Shopee:</span>
                      <span>-{formatVND(activeCalculatedRow.fixedFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí hoa hồng sàn:</span>
                      <span>-{formatVND(activeCalculatedRow.commission)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí thanh toán thanh:</span>
                      <span>-{formatVND(activeCalculatedRow.paymentFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Phí Voucher Xtra:</span>
                      <span>-{formatVND(activeCalculatedRow.voucherXtra)}</span>
                    </div>
                    {activeCalculatedRow.voucherSellerFee > 0 && (
                      <div className="flex justify-between font-semibold text-indigo-700 bg-indigo-50/50 rounded-sm px-0.5">
                        <span className="font-sans">Phí sử dụng Voucher:</span>
                        <span>-{formatVND(activeCalculatedRow.voucherSellerFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Logistic FFM:</span>
                      <span>-{formatVND(activeCalculatedRow.ffmFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Kiến trúc hạ tầng:</span>
                      <span>-{formatVND(activeCalculatedRow.infraFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-sans font-medium">Dự phòng hoàn trả:</span>
                      <span>-{formatVND(activeCalculatedRow.returnFee)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between border-b border-white pb-1 pt-1.5">
                    <span className="text-slate-400 font-sans font-bold">Ưu đãi Voucher sàn tài trợ (+):</span>
                    <span className="font-bold text-emerald-600">+{formatVND(activeCalculatedRow.platformVoucherCost)}</span>
                  </div>

                  <div className="flex justify-between items-center sm:gap-2 pt-2.5 border-t border-slate-200">
                    <span className="text-slate-800 font-sans font-extrabold text-[10px] uppercase tracking-wide">DOANH THU THUẦN (Net Pool):</span>
                    <span className="text-teal-600 text-xs font-black font-mono">{formatVND(activeCalculatedRow.netPool)}</span>
                  </div>

                  <div className="flex justify-between items-center sm:gap-2 pt-1 border-b border-slate-100 pb-1.5">
                    <span className="text-slate-800 font-sans font-extrabold text-[10px] uppercase tracking-wide">LỢI NHUẬN RÒNG (NM):</span>
                    <span className={`text-sm font-black font-mono ${activeCalculatedRow.netProfit >= 0 ? 'text-emerald-650' : 'text-rose-600'}`}>
                      {activeCalculatedRow.netProfit >= 0 ? '+' : ''}{formatVND(activeCalculatedRow.netProfit)}
                    </span>
                  </div>

                  {/* Micro recommendations box */}
                  <div className="p-2.5 bg-indigo-50/10 rounded-xl text-[10.5px] text-slate-600 font-sans font-semibold border border-indigo-100/50 leading-relaxed">
                    {activeCalculatedRow.percentageGM < 20 ? (
                      <p className="text-rose-650 font-bold">⚠️ Biên gộp quá thấp ({activeCalculatedRow.percentageGM.toFixed(1)}%). Nên sụt bớt số lượng quà tặng hoặc thương lượng tăng giá sàn.</p>
                    ) : activeCalculatedRow.percentageNM < 10 ? (
                      <p className="text-amber-600 font-bold">⚠️ Biên ròng sau phí sàn ({activeCalculatedRow.percentageNM.toFixed(1)}%) chưa đạt kỳ vọng 10%. Hãy bớt quà tặng hoặc nâng bậc thang giá.</p>
                    ) : (
                      <p className="text-emerald-700 font-bold">✅ Sản phẩm vận hành biên rất tốt! Biên ròng đạt %NM = {activeCalculatedRow.percentageNM.toFixed(1)}% ({formatVND(activeCalculatedRow.netProfit)}) ổn định.</p>
                    )}
                  </div>

                </div>

              </div>
              
              {/* Warehouse stock indicators */}
              {stockRecords && (
                (() => {
                  const itemStock = stockRecords.filter(s => s.skuPhanLoai === activeCalculatedRow.product.vpCode);
                  const totalStk = itemStock.reduce((sum, s) => sum + s.quantity, 0);
                  const southStk = itemStock.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                  const northStk = itemStock.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;

                  return (
                    <div className="space-y-2 bg-slate-50/40 p-3 rounded-2xl border border-slate-150/50 leading-none">
                      <span className="text-[9px] font-black text-indigo-750 uppercase tracking-widest block font-sans">📦 HÀNG TỒN TRÊN HỆ THỐNG INOCHI:</span>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-600 font-sans pt-1">
                        <div className="bg-white p-2 border border-slate-100 rounded-lg">
                          <p className="text-slate-400 font-bold">Miền Nam</p>
                          <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">{southStk} chiếc</p>
                        </div>
                        <div className="bg-white p-2 border border-slate-100 rounded-lg">
                          <p className="text-slate-400 font-bold">Miền Bắc</p>
                          <p className="font-mono text-[11px] font-bold text-slate-800 mt-1">{northStk} chiếc</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-xs">
                        <span className="text-indigo-900 font-black font-sans text-[11px]">TỔNG TỒN TRỰC QUAN:</span>
                        <span className="font-black text-indigo-700 font-mono">{totalStk} chiếc</span>
                      </div>
                    </div>
                  );
                })()
              )}

            </div>
          ) : (
            <p className="py-12 text-center text-slate-400 font-medium">Đang khởi tạo...</p>
          )}

        </div>
        )}

      </div>

      {/* Modal Popup for Product Configuration Details */}
      {isModalOpen && activeCalculatedRow && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto" id="config-modal-overlay">
          {/* Backdrop Click */}
          <div 
            className="absolute inset-0 cursor-default" 
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-5xl rounded-none sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-full sm:max-h-[85vh] border border-slate-200 z-10 font-sans" id="config-modal-container">
            
            {/* Header: Name, Code & Image */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-slate-150 bg-slate-50/50">
              <div className="flex items-center gap-3.5 min-w-0">
                {(() => {
                  const img = getProductImage(activeCalculatedRow.product.vpCode);
                  return (
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden shadow-4xs">
                      {img ? (
                        <img src={img} alt={activeCalculatedRow.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[9px] uppercase font-black text-slate-400">Inochi</span>
                      )}
                    </div>
                  );
                })()}
                
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider mb-0.5">
                    VP: {activeCalculatedRow.product.vpCode}
                  </span>
                  <h3 className="text-sm font-black text-slate-800 leading-snug truncate max-w-[280px] sm:max-w-[450px]" title={activeCalculatedRow.product.name}>
                    {activeCalculatedRow.product.name}
                  </h3>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-200 text-slate-400 hover:text-slate-805 hover:bg-slate-100 transition flex items-center justify-center cursor-pointer active:scale-95"
                title="Đóng cửa sổ"
                id="close-modal-btn"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Configuration Panel Grid */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/10">
              
              {/* Product Profile & Warehousing details from Sheet COGS */}
              {(() => {
                const matchedCogs = cogsProducts.find(p => p.skuPhanLoai === activeCalculatedRow.product.vpCode || p.barcode === activeCalculatedRow.product.vpCode);
                return matchedCogs ? <ProductCogsBadgeList product={matchedCogs} showAll={true} /> : null;
              })()}
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* COLUMN 1: FLOOR PRICE SELECTOR & SHOP VOUCHER ACCORDIONS */}
                <div className="lg:col-span-6 space-y-4">
                  
                  {/* 1. FLOOR PRICE SELECTION */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs font-sans">
                    <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                      💡 1. CHỌN KHUNG GIÁ BÁN SÀN:
                    </span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'minPrice', label: 'Min Price', val: activeCalculatedRow.product.minPrice },
                        { key: 'kolPrice', label: 'KOL Live', val: activeCalculatedRow.product.kolPrice },
                        { key: 'spike', label: 'Spike', val: activeCalculatedRow.product.spike },
                        { key: 'miniSpike', label: 'Mini Spike', val: activeCalculatedRow.product.miniSpike },
                        { key: 'bau', label: 'BAU Price', val: activeCalculatedRow.product.bau },
                        { key: 'backupSpike', label: 'Backup Spike', val: activeCalculatedRow.product.spike },
                        { key: 'backupMiniSpike', label: 'Backup Mini Spike', val: activeCalculatedRow.product.miniSpike },
                        { key: 'backupBau', label: 'Backup BAU', val: activeCalculatedRow.product.bau },
                        { key: 'huntingSpike', label: 'Hunting Spike', val: activeCalculatedRow.product.spike },
                        { key: 'huntingMiniSpike', label: 'Hunting Mini Spike', val: activeCalculatedRow.product.miniSpike },
                        { key: 'rsp', label: 'RSP (Đề xuất)', val: activeCalculatedRow.product.rsp }
                      ].map(tier => (
                        <button
                          key={tier.key}
                          onClick={() => handlePriceTypeChange(tier.key)}
                          className={`px-3 py-2 rounded-xl cursor-pointer text-left border text-[11px] flex flex-col justify-between transition ${
                            activeCalculatedRow.simConfig.selectedPriceType === tier.key
                              ? 'bg-indigo-600 border-indigo-750 text-white shadow-3xs font-bold font-sans'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block text-[8px] opacity-75 font-bold uppercase">{tier.label}</span>
                          <span className="font-semibold font-mono leading-none mt-1">
                            {tier.val > 0 ? formatVND(tier.val) : '--'}
                          </span>
                        </button>
                      ))}
                      
                      {/* Custom Price Select button */}
                      <button
                        onClick={() => handlePriceTypeChange('custom')}
                        className={`col-span-2 px-3 py-2 rounded-xl cursor-pointer border text-[11.5px] text-left transition select-none ${
                          activeCalculatedRow.simConfig.selectedPriceType === 'custom'
                            ? 'bg-indigo-600 border-indigo-750 text-white shadow-3xs font-extrabold'
                            : 'bg-white border-slate-200 text-indigo-650 hover:bg-slate-50 font-bold'
                        }`}
                      >
                        <span className="block text-[8.5px] uppercase tracking-wide font-sans">Điền giá bán tự chọn</span>
                        <span className="text-[10px] block mt-0.5 opacity-90 font-sans">Giá riêng cấu hình độc quyền</span>
                      </button>
                    </div>

                    {activeCalculatedRow.simConfig.selectedPriceType === 'custom' && (
                      <div className="space-y-1.5 pt-1.5 text-[11px] font-semibold text-slate-650">
                        <span className="block text-[10px] text-indigo-700 font-bold">Giá bán tự chọn VND:</span>
                        <input
                          type="text"
                          value={activeCalculatedRow.simConfig.customPrice.toLocaleString('vi-VN')}
                          onChange={(e) => handleCustomPriceChange(parseNumberInput(e.target.value))}
                          className="w-full bg-white border border-slate-205 rounded-xl p-2.5 text-xs font-bold leading-tight focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-850 shadow-3xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. CHỌN MÃ VOUCHER SHOP */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs font-sans">
                    <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider block">
                      🎟️ 2. CHỌN MÃ VOUCHER SHOP ÁP DỤNG:
                    </span>

                    <div className="flex gap-1.5 bg-slate-50 p-1.5 border border-slate-200 rounded-xl text-[10px] font-semibold">
                      {[
                        { id: 'auto', label: 'Tối ưu (Auto)' },
                        { id: 'manual', label: 'Chỉ định' },
                        { id: 'custom', label: 'Tự gõ' },
                        { id: 'none', label: 'Tắt' }
                      ].map(vOpt => (
                        <button
                          key={vOpt.id}
                          type="button"
                          onClick={() => handleVoucherModeChange(vOpt.id as any)}
                          className={`flex-1 py-1.5 rounded-lg cursor-pointer transition text-center ${
                            activeCalculatedRow.simConfig.voucherMode === vOpt.id
                              ? 'bg-indigo-600 text-white font-black shadow-3xs'
                              : 'text-slate-600 hover:bg-slate-150/55'
                          }`}
                        >
                          {vOpt.label}
                        </button>
                      ))}
                    </div>

                    {/* Voucher dropdown trigger / fields */}
                    {activeCalculatedRow.simConfig.voucherMode === 'auto' && (
                      <div className="bg-indigo-50/50 p-3 rounded-xl text-[10px] font-bold text-indigo-805 text-center font-mono border border-indigo-100">
                        {activeCalculatedRow.shopVoucherValue > 0 ? (
                          (() => {
                            const vObj = shopVouchersState.find(v => v.code === activeCalculatedRow.appliedVoucherCode);
                            return (
                              <p>
                                ✨ Đã chọn tối ưu: <strong className="text-indigo-750 font-black">{activeCalculatedRow.appliedVoucherCode}</strong>
                                {vObj?.voucherType ? <span className="bg-purple-100 text-purple-750 px-1 py-0.5 rounded text-[8px] font-bold font-sans ml-1">Type: {vObj.voucherType}</span> : ''}
                                {' '}(-{formatVND(activeCalculatedRow.shopVoucherValue)})
                              </p>
                            );
                          })()
                        ) : (
                          <p className="text-slate-400 italic">Không tìm được Voucher phù hợp hạn mức Min Spend</p>
                        )}
                      </div>
                    )}

                    {activeCalculatedRow.simConfig.voucherMode === 'manual' && (
                      <div className="space-y-1.5">
                        <select
                          value={activeCalculatedRow.simConfig.selectedVoucherId || ''}
                          onChange={(e) => handleManualVoucherChange(e.target.value)}
                          className="bg-white border border-slate-205 rounded-xl text-[11px] w-full p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs"
                        >
                          <option value="">-- Chọn voucher muốn ép --</option>
                          {shopVouchersState.map(v => {
                            const suffix = v.type === 'percent' ? `${v.val}% (Capped ${formatVND(v.capVal)})` : formatVND(v.val);
                            const typeInfo = v.voucherType ? ` [${v.voucherType}]` : '';
                            return (
                              <option key={v.id} value={v.id} disabled={!v.active}>
                                {v.code}{typeInfo} ({suffix}) - Min: {formatVND(v.minSpent)}
                              </option>
                            );
                          })}
                        </select>
                        {activeCalculatedRow.shopVoucherValue === 0 && activeCalculatedRow.simConfig.selectedVoucherId && (
                          <p className="text-[9px] text-rose-500 font-semibold italic">⚠️ Voucher này không được cứu xét vì giá bán ({formatVND(activeCalculatedRow.basePrice)}) chưa đạt yêu cầu tối thiểu.</p>
                        )}
                      </div>
                    )}

                    {activeCalculatedRow.simConfig.voucherMode === 'custom' && (
                      <div className="grid grid-cols-2 gap-3 pt-1 font-mono">
                        <div>
                          <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold mb-1">Hình Thức</span>
                          <select
                            value={activeCalculatedRow.simConfig.userVoucherType || 'percent'}
                            onChange={(e) => handleCustomVoucherChange(e.target.value as any, activeCalculatedRow.simConfig.userVoucherVal)}
                            className="bg-white border border-slate-205 rounded-xl text-[10.5px] w-full p-2 font-bold cursor-pointer shadow-3xs"
                          >
                            <option value="percent">Giảm Theo %</option>
                            <option value="value">Giảm Tiền mặt</option>
                          </select>
                        </div>

                        <div>
                          <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold mb-1 font-sans">Mức Giảm</span>
                          <input
                            type="number"
                            value={activeCalculatedRow.simConfig.userVoucherVal || 0}
                            onChange={(e) => handleCustomVoucherChange(activeCalculatedRow.simConfig.userVoucherType, parseFloat(e.target.value) || 0)}
                            className="bg-white border border-slate-205 rounded-xl p-1.5 text-[10.5px] font-bold w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-3xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 2: GIFT ALLOCATION PANEL & INTERACTION */}
                <div className="lg:col-span-6 space-y-4">
                  
                  {/* 3. PHÂN BỔ QUÀ TẶNG */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-150 shadow-3xs font-sans h-full flex flex-col justify-between">
                    
                    <div className="space-y-3 flex-1">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase text-indigo-750 tracking-wider flex items-center gap-1">
                          🎁 3. PHÂN BỔ QUÀ TẶNG:
                        </span>
                        <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full ${
                          activeCalculatedRow.isGiftUnsuitable ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Quota: {shopeeFeeConfigsState.giftQuota.val}% ({formatVND(activeCalculatedRow.giftCogsLimit)})
                        </span>
                      </div>

                      {/* Display assigned gifts */}
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {activeCalculatedRow.simConfig.selectedGifts.length === 0 ? (
                          <div className="p-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-[10.5px] font-semibold leading-relaxed my-2">
                            Chưa phân phối bất kỳ quà tặng nào.<br />Tìm kiếm các quà bên dưới để gán sản phẩm.
                          </div>
                        ) : (
                          activeCalculatedRow.simConfig.selectedGifts.map((item) => {
                            const giftStock = stockRecords.filter(s => s.skuPhanLoai === item.product.skuPhanLoai);
                            const totalStock = giftStock.reduce((sum, s) => sum + s.quantity, 0);
                            const giftImg = getProductImage(item.product.skuPhanLoai) || item.product.img;

                            return (
                              <div key={item.product.skuPhanLoai} className="flex justify-between items-center bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[10.5px] font-semibold gap-1.5 animate-fade-in">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {/* Thumbnail */}
                                  <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 shrink-0 bg-white flex items-center justify-center shadow-3xs">
                                    {giftImg ? (
                                      <img src={giftImg} alt={item.product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <Gift size={13} className="text-slate-400" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-slate-850 font-extrabold truncate leading-snug">{item.product.name}</p>
                                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                      COGS: <strong className="text-indigo-650">{formatVND(item.product.cogs)}</strong> | SKU: {item.product.skuPhanLoai}
                                    </p>
                                    <span className={`text-[8.5px] font-semibold font-mono block mt-0.5 ${totalStock > 10 ? 'text-teal-650' : totalStock > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                                      Kho {item.product.size || 'Inochi'}: {totalStock} chiếc
                                    </span>
                                  </div>
                                </div>


                                <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => handleGiftQtyChange(item.product.skuPhanLoai, -1)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded transition cursor-pointer font-extrabold text-[12px] active:scale-90"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center font-mono font-bold font-xs">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleGiftQtyChange(item.product.skuPhanLoai, 1)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-850 hover:bg-slate-100 rounded transition cursor-pointer font-extrabold text-[12px] active:scale-90"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveGift(item.product.skuPhanLoai)}
                                  className="bg-white text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-150 cursor-pointer hover:bg-rose-50 transition shrink-0 active:scale-95"
                                  title="Xoá quà này"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {activeCalculatedRow.simConfig.selectedGifts.length > 0 && (
                        <div className="flex justify-between items-center text-[10.5px] font-black font-mono pt-1.5 border-t border-slate-100">
                          <span className="text-slate-550 font-sans font-bold">TỔNG VỐN QUÀ (COGS) ÁP DỤNG:</span>
                          <span className={activeCalculatedRow.isGiftUnsuitable ? 'text-rose-600' : 'text-indigo-650'}>
                            {formatVND(activeCalculatedRow.actualGiftCogs)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Gifts Picker overlay searchable */}
                    <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150 space-y-2 mt-4">
                      <span className="text-[9px] font-black uppercase text-indigo-750 tracking-wider block">Giao diện tìm thêm quà tặng Inochi COGS:</span>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Gõ tên quà tặng..."
                          value={giftQuery}
                          onChange={(e) => setGiftQuery(e.target.value)}
                          className="w-full bg-white border border-slate-205 rounded-xl py-1 px-3 text-[10.5px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />

                        <select
                          value={giftCategory}
                          onChange={(e) => setGiftCategory(e.target.value)}
                          className="bg-white border border-slate-205 rounded-xl py-1 px-2 text-[10px] font-black text-slate-705 cursor-pointer focus:outline-none font-sans"
                        >
                          <option value="all">Tất cả lọc</option>
                          {giftCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 border border-slate-150 bg-white rounded-xl shadow-inner">
                        {searchedGifts.slice(0, 15).map(g => {
                          const giftImg = getProductImage(g.skuPhanLoai) || g.img;
                          const matching = stockRecords ? stockRecords.filter(s => s.skuPhanLoai === g.skuPhanLoai) : [];
                          const totalStock = matching.reduce((sum, s) => sum + s.quantity, 0);
                          const southStock = matching.find(s => s.warehouse === 'BMVN_HCM_BTN')?.quantity || 0;
                          const northStock = matching.find(s => s.warehouse === 'BMVN_BN_VSIP')?.quantity || 0;
                          const isOutOfStock = stockRecords && stockRecords.length > 0 && totalStock === 0;

                          return (
                            <div key={g.skuPhanLoai} className={`p-2 flex items-center justify-between text-[10.5px] hover:bg-slate-50/75 font-semibold gap-2 transition ${isOutOfStock ? 'opacity-60 bg-slate-50/35' : ''}`}>
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                {/* Thumbnail */}
                                <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-50 flex items-center justify-center">
                                  {giftImg ? (
                                    <img src={giftImg} alt={g.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Gift size={15} className="text-slate-350" />
                                  )}
                                </div>
                                
                                {/* Info details */}
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="truncate text-slate-800 font-extrabold text-[10.5px] leading-tight" title={g.name}>{g.name}</p>
                                  <p className="text-[8.5px] text-slate-400 font-mono">
                                    SKU: {g.skuPhanLoai} | COGS: <span className="text-rose-650 font-bold">{formatVND(g.cogs)}</span>
                                  </p>
                                  
                                  {/* Stock details */}
                                  {stockRecords && stockRecords.length > 0 && (
                                    <div className="flex items-center gap-1 text-[8px] font-sans font-bold">
                                      <span className={`px-1.5 py-0.2 rounded-md ${
                                        totalStock > 10 
                                          ? 'bg-teal-50 text-teal-650 border border-teal-100' 
                                          : totalStock > 0 
                                            ? 'bg-amber-50 text-amber-655 border border-amber-100' 
                                            : 'bg-slate-100 text-slate-400 line-through'
                                      }`}>
                                        Tồn: {totalStock} chiếc
                                      </span>
                                      {totalStock > 0 && (
                                        <span className="text-slate-405">
                                          (Nam: {southStock} | Bắc: {northStock})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isOutOfStock}
                                onClick={() => handleAddGift(g.skuPhanLoai)}
                                className={`cursor-pointer text-[9px] uppercase font-black tracking-wider px-2.5 py-1.5 rounded-lg border transition whitespace-nowrap active:scale-95 shrink-0 ${
                                  isOutOfStock
                                    ? 'bg-slate-100 border-slate-250 text-slate-400 cursor-not-allowed opacity-60'
                                    : 'bg-white hover:bg-indigo-650 border-slate-200 hover:border-indigo-700 text-slate-700 hover:text-white hover:shadow-4xs'
                                }`}
                              >
                                {isOutOfStock ? 'Hết hàng' : '+ Gán Quà'}
                              </button>
                            </div>
                          );
                        })}
                        {searchedGifts.length === 0 && (
                          <p className="py-5 text-center text-slate-400 text-[9px] font-semibold">Không tìm thấy quà nào</p>
                        )}
                      </div>

                    </div>

                  </div>

                </div>

              </div>
              
              {/* WATERFALL ANALYSIS DETAILS FOOTER OVERVIEW */}
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-4 shadow-md font-mono">
                <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider block font-sans">
                  📊 PHÂN TÍCH SUẤT BIÊN LỢI NHUẬN CỦA PHƯƠNG ÁN BẢNG TÍNH:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-855/40 p-3 rounded-xl text-center">
                  <div className="space-y-0.5 border-r border-slate-800 last:border-none">
                    <p className="text-[8px] text-slate-400 uppercase font-sans font-bold">GIÁ BÁN SÀN</p>
                    <p className="font-sans text-[13px] font-black text-white">{formatVND(activeCalculatedRow.basePrice)}</p>
                  </div>
                  
                  <div className="space-y-0.5 border-r border-slate-800 last:border-none">
                    <p className="text-[8px] text-slate-400 uppercase font-sans font-bold">VỐN HÀNG + QUÀ</p>
                    <p className="font-sans text-[13px] font-black text-white">
                      {formatVND(activeCalculatedRow.cogsUpdated + activeCalculatedRow.actualGiftCogs)}
                    </p>
                  </div>
                  
                  <div className="space-y-0.5 border-r border-slate-800 last:border-none">
                    <p className="text-[8px] text-slate-400 uppercase font-sans font-bold">BIÊN GỘP %GM</p>
                    <p className={`font-mono text-sm font-black ${activeCalculatedRow.percentageGM >= 20 ? 'text-teal-400' : 'text-amber-400'}`}>
                      {activeCalculatedRow.percentageGM.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="space-y-0.5 border-r border-slate-800 last:border-none">
                    <p className="text-[8px] text-slate-400 uppercase font-sans font-bold">BIÊN RÒNG %NM</p>
                    <p className={`font-mono text-sm font-black ${activeCalculatedRow.percentageNM >= 10 ? 'text-emerald-400' : activeCalculatedRow.percentageNM >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {activeCalculatedRow.percentageNM.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-sans font-bold border-t border-slate-800 pt-3">
                  <div className="text-slate-350 flex items-center gap-1">
                    <CheckCircle size={13} className="text-teal-400" />
                    <span>LỢI NHUẬN RÒNG SẢN PHẨM:</span>
                  </div>
                  <span className={`text-[15px] font-black font-mono ${activeCalculatedRow.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {activeCalculatedRow.netProfit >= 0 ? '+' : ''}{formatVND(activeCalculatedRow.netProfit)}
                  </span>
                </div>

                <div className="text-[10px] font-sans font-semibold text-slate-400 leading-relaxed pt-1">
                  {activeCalculatedRow.percentageGM < 20 ? (
                    <p className="text-rose-300">⚠️ Biên gộp của phương án này quá thấp ({activeCalculatedRow.percentageGM.toFixed(1)}%). Nên giảm cơ cấu quà tặng hoặc tăng giá sàn.</p>
                  ) : activeCalculatedRow.percentageNM < 10 ? (
                    <p className="text-amber-300">⚠️ Biên ròng sau phí sàn ({activeCalculatedRow.percentageNM.toFixed(1)}%) chưa đạt tiêu chí tối thiểu 10%. Hãy bớt quà tặng hoặc nâng giá bán.</p>
                  ) : (
                    <p className="text-emerald-300">✅ Biên ròng tuyệt vời! Phương án ổn định %NM đạt {activeCalculatedRow.percentageNM.toFixed(1)}% ({formatVND(activeCalculatedRow.netProfit)}).</p>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 px-5 border-t border-slate-150 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-3xs transition"
              >
                Hoàn tất & Lưu lại
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
