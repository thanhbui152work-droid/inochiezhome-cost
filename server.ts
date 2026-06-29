import express from "express";
import path from "path";
import xlsx from "xlsx";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not set. Gemini API calls will fail.");
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Precise and complete fallback main products from the main sheet images
const fallbackMainProducts = [
  { barcode: "", vpCode: "", name: "Nồi chiên không dầu 4L", rsp: 1700000, cogs: 448000, cogsUpdated: 475000, pool: 1225000, minPrice: 950000, kolPrice: 1061000, spike: 1140000, miniSpike: 1311000, bau: 1573000 },
  { barcode: "", vpCode: "", name: "Nồi chiên không dầu 5L", rsp: 2200000, cogs: 631000, cogsUpdated: 669000, pool: 1531000, minPrice: 1150000, kolPrice: 1285000, spike: 1380000, miniSpike: 1587000, bau: 1904000 },
  { barcode: "", vpCode: "", name: "Nồi chiên không dầu 7L", rsp: 3200000, cogs: 692000, cogsUpdated: 734000, pool: 2466000, minPrice: 1300000, kolPrice: 1452000, spike: 1560000, miniSpike: 1794000, bau: 2153000 },
  { barcode: "", vpCode: "", name: "Nồi cơm điện cao tần 1.8L", rsp: 3199000, cogs: 692000, cogsUpdated: 734000, pool: 2465000, minPrice: 1200000, kolPrice: 1341000, spike: 1440000, miniSpike: 1656000, bau: 1987000 },
  { barcode: "", vpCode: "", name: "Nồi cơm điện cao tần cao cấp", rsp: 5990000, cogs: 1500000, cogsUpdated: 1590000, pool: 4400000, minPrice: 2300000, kolPrice: 2570000, spike: 2760000, miniSpike: 3174000, bau: 3809000 },
  { barcode: "", vpCode: "", name: "Máy rửa rau Studio", rsp: 990000, cogs: 320000, cogsUpdated: 339000, pool: 651000, minPrice: 495000, kolPrice: 553000, spike: 594000, miniSpike: 683000, bau: 820000 },
  { barcode: "", vpCode: "", name: "Máy rửa rau Plus", rsp: 1120000, cogs: 320000, cogsUpdated: 339000, pool: 781000, minPrice: 750000, kolPrice: 838000, spike: 900000, miniSpike: 1035000, bau: 1242000 },
  { barcode: "", vpCode: "", name: "Ấm đun", rsp: 799000, cogs: 252340, cogsUpdated: 267000, pool: 532000, minPrice: 400000, kolPrice: 447000, spike: 480000, miniSpike: 552000, bau: 662000 },
  { barcode: "", vpCode: "", name: "Tăm nước du lịch", rsp: 1349000, cogs: 305000, cogsUpdated: 323000, pool: 1026000, minPrice: 600000, kolPrice: 670000, spike: 720000, miniSpike: 828000, bau: 994000 },
  { barcode: "", vpCode: "", name: "Tăm nước thường", rsp: 1139000, cogs: 260000, cogsUpdated: 276000, pool: 863000, minPrice: 430000, kolPrice: 480000, spike: 516000, miniSpike: 593000, bau: 712000 },
  { barcode: "Mã mới", vpCode: "", name: "Nồi chiên không dầu 6in1", rsp: 5500000, cogs: 951958, cogsUpdated: 1009000, pool: 4491000, minPrice: 2750000, kolPrice: 3072000, spike: 3300000, miniSpike: 3795000, bau: 4554000 },
  { barcode: "Mã mới", vpCode: "", name: "Bàn chải điện em bé", rsp: 750000, cogs: 138415, cogsUpdated: 147000, pool: 603000, minPrice: 350000, kolPrice: 391000, spike: 420000, miniSpike: 483000, bau: 580000 },
  { barcode: "Mã mới", vpCode: "", name: "Bàn chải điện cao cấp", rsp: 1290000, cogs: 271463, cogsUpdated: 288000, pool: 1002000, minPrice: 690000, kolPrice: 771000, spike: 828000, miniSpike: 952000, bau: 1142000 },
  { barcode: "Mã mới", vpCode: "", name: "Bàn chải điện thường (mã entry)", rsp: 850000, cogs: 161014, cogsUpdated: 171000, pool: 679000, minPrice: 390000, kolPrice: 436000, spike: 468000, miniSpike: 538000, bau: 646000 },
  { barcode: "Mã mới", vpCode: "", name: "Đầu bàn chải cao cấp", rsp: 150000, cogs: 36722, cogsUpdated: 39000, pool: 111000, minPrice: 85000, kolPrice: 95000, spike: 102000, miniSpike: 117000, bau: 140000 },
  { barcode: "Mã mới", vpCode: "", name: "Đầu bàn chải thường", rsp: 150000, cogs: 31073, cogsUpdated: 33000, pool: 117000, minPrice: 75000, kolPrice: 84000, spike: 90000, miniSpike: 104000, bau: 125000 },
  { barcode: "Mã mới", vpCode: "", name: "Đầu bàn chải em bé", rsp: 120000, cogs: 25423, cogsUpdated: 27000, pool: 93000, minPrice: 65000, kolPrice: 73000, spike: 78000, miniSpike: 90000, bau: 108000 }
];

// Precise and complete fallback COGS products from the COGS sheet images
const fallbackCogsProducts = [
  { barcode: "", mainSku: "HNK.NC61.AK40DES", img: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400", skuPhanLoai: "HNK.NC61.AK40DES", name: "Nồi chiên không dầu 6in1", size: "", color: "", category: "Nồi chiên", filter: "", rsp: 5500000, cogs: 951958 },
  { barcode: "", mainSku: "HNK.NCKD.AK40DNS", img: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400", skuPhanLoai: "HNK.NCKD.AK40DNS", name: "Nồi chiên không dầu 4L", size: "", color: "", category: "Nồi chiên", filter: "", rsp: 1700000, cogs: 448000 },
  { barcode: "", mainSku: "HNK.NCKD.AK50DNS", img: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400", skuPhanLoai: "HNK.NCKD.AK50DNS", name: "Nồi chiên không dầu 5L", size: "", color: "", category: "Nồi chiên", filter: "", rsp: 2200000, cogs: 631000 },
  { barcode: "", mainSku: "HNK.NCKD.AK70DNS", img: "https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?w=400", skuPhanLoai: "HNK.NCKD.AK70DNS", name: "Nồi chiên không dầu 7L", size: "", color: "", category: "Nồi chiên", filter: "", rsp: 3200000, cogs: 692000 },
  { barcode: "", mainSku: "HNK.NCOD.AK40TRS", img: "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=400", skuPhanLoai: "HNK.NCOD.AK40TRS", name: "Nồi cơm điện cao tần 1.8L", size: "", color: "", category: "Nồi cơm", filter: "", rsp: 3199000, cogs: 692000 },
  { barcode: "", mainSku: "HNK.NCCT.AK40TRS", img: "https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=400", skuPhanLoai: "HNK.NCCT.AK40TRS", name: "Nồi cơm điện cao tần cao cấp", size: "", color: "", category: "Nồi cơm", filter: "", rsp: 5990000, cogs: 1500000 },
  { barcode: "", mainSku: "HNK.MKKT.AK00TRS", img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400", skuPhanLoai: "HNK.MKKT.AK00TRS", name: "Máy rửa rau Studio", size: "", color: "", category: "Máy rửa rau", filter: "", rsp: 990000, cogs: 320000 },
  { barcode: "", mainSku: "HNK.MKKT.AKPLTRS", img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400", skuPhanLoai: "HNK.MKKT.AKPLTRS", name: "Máy rửa rau Plus", size: "", color: "", category: "Máy rửa rau", filter: "", rsp: 1120000, cogs: 320000 },
  { barcode: "", mainSku: "HNK.ADDN.AK18TRS", img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400", skuPhanLoai: "HNK.ADDN.AK18TRS", name: "Ấm đun", size: "", color: "", category: "Ấm đun", filter: "", rsp: 799000, cogs: 252340 },
  { barcode: "", mainSku: "HNK.CDOK.2159", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "HNK.CDOK.2159", name: "Bàn chải điện em bé", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 699000, cogs: 138415 },
  { barcode: "", mainSku: "HNK.CDOC.2752", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "HNK.CDOC.2752", name: "Bàn chải điện cao cấp", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 1199000, cogs: 271463 },
  { barcode: "", mainSku: "HNK.CDOL.2808", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "HNK.CDOL.2808", name: "Bàn chải điện thường (mã entry)", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 809000, cogs: 161014 },
  { barcode: "", mainSku: "HNK.TGGO.5260ZZS", img: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400", skuPhanLoai: "HNK.TGGO.5260ZZS", name: "Tăm nước du lịch", size: "", color: "", category: "Tăm nước", filter: "", rsp: 1349000, cogs: 305000 },
  { barcode: "", mainSku: "HNK.TKDO.5610ZZS", img: "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400", skuPhanLoai: "HNK.TKDO.5610ZZS", name: "Tăm nước thường", size: "", color: "", category: "Tăm nước", filter: "", rsp: 1139000, cogs: 260000 },
  { barcode: "", mainSku: "DBCCC", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "DBCCC", name: "Đầu bàn chải cao cấp", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 150000, cogs: 36722 },
  { barcode: "", mainSku: "DBCT", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "DBCT", name: "Đầu bàn chải thường", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 150000, cogs: 31073 },
  { barcode: "", mainSku: "DBCEB", img: "https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400", skuPhanLoai: "DBCEB", name: "Đầu bàn chải em bé", size: "", color: "", category: "Bàn chải điện", filter: "", rsp: 120000, cogs: 25423 },

  // Gift items
  { barcode: "8935275233049", mainSku: "HIN.NTOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NTOS.VD24SHS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Hồng san hô", category: "Nồi chảo quánh", filter: "", rsp: 749000, cogs: 245634 },
  { barcode: "8935275233025", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD24TNS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Trắng ngà", category: "Nồi chảo quánh", filter: "", rsp: 799000, cogs: 263762 },
  { barcode: "8935275233032", mainSku: "HIN.NCOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NCOS.VD28XBS", name: "Nồi vân đá Omi Simple", size: "28 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 1090000, cogs: 383160 },
  { barcode: "8935275233025", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD24XDS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Xanh dương", category: "Nồi chảo quánh", filter: "", rsp: 799000, cogs: 263762 },
  { barcode: "8935275233025", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD24SHS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Hồng san hô", category: "Nồi chảo quánh", filter: "", rsp: 749000, cogs: 263762 },
  { barcode: "8935275233018", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD20XDS", name: "Nồi vân đá Omi Simple", size: "20 cm", color: "Xanh dương", category: "Nồi chảo quánh", filter: "", rsp: 699000, cogs: 219349 },
  { barcode: "8935275233025", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD24XBS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 799000, cogs: 263762 },
  { barcode: "8935275233049", mainSku: "HIN.NTOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NTOS.VD24TNS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Trắng ngà", category: "Nồi chảo quánh", filter: "", rsp: 749000, cogs: 245634 },
  { barcode: "8935275233018", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD20XBS", name: "Nồi vân đá Omi Simple", size: "20 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 699000, cogs: 219349 },
  { barcode: "8935275233018", mainSku: "HIN.NOOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NOOS.VD20TNS", name: "Nồi vân đá Omi Simple", size: "20 cm", color: "Trắng ngà", category: "Nồi chảo quánh", filter: "", rsp: 699000, cogs: 219349 },
  { barcode: "8935275233049", mainSku: "HIN.NTOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NTOS.VD24XBS", name: "Nồi vân đá Omi Simple", size: "24 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 749000, cogs: 245634 },
  { barcode: "8935275233032", mainSku: "HIN.NCOS", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.NCOS.VD28SHS", name: "Nồi vân đá Omi Simple", size: "28 cm", color: "Hồng san hô", category: "Nồi chảo quánh", filter: "", rsp: 1090000, cogs: 383160 },
  { barcode: "8935275233247", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS28HCS", name: "Inochi Chảo chống dính Omi Stellar", size: "28 cm", color: "Hồng cúc", category: "Nồi chảo quánh", filter: "", rsp: 499000, cogs: 164185 },
  { barcode: "8935275233216", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS20XBS", name: "Inochi Chảo chống dính Omi Stellar", size: "20 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 379000, cogs: 109102 },
  { barcode: "8935275233216", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS20HCS", name: "Inochi Chảo chống dính Omi Stellar", size: "20 cm", color: "Hồng cúc", category: "Nồi chảo quánh", filter: "", rsp: 379000, cogs: 109102 },
  { barcode: "8935275233223", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS24XBS", name: "Inochi Chảo chống dính Omi Stellar", size: "24 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 479000, cogs: 133849 },
  { barcode: "8935275233230", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS26XBS", name: "Inochi Chảo chống dính Omi Stellar", size: "26 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 489000, cogs: 150081 },
  { barcode: "8935275233247", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS28XBS", name: "Inochi Chảo chống dính Omi Stellar", size: "28 cm", color: "Xanh bạc hà", category: "Nồi chảo quánh", filter: "", rsp: 499000, cogs: 164185 },
  { barcode: "8935275233223", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS24HCS", name: "Inochi Chảo chống dính Omi Stellar", size: "24 cm", color: "Hồng cúc", category: "Nồi chảo quánh", filter: "", rsp: 479000, cogs: 133849 },
  { barcode: "8935275233230", mainSku: "HIN.CRCD", img: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400", skuPhanLoai: "HIN.CRCD.OS26HCS", name: "Inochi Chảo chống dính Omi Stellar", size: "26 cm", color: "Hồng cúc", category: "Nồi chảo quánh", filter: "", rsp: 489000, cogs: 150081 },
  { barcode: "8935275233339", mainSku: "HIN.QUIN", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.QUIN.GM18ZZS", name: "Inochi Quánh Inox nguyên khối Omi Gourmet", size: "18 cm", color: "Inox", category: "Nồi chảo quánh", filter: "", rsp: 749000, cogs: 230800 },
  { barcode: "8935275207552", mainSku: "HIN.BIGR", img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", skuPhanLoai: "HIN.BIGR.0450HNS", name: "Inochi Bình nước Goki Rudy 450ml", size: "450ml", color: "Hồng nhạt", category: "Bình nước trẻ em", filter: "", rsp: 118000, cogs: 29444 },
  { barcode: "8935275207552", mainSku: "HIN.BIGR", img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", skuPhanLoai: "HIN.BIGR.0450XNS", name: "Inochi Bình nước Goki Rudy 450ml", size: "450ml", color: "Xanh dương", category: "Bình nước trẻ em", filter: "", rsp: 118000, cogs: 29444 },
  { barcode: "8935275207552", mainSku: "HIN.BIGR", img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", skuPhanLoai: "HIN.BIGR.0450XBS", name: "Inochi Bình nước Goki Rudy 450ml", size: "450ml", color: "Xanh bạc hà", category: "Bình nước trẻ em", filter: "", rsp: 118000, cogs: 29444 },
  { barcode: "8935275115373", mainSku: "HIN.HODN", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.HODN.S00MHN1", name: "Inochi Hộp lưu trữ đa năng Sano", size: "Đa năng", color: "Hồng nhạt", category: "Hộp đựng", filter: "Hàng chậm", rsp: 89000, cogs: 14292 },
  { barcode: "8935275213041", mainSku: "HIN.TRTH", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.TRTH.0030HO1", name: "Inochi Thau cao cấp Yoko 30cm", size: "30cm", color: "Hồng", category: "Thau chậu", filter: "Hàng chậm", rsp: 59000, cogs: 16324 },
  { barcode: "8935275213058", mainSku: "HIN.TRTH", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.TRTH.0035HN1", name: "Inochi Thau cao cấp Yoko 35cm", size: "35cm", color: "Hồng nhạt", category: "Thau chậu", filter: "Hàng chậm", rsp: 79000, cogs: 22804 },
  { barcode: "8935275122422", mainSku: "HIN.BIKG", img: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400", skuPhanLoai: "HIN.BIKG.0500XDS", name: "Inochi Bình nước Kita Glow 500ml", size: "500ml", color: "Xanh đậm", category: "Bình nước", filter: "", rsp: 189000, cogs: 49958 },
  { barcode: "8935275226072", mainSku: "HIN.HTDH", img: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400", skuPhanLoai: "HIN.HTDH.B402BBS", name: "Bộ 4 hộp thực phẩm trữ đông", size: "Set 4", color: "Xanh da trời", category: "Hộp TP", filter: "", rsp: 299000, cogs: 48347 }
];

// Helper to sanitize numeric values
const cleanNumber = (val: any) => {
  if (val === undefined || val === null || val === "") return 0;
  const str = String(val).replace(/,/g, "").replace(/đ/g, "").replace(/%/g, "").trim();
  const num = Number(str);
  return isNaN(num) ? 0 : num;
};

// Parsing functions for Google Sheet rows
function parseMainSheet(rows: any[][]) {
  let idxBarcode = 0;
  let idxVpCode = 1;
  let idxName = 2;
  let idxRsp = 3;
  let idxCogs = 4;
  let idxCogsUpdated = 5;
  let idxPool = 6;
  let idxMinPrice = 7;
  let idxKolPrice = 21; // fallback to column V (index 21)
  let idxSpike = 36;    // fallback to column AK (index 36)
  let idxMiniSpike = 51;// fallback to column AZ (index 51)
  let idxBau = 66;      // fallback to column BO (index 66)
  let idxImg = -1;

  // Scan headers to locate dynamic column positions
  if (rows.length > 1) {
    const row0 = rows[0] || [];
    const row1 = rows[1] || [];
    
    for (let c = 0; c < Math.max(row0.length, row1.length); c++) {
      const cell0 = String(row0[c] || "").trim().toUpperCase();
      const cell1 = String(row1[c] || "").trim().toUpperCase();
      
      if (cell1 === "RE-BARCODE" || cell1 === "BARCODE") idxBarcode = c;
      if (cell1 === "VP CODE" || cell1 === "VPCODE") idxVpCode = c;
      if (cell1.includes("PRODUCT NAME") || cell1 === "PRODUCT NAME" || cell1 === "TÊN SẢN PHẨM") idxName = c;
      if (cell1 === "RSP") idxRsp = c;
      if (cell1 === "COGS") idxCogs = c;
      if (cell1.includes("COGS UPDATED")) idxCogsUpdated = c;
      if (cell1 === "POOL") idxPool = c;
      if (cell1 === "MIN PRICE" || cell0 === "MIN PRICE") idxMinPrice = c;
      if (cell0 === "KOL PRICE") idxKolPrice = c;
      if (cell0 === "SPIKE") idxSpike = c;
      if (cell0 === "MINI SPIKE") idxMiniSpike = c;
      if (cell0 === "BAU") idxBau = c;
      if (
        cell1.includes("LINK HÌNH") || cell1.includes("LINK HINH") || 
        cell1.includes("HÌNH") || cell1.includes("HINH") || 
        cell1.includes("IMAGE") || cell1.includes("IMG") ||
        cell0.includes("LINK HÌNH") || cell0.includes("LINK HINH") || 
        cell0.includes("HÌNH") || cell0.includes("HINH") ||
        cell0.includes("IMAGE") || cell0.includes("IMG")
      ) {
        idxImg = c;
      }
    }
  }

  // Fallback check if col 0 looks like an image link
  if (idxImg === -1 && rows.length > 2) {
    const firstCell = String(rows[2]?.[0] || "");
    if (firstCell.startsWith("http://") || firstCell.startsWith("https://")) {
      idxImg = 0;
    }
  }

  const products = [];
  // Data typically begins on row index 2 in our visual sheet layout (row 3 in sheets)
  const startRow = rows.length > 2 ? 2 : 1;
  
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    
    const nameValue = String(row[idxName] || "").trim();
    if (!nameValue || nameValue.toUpperCase() === "PRODUCT NAME" || nameValue.toUpperCase() === "PRODUCT_NAMING") {
      continue;
    }

    const imgVal = idxImg !== -1 ? String(row[idxImg] || "").trim() : undefined;

    products.push({
      barcode: String(row[idxBarcode] || "").trim(),
      vpCode: String(row[idxVpCode] || "").trim(),
      img: imgVal,
      name: nameValue,
      rsp: cleanNumber(row[idxRsp]),
      cogs: cleanNumber(row[idxCogs]),
      cogsUpdated: cleanNumber(row[idxCogsUpdated] || row[idxCogs]),
      pool: cleanNumber(row[idxPool]),
      minPrice: cleanNumber(row[idxMinPrice]),
      kolPrice: cleanNumber(row[idxKolPrice]),
      spike: cleanNumber(row[idxSpike]),
      miniSpike: cleanNumber(row[idxMiniSpike]),
      bau: cleanNumber(row[idxBau]),
    });
  }

  return products.length > 0 ? products : fallbackMainProducts;
}

function parseCogsSheet(rows: any[][]) {
  let idxBarcode = 0;
  let idxMainSku = -1;
  let idxImg = 0;
  let idxSkuPhanLoai = -1;
  let idxName = 3;
  let idxSize = 4;
  let idxColor = 5;
  let idxCategory = 6;
  let idxFilter = -1;
  let idxRsp = -1;
  let idxCogs = 7;
  let idxBoxmeBac = -1;
  let idxBoxmeNam = -1;
  let idxStatusBoxmeBac = -1;
  let idxStatusBoxmeNam = -1;

  // Scan row headers dynamically
  if (rows.length > 0) {
    const limit = Math.min(rows.length, 5);
    for (let r = 0; r < limit; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const rawCell = String(row[c] || "").trim().toUpperCase();
        // Replace all whitespace sequences including tabs, newlines, carriage returns with a single space
        const cell = rawCell.replace(/[\s\r\n]+/g, " ");
        
        if (cell === "BARCODE" || cell === "MÃ VẠCH" || cell === "MA VACH") idxBarcode = c;
        if (cell === "SKU MAIN" || cell === "SKU_MAIN" || cell === "MAIN SKU" || cell === "MAIN_SKU") idxMainSku = c;
        if (cell === "MASTER SKU" || cell === "SKU PHÂN LOẠI" || cell === "SKU PHAN LOAI" || cell === "SKU_PHAN_LOAI" || cell === "MÃ VP" || cell === "MA VP" || cell === "VP CODE") idxSkuPhanLoai = c;
        if (cell === "IMG" || cell === "IMAGE" || cell === "HÌNH ẢNH" || cell === "HINH ANH" || cell.includes("LINK ẢNH") || cell.includes("LINK ANH")) idxImg = c;
        if (cell.includes("PRODUCT NAME") || cell === "PRODUCT NAME" || cell === "TÊN SẢN PHẨM" || cell === "TEN SAN PHAM") idxName = c;
        if (cell === "SIZE" || cell === "KÍCH THƯỚC") idxSize = c;
        if (cell === "COLOR" || cell === "MÀU SẮC" || cell === "MẦU" || cell === "MAU") idxColor = c;
        if (cell === "CATEGORY" || cell === "DANH MỤC" || cell === "LOẠI") idxCategory = c;
        if (cell === "FILTER" || cell === "BỘ LỌC") idxFilter = c;
        if (cell === "RSP") idxRsp = c;
        if (cell === "COGS" || cell === "COGS VỐN" || cell === "GIÁ VỐN") idxCogs = c;
        
        if (cell.includes("BOXME BẮC") || cell.includes("BOXME BAC") || cell === "BOXME_BẮC" || cell === "BOXME_BAC") idxBoxmeBac = c;
        if (cell.includes("BOXME NAM") || cell === "BOXME NAM" || cell === "BOXME_NAM") idxBoxmeNam = c;
        if (cell.includes("STATUS BOXME_BẮC") || cell.includes("STATUS BOXME BẮC") || cell.includes("STATUS BOXME_BAC") || cell.includes("STATUS BOXME BAC") || cell.includes("STATUS_BOXME_BAC") || cell.includes("STATUS_BOXME_BẮC")) idxStatusBoxmeBac = c;
        if (cell.includes("STATUS BOXME_NAM") || cell.includes("STATUS BOXME NAM") || cell.includes("STATUS_BOXME_NAM")) idxStatusBoxmeNam = c;
      }
    }
  }

  // Fallback indices if not specifically matched by headers
  if (idxMainSku === -1 && idxSkuPhanLoai !== -1) {
    idxMainSku = idxSkuPhanLoai;
  } else if (idxSkuPhanLoai === -1 && idxMainSku !== -1) {
    idxSkuPhanLoai = idxMainSku;
  } else if (idxMainSku === -1 && idxSkuPhanLoai === -1) {
    idxMainSku = 1;
    idxSkuPhanLoai = 2; // Default column C for unique sku variation
  }

  const products = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    
    const nameValue = String(row[idxName] || "").trim();
    if (!nameValue || nameValue.toUpperCase() === "PRODUCT NAME" || nameValue.toUpperCase() === "TÊN SẢN PHẨM" || nameValue.toUpperCase() === "TEN SAN PHAM") continue;
    
    const mainSkuStr = String(row[idxMainSku] || "").toUpperCase();
    if (mainSkuStr === "MAIN SKU" || mainSkuStr === "MASTER SKU" || mainSkuStr === "SKU MAIN" || mainSkuStr === "SKU_MAIN") continue;

    const barcodeVal = String(row[idxBarcode] || "").trim();
    const mainSkuVal = String(row[idxMainSku] || "").trim();

    // Skip empty lines
    if (!barcodeVal && !mainSkuVal && !nameValue) continue;

    const boxmeBacVal = idxBoxmeBac !== -1 ? Number(row[idxBoxmeBac]) : undefined;
    const boxmeNamVal = idxBoxmeNam !== -1 ? Number(row[idxBoxmeNam]) : undefined;
    const statusBoxmeBacVal = idxStatusBoxmeBac !== -1 ? String(row[idxStatusBoxmeBac] || "").trim() : undefined;
    const statusBoxmeNamVal = idxStatusBoxmeNam !== -1 ? String(row[idxStatusBoxmeNam] || "").trim() : undefined;

    products.push({
      barcode: barcodeVal,
      mainSku: mainSkuVal,
      img: String(row[idxImg] || "").trim(),
      skuPhanLoai: String(idxSkuPhanLoai !== -1 && row[idxSkuPhanLoai] ? row[idxSkuPhanLoai] : (mainSkuVal || "")).trim(),
      name: nameValue,
      size: String(idxSize !== -1 && row[idxSize] ? row[idxSize] : "").trim(),
      color: String(idxColor !== -1 && row[idxColor] ? row[idxColor] : "").trim(),
      category: String(idxCategory !== -1 && row[idxCategory] ? row[idxCategory] : "").trim(),
      filter: String(idxFilter !== -1 && row[idxFilter] ? row[idxFilter] : "").trim(),
      rsp: idxRsp !== -1 ? cleanNumber(row[idxRsp]) : 0,
      cogs: cleanNumber(row[idxCogs]),
      boxmeBac: isNaN(boxmeBacVal as number) ? undefined : boxmeBacVal,
      boxmeNam: isNaN(boxmeNamVal as number) ? undefined : boxmeNamVal,
      statusBoxmeBac: statusBoxmeBacVal || undefined,
      statusBoxmeNam: statusBoxmeNamVal || undefined,
    });
  }
  return products.length > 0 ? products : fallbackCogsProducts;
}

function parseTonKhoSheet(rows: any[][]) {
  let idxSkuPhanLoai = 2; // Default column C (SKU PHÂN LOẠI)
  let idxWarehouse = 29;  // Default column AD (Warehouse)
  let idxQuantity = 31;   // Default column AF (Quantity in stock)

  if (rows.length > 0) {
    const limit = Math.min(rows.length, 5);
    for (let r = 0; r < limit; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").trim().toUpperCase();
        if (cell === "SKU PHÂN LOẠI" || cell === "SKU PHAN LOAI" || cell === "SKU_PHAN_LOAI") {
          idxSkuPhanLoai = c;
        }
        if (cell === "WAREHOUSE" || cell === "KHO" || cell === "NHÀ KHO" || cell === "NHA KHO") {
          idxWarehouse = c;
        }
        if (cell === "QUANTITY IN STOCK" || cell === "QUANTITY" || cell === "SỐ LƯỢNG" || cell === "SO LUONG" || cell === "TỒN KHO" || cell === "TON KHO") {
          idxQuantity = c;
        }
      }
    }
  }

  const stockRecords = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const sku = String(row[idxSkuPhanLoai] || "").trim();
    if (!sku || sku.toUpperCase() === "SKU PHÂN LOẠI" || sku.toUpperCase() === "SKU PHAN LOAI" || sku.toUpperCase() === "NO") continue;

    const warehouse = String(row[idxWarehouse] || "").trim();
    const qty = cleanNumber(row[idxQuantity]);

    stockRecords.push({
      skuPhanLoai: sku,
      warehouse: warehouse,
      quantity: qty
    });
  }
  return stockRecords;
}

function parseVoucherShopSheet(rows: any[][]) {
  let idxVoucherType = 0;  // Voucher Type (A)
  let idxVoucherScheme = 1; // Voucher Scheme (B)
  let idxPercentDiscount = 2; // % Discount (C)
  let idxCap = 3;  // Cap (D)
  let idxMbs = 4;  // MBS (E)
  let idxPlatform = 8; // Platform (I)

  if (rows && rows.length > 0) {
    const limit = Math.min(rows.length, 3);
    for (let r = 0; r < limit; r++) {
      const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = String(row[c] || "").trim().toUpperCase();
        if (cell === "VOUCHER TYPE" || cell === "LOẠI VOUCHER") idxVoucherType = c;
        if (cell === "VOUCHER SCHEME" || cell === "CHƯƠNG TRÌNH" || cell === "MA" || cell === "MÃ") idxVoucherScheme = c;
        if (cell === "% DISCOUNT" || cell === "PHẦN TRĂM GIẢM" || cell === "CHIẾT KHẤU") idxPercentDiscount = c;
        if (cell === "CAP" || cell === "GIỚI HẠN" || cell === "TỐI ĐA") idxCap = c;
        if (cell === "MBS" || cell === "ĐƠN TỐI THIỂU" || cell === "GIÁ TRỊ TỐI THIỂU") idxMbs = c;
        if (cell === "PLATFORM" || cell === "KÊNH" || cell === "SÀN") idxPlatform = c;
      }
    }
  }

  const vouchers = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const voucherScheme = String(row[idxVoucherScheme] || "").trim();
    if (!voucherScheme || voucherScheme.toUpperCase() === "VOUCHER SCHEME" || voucherScheme.toUpperCase() === "NO") continue;

    const discVal = cleanNumber(row[idxPercentDiscount]);
    const mbsVal = cleanNumber(row[idxMbs]);
    const capVal = cleanNumber(row[idxCap]);
    const platform = String(row[idxPlatform] || "All").trim();

    const hasDiscount = discVal > 0;
    const type = hasDiscount ? 'percent' : 'value';

    let valResult = 0;
    if (type === 'percent') {
      if (discVal <= 1) {
        valResult = Math.round(discVal * 100);
      } else {
        valResult = discVal;
      }
    } else {
      valResult = capVal;
    }

    const vType = String(row[idxVoucherType] || "Always On").trim();
    const vTypeLower = vType.toLowerCase();
    const isActive = vTypeLower === 'always on' || 
                     vTypeLower === 'apply new product' || 
                     vTypeLower.includes('always on') || 
                     vTypeLower.includes('apply new product');

    vouchers.push({
      id: `sv-live-${r}`,
      code: voucherScheme, // e.g. "VC 15K, MBS 199K"
      type: type,
      val: valResult,
      minSpent: mbsVal,
      capVal: capVal || valResult,
      priority: r,
      active: isActive,
      voucherType: vType,
      platform: platform
    });
  }

  return vouchers;
}

// Helper to parse GM DAILY sheet tab
function parseGMDailySheet(rows: any[][]) {
  if (!rows || rows.length < 2) return null;

  const headerRow1 = rows[0] || [];
  const headerRow2 = rows[1] || [];

  const columns: { index: number; date: string; day: string }[] = [];
  
  for (let c = 2; c < Math.max(headerRow1.length, headerRow2.length); c++) {
    let dateVal = String(headerRow1[c] || "").trim();
    const dayVal = String(headerRow2[c] || "").trim();
    
    if (/^\d+$/.test(dateVal)) {
      const serial = parseInt(dateVal, 10);
      const tempDate = new Date((serial - 25569) * 86400 * 1000);
      dateVal = `${tempDate.getUTCDate()}/${tempDate.getUTCMonth() + 1}/${tempDate.getUTCFullYear()}`;
    }
    
    if (dateVal || dayVal) {
      columns.push({
        index: c,
        date: dateVal || (c === 2 ? "TTL" : ""),
        day: dayVal || (c === 2 ? "TOTAL" : "")
      });
    }
  }

  const metrics: Record<string, Record<string, number[]>> = {
    "GMV": {},
    "NMV": {},
    "COGS": {},
    "%GM": {}
  };

  let currentMetric = "GMV";

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const colA_val = String(row[0] || "").trim().toUpperCase();
    const colB_val = String(row[1] || "").trim().toUpperCase();
    const colC_val = String(row[2] || "").trim().toUpperCase();

    if (colA_val.includes("GMV") || colB_val.includes("GMV") || colC_val.includes("GMV")) {
      currentMetric = "GMV";
    } else if (colA_val.includes("NMV") || colB_val.includes("NMV") || colC_val.includes("NMV")) {
      currentMetric = "NMV";
    } else if (colA_val.includes("COGS") || colB_val.includes("COGS") || colC_val.includes("COGS")) {
      currentMetric = "COGS";
    } else if (colA_val.includes("%GM") || colB_val.includes("%GM") || colC_val.includes("%GM")) {
      currentMetric = "%GM";
    } else if (colA_val.includes("GM") || colB_val.includes("GM") || colC_val.includes("GM")) {
      currentMetric = "%GM";
    }

    let channelLabel = "";
    const rawLabel = String(row[1] || row[0] || "").trim();
    const cleanLabelLower = rawLabel.toLowerCase();

    if (cleanLabelLower.includes("shopee_v2") || cleanLabelLower === "shopee_v2" || cleanLabelLower === "shopee") {
      channelLabel = "shopee_v2";
    } else if (cleanLabelLower.includes("tiktok") || cleanLabelLower === "tiktok" || cleanLabelLower === "tiktokshop") {
      channelLabel = "Tiktok";
    } else if (cleanLabelLower.includes("haravan") || cleanLabelLower === "haravan") {
      channelLabel = "Haravan";
    } else if (cleanLabelLower === "ttl" || cleanLabelLower === "total" || cleanLabelLower.includes("tổng") || cleanLabelLower.includes("tong")) {
      channelLabel = "Total";
    }

    if (!channelLabel) {
      const isMetricRow = ["GMV", "NMV", "COGS", "%GM", "% GM"].includes(rawLabel.toUpperCase());
      if (isMetricRow) {
        channelLabel = "Total";
      } else {
        continue;
      }
    }

    const valuesArray: number[] = [];
    for (const col of columns) {
      const cellVal = row[col.index];
      let numVal = cleanNumber(cellVal);

      if (currentMetric === "%GM" && typeof cellVal === "number" && cellVal > 0 && cellVal <= 1) {
        numVal = cellVal * 100;
      }
      valuesArray.push(numVal);
    }

    if (!metrics[currentMetric]) {
      metrics[currentMetric] = {};
    }
    metrics[currentMetric][channelLabel] = valuesArray;
  }

  // Ensure default channels exist to avoid rendering errors
  const channels = ["Total", "shopee_v2", "Tiktok", "Haravan"];
  for (const mKey of ["GMV", "NMV", "COGS", "%GM"]) {
    if (!metrics[mKey]) metrics[mKey] = {};
    for (const ch of channels) {
      if (!metrics[mKey][ch]) {
        metrics[mKey][ch] = new Array(columns.length).fill(0);
      }
    }
  }

  return {
    columns,
    metrics
  };
}

const fallbackGMDailyData = {
  columns: [
    { index: 2, date: "TTL", day: "TOTAL" },
    { index: 3, date: "1/1/2026", day: "Thu" },
    { index: 4, date: "1/2/2026", day: "Fri" },
    { index: 5, date: "1/3/2026", day: "Sat" },
    { index: 6, date: "1/4/2026", day: "Sun" },
    { index: 7, date: "1/5/2026", day: "Mon" },
    { index: 8, date: "1/6/2026", day: "Tue" },
    { index: 9, date: "1/7/2026", day: "Wed" },
    { index: 10, date: "1/8/2026", day: "Thu" },
    { index: 11, date: "1/9/2026", day: "Fri" },
    { index: 12, date: "1/10/2026", day: "Sat" },
    { index: 13, date: "1/11/2026", day: "Sun" },
    { index: 14, date: "1/12/2026", day: "Mon" },
    { index: 15, date: "1/13/2026", day: "Tue" },
    { index: 16, date: "1/14/2026", day: "Wed" },
    { index: 17, date: "1/15/2026", day: "Thu" },
    { index: 18, date: "1/16/2026", day: "Fri" }
  ],
  metrics: {
    "GMV": {
      "Total": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "shopee_v2": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Tiktok": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "Haravan": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    "NMV": {
      "Total": [8887971522, 170024522, 0, 0, 0, 0, 0, 2853300, 1723000, 2051000, 1422000, 2260000, 771000, 1638000, 3057000, 2538000, 3205997, 3645950],
      "shopee_v2": [6020988158, 103873470, 0, 0, 0, 0, 0, 2853300, 1723000, 2051000, 1422000, 2260000, 771000, 1638000, 3057000, 2538000, 2813997, 1260000],
      "Tiktok": [1920569895, 48521842, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 392000, 0],
      "Haravan": [946413469, 17629210, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2385950]
    },
    "COGS": {
      "Total": [5307934798, 69517558, 0, 0, 0, 0, 0, 1222293, 823435, 879788, 784259, 1187901, 427000, 753332, 1459886, 1313366, 1741931, 1447505],
      "shopee_v2": [3623054170, 46451607, 0, 0, 0, 0, 0, 1222293, 823435, 879788, 784259, 1187901, 427000, 753332, 1459886, 1313366, 1402661, 479635],
      "Tiktok": [1318218501, 16690550, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 339270, 0],
      "Haravan": [366662127, 6375401, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 967870]
    },
    "%GM": {
      "Total": [40.3, 59.1, 0, 0, 0, 0, 0, 57.2, 52.2, 57.1, 44.8, 47.4, 44.6, 54.0, 52.3, 48.3, 45.7, 60.3],
      "shopee_v2": [39.8, 55.3, 0, 0, 0, 0, 0, 57.2, 52.2, 57.1, 44.8, 47.4, 44.6, 54.0, 52.3, 48.3, 50.2, 61.9],
      "Tiktok": [31.4, 65.6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13.5, 0],
      "Haravan": [61.3, 63.8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 59.4]
    }
  }
};

const generateFallbackStock = () => {
  const stock = [];
  for (const item of fallbackCogsProducts) {
    if (item.skuPhanLoai) {
      // Add Northern stock
      stock.push({
        skuPhanLoai: item.skuPhanLoai,
        warehouse: "BMVN_BN_VSIP",
        quantity: Math.floor(Math.random() * 150) + 12
      });
      // Add Southern stock
      stock.push({
        skuPhanLoai: item.skuPhanLoai,
        warehouse: "BMVN_HCM_BTN",
        quantity: Math.floor(Math.random() * 120) + 8
      });
    }
  }
  return stock;
};

// REST API for fetching current data (downloads real-time Excel workbook)
app.get("/api/sheets-data", async (req, res) => {
  try {
    const spreadsheetId = "1N82mo4W8Z3A0fa2PuF117zSFm9C90asRrOv1e7FaQjo";
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

    console.log(`Attempting to download latest Sheet data from ${downloadUrl}`);
    const fetchResponse = await fetch(downloadUrl);
    
    if (!fetchResponse.ok) {
      throw new Error(`Google Sheets export returned status ${fetchResponse.status}`);
    }

    const buffer = Buffer.from(await fetchResponse.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: "buffer" });

    // Look for matching sheet tab names (case-insensitive & partial match)
    let mainSheetName = "";
    let tiktokSheetName = "";
    let cogsSheetName = "";
    let tonKhoSheetName = "";
    let gmDailySheetName = "";
    let voucherShopSheetName = "";

    for (const name of workbook.SheetNames) {
      const lower = name.toLowerCase().trim();
      if (lower.includes("tiktok")) {
        tiktokSheetName = name;
      } else if (lower.includes("main") || lower.includes("shopee")) {
        mainSheetName = name;
      } else if (lower.includes("cogs")) {
        cogsSheetName = name;
      } else if (lower.includes("voucher shop") || lower.includes("vouchershop") || lower === "voucher") {
        voucherShopSheetName = name;
      } else if (
        lower.includes("tồn kho") || 
        lower.includes("ton kho") || 
        lower.includes("tonkho") || 
        lower.includes("tốn") ||
        lower.includes("tồn")
      ) {
        tonKhoSheetName = name;
      } else if (lower.includes("gm daily") || lower.includes("gmdaily") || lower.includes("gm_daily")) {
        gmDailySheetName = name;
      }
    }

    // Secondary lookup if mainSheetName wasn't identified by "main" or "shopee", locate the one that is "pricing frame" but NOT "tiktok"
    if (!mainSheetName) {
      for (const name of workbook.SheetNames) {
        const lower = name.toLowerCase().trim();
        if (lower.includes("pricing frame") && !lower.includes("tiktok")) {
          mainSheetName = name;
          break;
        }
      }
    }

    // Default fallbacks if sheet names are exact
    if (!mainSheetName) mainSheetName = workbook.SheetNames[0];
    if (!cogsSheetName) cogsSheetName = workbook.SheetNames[1] || workbook.SheetNames[0];

    const mainSheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[mainSheetName], { header: 1 });
    const cogsSheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[cogsSheetName], { header: 1 });

    const mainProducts = parseMainSheet(mainSheetRaw);
    const cogsProducts = parseCogsSheet(cogsSheetRaw);

    let stockRecords = [];
    if (cogsProducts && cogsProducts.length > 0) {
      const uniqueStock = new Map<string, any>();
      for (const p of cogsProducts) {
        if (p.skuPhanLoai) {
          const valBac = typeof p.boxmeBac === 'number' && !isNaN(p.boxmeBac) ? p.boxmeBac : 0;
          const valNam = typeof p.boxmeNam === 'number' && !isNaN(p.boxmeNam) ? p.boxmeNam : 0;

          const keyBac = `${p.skuPhanLoai}_BMVN_BN_VSIP`;
          uniqueStock.set(keyBac, {
            skuPhanLoai: p.skuPhanLoai,
            warehouse: 'BMVN_BN_VSIP', // Boxme Bắc
            quantity: valBac
          });

          const keyNam = `${p.skuPhanLoai}_BMVN_HCM_BTN`;
          uniqueStock.set(keyNam, {
            skuPhanLoai: p.skuPhanLoai,
            warehouse: 'BMVN_HCM_BTN', // Boxme Nam
            quantity: valNam
          });

          // Also match with barcode if it's different to ensure all client queries match correctly
          if (p.barcode && p.barcode !== p.skuPhanLoai) {
            const keyBacBarcode = `${p.barcode}_BMVN_BN_VSIP`;
            uniqueStock.set(keyBacBarcode, {
              skuPhanLoai: p.barcode,
              warehouse: 'BMVN_BN_VSIP', // Boxme Bắc
              quantity: valBac
            });

            const keyNamBarcode = `${p.barcode}_BMVN_HCM_BTN`;
            uniqueStock.set(keyNamBarcode, {
              skuPhanLoai: p.barcode,
              warehouse: 'BMVN_HCM_BTN', // Boxme Nam
              quantity: valNam
            });
          }
        }
      }
      stockRecords = Array.from(uniqueStock.values());
      console.log(`Successfully mapped ${stockRecords.length} unique stock records from COGS sheet ("Boxme Bắc" and "Boxme Nam")`);
    }

    if (stockRecords.length === 0 && tonKhoSheetName) {
      try {
        const tonKhoSheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[tonKhoSheetName], { header: 1 });
        stockRecords = parseTonKhoSheet(tonKhoSheetRaw);
        console.log(`Parsed stock records count from Ton Kho fallback: ${stockRecords.length}`);
      } catch (err) {
        console.error("Error parsing Ton Kho sheet fallback:", err);
      }
    }

    // If no stock was parsed or the sheet was not found, generate fallback stock
    if (stockRecords.length === 0) {
      stockRecords = generateFallbackStock();
    }

    let tiktokProducts = mainProducts;
    if (tiktokSheetName) {
      try {
        const tiktokSheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[tiktokSheetName], { header: 1 });
        const parsedTiktok = parseMainSheet(tiktokSheetRaw);
        if (parsedTiktok && parsedTiktok.length > 0) {
          tiktokProducts = parsedTiktok;
        }
      } catch (err) {
        console.warn("Error parsing Tiktok sheet, reusing main (shopee) products:", err);
      }
    }

    let gmDailyDataParsed = null;
    if (gmDailySheetName) {
      try {
        const gmDailySheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[gmDailySheetName], { header: 1 });
        gmDailyDataParsed = parseGMDailySheet(gmDailySheetRaw);
        console.log("Successfully parsed GM Daily sheet from workbook!");
      } catch (e: any) {
        console.warn("Failed to parse GM Daily sheet from Google Sheet, using fallback:", e.message);
      }
    }

    let shopVouchers = [];
    if (voucherShopSheetName) {
      try {
        const voucherShopSheetRaw = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[voucherShopSheetName], { header: 1 });
        shopVouchers = parseVoucherShopSheet(voucherShopSheetRaw);
        console.log(`Successfully parsed Voucher Shop sheet: count=${shopVouchers.length}`);
      } catch (e: any) {
        console.warn("Failed to parse Voucher Shop sheet, using fallbacks:", e.message);
      }
    }

    // Default vouchers fallbacks
    const fallbackShopVouchers = [
      { id: 'sv-1', code: 'VC 15K, MBS 199K', type: 'percent', val: 5, minSpent: 199000, capVal: 15000, priority: 1, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-2', code: 'VC 40K, MBS 399K', type: 'percent', val: 7, minSpent: 399000, capVal: 40000, priority: 2, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-3', code: 'VC 55K, MBS 599K', type: 'percent', val: 7, minSpent: 599000, capVal: 55000, priority: 3, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-4', code: 'VC 100K, MBS 999K', type: 'percent', val: 7, minSpent: 999000, capVal: 100000, priority: 4, active: true, platform: 'All', voucherType: 'Always On' },
    ];

    console.log(`Successfully parsed Google Sheets: mainCount=${mainProducts.length}, tiktokCount=${tiktokProducts.length}, cogsCount=${cogsProducts.length}, stockCount=${stockRecords.length}`);
    res.json({
      success: true,
      source: "live_google_sheet",
      main: mainProducts,
      shopee: mainProducts,
      tiktok: tiktokProducts,
      cogs: cogsProducts,
      stock: stockRecords,
      shopVouchers: shopVouchers.length > 0 ? shopVouchers : fallbackShopVouchers,
      gmDaily: gmDailyDataParsed || fallbackGMDailyData
    });
  } catch (error: any) {
    console.warn("Error fetching live sheet, using premium embedded fallback data:", error);
    const fallbackShopVouchers = [
      { id: 'sv-1', code: 'VC 15K, MBS 199K', type: 'percent', val: 5, minSpent: 199000, capVal: 15000, priority: 1, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-2', code: 'VC 40K, MBS 399K', type: 'percent', val: 7, minSpent: 399000, capVal: 40000, priority: 2, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-3', code: 'VC 55K, MBS 599K', type: 'percent', val: 7, minSpent: 599000, capVal: 55000, priority: 3, active: true, platform: 'All', voucherType: 'Always On' },
      { id: 'sv-4', code: 'VC 100K, MBS 999K', type: 'percent', val: 7, minSpent: 999000, capVal: 100000, priority: 4, active: true, platform: 'All', voucherType: 'Always On' },
    ];
    res.json({
      success: false,
      source: "fallback_embedded",
      main: fallbackMainProducts,
      shopee: fallbackMainProducts,
      tiktok: fallbackMainProducts,
      cogs: fallbackCogsProducts,
      stock: generateFallbackStock(),
      shopVouchers: fallbackShopVouchers,
      gmDaily: fallbackGMDailyData,
      error: error.message,
    });
  }
});

// Gemini Shopee Competitor Search with web grounding
app.post("/api/gemini/shopee-competitors", async (req, res) => {
  const { productName } = req.body;
  if (!productName) {
    return res.status(400).json({ error: "Product name is required" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // If no API key, return a highly realistic set of web listings dynamically styled for simulated demo
    const cleanProdName = String(productName).toLowerCase();
    let priceGap = 100000;
    if (cleanProdName.includes("nồi chiên")) priceGap = 150000;
    if (cleanProdName.includes("bàn chải")) priceGap = 40000;
    if (cleanProdName.includes("máy rửa")) priceGap = 100000;

    const basePrice = cleanProdName.includes("6in1") ? 3300000 : 
                      cleanProdName.includes("4l") ? 1140000 : 
                      cleanProdName.includes("5l") ? 1380000 : 1000000;

    const mockCompetitors = [
      {
        title: `[Shopee Mall] ${productName} Giá Sốc - Bảo Hành 2 Năm`,
        priceVND: basePrice + priceGap,
        shopName: "Gia Dụng Mall Việt Nam",
        rating: 4.9,
        soldCount: 1200,
        url: "https://shopee.vn"
      },
      {
        title: `Sản Phẩm Tương Tự ${productName} Nhập Khẩu Chính Hãng`,
        priceVND: basePrice - Math.floor(priceGap * 0.4),
        shopName: "Gia Dụng Giá Rẻ Hơn",
        rating: 4.7,
        soldCount: 850,
        url: "https://shopee.vn"
      },
      {
        title: `Nồi chiên không dầu / Thiết bị tương đương ${productName} loại I`,
        priceVND: basePrice - Math.floor(priceGap * 0.8),
        shopName: "Tập Hoá Tổng Hợp Hà Nội",
        rating: 4.5,
        soldCount: 430,
        url: "https://shopee.vn"
      }
    ];

    return res.json({
      success: true,
      mode: "mock_demo",
      competitors: mockCompetitors,
      message: "Giá trị demo giả lập của sàn Shopee (vui lòng cấu hình GEMINI_API_KEY trong Settings để chạy tìm kiếm thực tế)."
    });
  }

  try {
    // Use gemini-3.5-flash with Google Search grounding
    const prompt = `Bạn hãy tìm kiếm trên google và sàn Shopee Việt Nam các sản phẩm tương tự hoặc đối thủ cạnh tranh có tên: "${productName}". 
Trả về danh sách gồm 3 đến 5 sản phẩm tương đương đang bán trên shopee hoặc các shop online khác tại Việt Nam. Vui lòng cung cấp chi tiết bao gồm: tên shop, tên sản phẩm, giá bán (VND) và số lượng đã bán nếu có.

Yêu cầu xuất ra định dạng JSON đúng chuẩn với cấu trúc:
[
  {
    "title": "Tên sản phẩm tương tự của đối thủ",
    "priceVND": 1200000, 
    "shopName": "Tên shop bán hàng",
    "rating": 4.8,
    "soldCount": 250,
    "url": "https://shopee.vn"
  }
]
Giá trị priceVND phải là một số nguyên tính theo VND, không chứa ký tự đặc biệt hay dấu phẩy. Hãy phân tích các kết quả thực tế tìm được. 
Chỉ trả về JSON thô trong khối mã để tôi parse, tuyệt đối không viết thêm lời dẫn học thuật nào ngoài cấu trúc JSON!`;

    console.log(`Running Gemini web search to find Shopee competitors for: ${productName}`);
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2
      }
    });

    const bodyText = response.text || "";
    let cleanJsonStr = bodyText.trim();
    
    // Remote markdown formatting
    if (cleanJsonStr.startsWith("```json")) {
      cleanJsonStr = cleanJsonStr.substring(7);
    }
    if (cleanJsonStr.startsWith("```")) {
      cleanJsonStr = cleanJsonStr.substring(3);
    }
    if (cleanJsonStr.endsWith("```")) {
      cleanJsonStr = cleanJsonStr.substring(0, cleanJsonStr.length - 3);
    }
    cleanJsonStr = cleanJsonStr.trim();

    const competitorList = JSON.parse(cleanJsonStr);

    // Extract citations or grounding metadata if any
    const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      success: true,
      mode: "live_gemini_search",
      competitors: competitorList,
      citations: searchChunks.map((c: any) => ({
        title: c.web?.title || "",
        uri: c.web?.uri || ""
      }))
    });
  } catch (error: any) {
    console.error("Gemini competitor search failed:", error);
    res.status(500).json({ error: "Failed to fetch competitor data from Gemini: " + error.message });
  }
});

// Helper to parse data URL into mimeType and base64 data for Gemini
const parseDataUrl = (dataUrl: string) => {
  const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  return null;
};

// AI Chatbot Assistant for strategy, quizzes, combos and pricing queries
app.post("/api/ai-chat", async (req, res) => {
  const { messages, mainProducts, cogsProducts } = req.body;
  
  const ai = getGeminiClient();
  if (!ai) {
    const lastUserImg = messages && messages.length > 0 ? [...messages].reverse().find(m => m.role === "user" && m.image) : null;
    let offlineReply = "Chào bạn! Tôi là trợ lý AI phân tích chiến lược định giá và cố vấn chiến dịch TMĐT. Do `GEMINI_API_KEY` chưa được cấu hình, tôi đang chạy ở chế độ offline.";
    
    if (lastUserImg) {
      offlineReply += "\n\n📸 **[Chế độ Offline]** Tôi nhận thấy bạn đã tải lên/paste một hình ảnh chiến dịch (Chương trình đặc biệt của Shopee hoặc TikTok Shop). \n\nĐể phân tích chi tiết hình ảnh này bằng thị giác máy tính của Gemini, bạn vui lòng nhập **GEMINI_API_KEY** trong mục **Settings > Secrets** trên thanh công cụ nhé!\n\n**Gợi ý phân tích chiến dịch dựa vào định hướng hình ảnh của bạn:**\n1. **Xem xét Biên Lợi Nhuận Gộp (GM%)**: Đối chiếu mức giá giảm đề xuất trong ảnh với khung giá hiện trưng bày của chúng ta (ví dụ so sánh coi có dưới mức giá sàn **MIN** hay không).\n2. **Tối ưu Quà tặng kèm**: Nếu tham gia chiến dịch lớn này, khuyến nghị phối hợp tặng các món quành có COGS tối ưu (như *Inochi Bình nước Kita Glow* - chỉ 49.958đ hoặc *Bộ 4 hộp trữ đông* - chỉ 48.347đ) để chi phí quà tặng luôn nằm trong định mức cho phép (mặc định 8%).\n3. **Cân nhắc CF Fee (Đồng tài trợ)**: Xem sàn yêu cầu tài trợ bao nhiêu % (ví dụ 10% cho TikTok Shop) để cộng vào chi phí xem Net Pool về tay có đủ bù COGS và đem lại lợi nhuận không.";
    } else {
      offlineReply += "\n\nBạn có thể hỏi hoặc paste/tải hình ảnh chương trình đặc biệt lên để tôi tư vấn sản phẩm Inochi nào tham gia thì tối ưu biên lợi nhuận nhé!";
    }
    
    return res.json({
      reply: offlineReply
    });
  }

  try {
    const systemPrompt = `Bạn là chuyên gia cố vấn chiến lược định giá bán lẻ (Pricing Analyst) kiêm chuyên gia vận hành sàn TMĐT (Shopee, TikTok Shop, Lazada) cho thương hiệu gia dụng cao cấp Inochi tại Việt Nam.
Bạn có quyền truy cập vào thông tin sản phẩm và quà tặng sau:
- Danh sách sản phẩm chính (Main products): ${JSON.stringify(mainProducts || [])}
- Danh sách giá thành quà tặng COGS (COGS gift products): ${JSON.stringify(cogsProducts || [])}

Nhiệm vụ của bạn là:
1. Hộp trợ người dùng phân tích giá sản phẩm, gợi ý các combo khuyến mãi thông minh có quà tặng sao cho tổng giá thành (COGS của sản phẩm + COGS của quà tặng) không vượt quá ngân sách khuyến mãi và tối ưu hóa tỷ lệ lợi nhuận gộp.
2. PHÂN TÍCH HÌNH ẢNH / ẢNH CHỤP MÀN HÌNH CHƯƠNG TRÌNH ĐẶC BIỆT: Người dùng sẽ paste hoặc tải lên hình ảnh chụp màn hình các chương trình khuyến mãi khuyên tham gia từ sàn Shopee/TikTok Shop (như Flash Sale, Prime Day, Live Campaign, voucher co-funding CF, gói trợ giá...). Bạn hãy:
   - Phân tích thông tin chiết khấu/giá bán hoặc luật lệ chương trình xuất hiện trong ảnh.
   - Đối chiếu mức giá yêu cầu của chương trình với khung giá sản phẩm Inochi của ta (RSP, BAU, SPIKE, KOL, MIN).
   - Đưa ra khuyến nghị chân thành và chi tiết: Có nên đăng ký tham gia hay không? Nếu tham gia thì SKU nào của Inochi là tối ưu nhất? Nên cài đặt quà tặng Inochi kèm theo thế nào để tối đa hoá tỷ lệ NM (Net Margin) và Net Pool về tay?

Hãy trả lời bằng tiếng Việt một cách thông minh, súc tích, chuyên nghiệp và có chiều sâu chiến lược. Đối với các yêu cầu đề xuất combo quà tặng/tham gia chiến dịch:
- Liệt kê rõ giá vốn COGS của sản phẩm chính và COGS của quà tặng.
- Tính toán tỷ giá lợi nhuận gộp theo từng mức giá (RSP, BAU, SPIKE, KOL, MIN) để người bán đưa ra quyết định thông minh nhất.
- Đưa ra lời khuyên thực tế.`;

    // Map messages payload to Gemini contents format
    let formattedContents = (messages || [])
      .map((m: any) => {
        const parts: any[] = [];
        const textContent = (m.content || m.text || "").trim();
        if (textContent) {
          parts.push({ text: textContent });
        }
        
        if (m.image) {
          const parsed = parseDataUrl(m.image);
          if (parsed) {
            parts.push({
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data
              }
            });
          }
        }
        
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: parts
        };
      })
      .filter((c: any) => c.parts.length > 0);

    // Find the first index of "user" to ensure history starts with user turn as required by Gemini API
    const firstUserIdx = formattedContents.findIndex((c: any) => c.role === "user");
    if (firstUserIdx !== -1) {
      formattedContents = formattedContents.slice(firstUserIdx);
    } else {
      formattedContents = [];
    }

    if (formattedContents.length === 0) {
      return res.json({
        reply: "Chào bạn! Vui lòng gửi một nội dung câu hỏi hoặc tải hình ảnh lên để tôi bắt đầu tư vấn chiến lược."
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    res.json({
      reply: response.text || "Xin lỗi, tôi không thể xử lý câu trả lời tại thời điểm này."
    });
  } catch (error: any) {
    console.error("Gemini Chat failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Setup Vite Dev server or Serve production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Custom server running at http://localhost:${PORT}`);
  });
}

startServer();
