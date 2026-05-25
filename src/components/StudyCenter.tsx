import React, { useState, useMemo } from 'react';
import { MainProduct, PricingTier } from '../types';
import { 
  Brain, HelpCircle, Sparkles, Award, RefreshCw, Eye, EyeOff, 
  CheckCircle, XCircle, ArrowRight, HelpCircle as HelpIcon, Flame,
  Trophy, BookOpen
} from 'lucide-react';

interface StudyCenterProps {
  mainProducts: MainProduct[];
}

export default function StudyCenter({ mainProducts }: StudyCenterProps) {
  const [mode, setMode] = useState<'flashcard' | 'quiz'>('flashcard');

  // Flashcards States
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  // Quiz States
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerState, setAnswerState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Format currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const selectedProduct = mainProducts[selectedProductIndex] || mainProducts[0];

  // Map tier names to Vietnamese
  const tierLabels: Record<PricingTier, string> = {
    rsp: 'Giá bán niêm yết (RSP)',
    cogs: 'Giá vốn thành phẩm (COGS)',
    minPrice: 'Mức giá tối thiểu (MIN PRICE)',
    kolPrice: 'Giá bán KOL / Influencer',
    spike: 'Giá chương trình lớn (SPIKE)',
    miniSpike: 'Giá chương trình nhỏ (MINI SPIKE)',
    bau: 'Giá bán thông dụng hàng ngày (BAU)',
  };

  // Tier descriptions for educational context
  const tierDescriptions: Record<PricingTier, string> = {
    rsp: 'Giá đề xuất chính hãng hiển thị công khai.',
    cogs: 'Giá vốn gốc sản phẩm của bộ phận tài chính.',
    minPrice: 'Mức sàn tuyệt đối không được bán dưới giá này nếu chưa phê duyệt.',
    kolPrice: 'Áp dụng cho các chiến dịch livestream, tiếp thị liên kết.',
    spike: 'Giá khuyến mãi sâu dịp Mega Campaign lớn như 11.11, 12.12.',
    miniSpike: 'Khuyến mãi sự kiện Mid-month hay tuần hội nhóm mua sắm.',
    bau: 'Giá bán kinh doanh ngày thường (Business As Usual).',
  };

  const tiersList: PricingTier[] = ['rsp', 'cogs', 'minPrice', 'kolPrice', 'spike', 'miniSpike', 'bau'];

  // Toggle single card
  const toggleCard = (tier: string) => {
    setFlippedCards(prev => ({ ...prev, [tier]: !prev[tier] }));
  };

  // Flip/unflip all cards
  const flipAll = (flip: boolean) => {
    const nextFlipped: Record<string, boolean> = {};
    if (flip) {
      tiersList.forEach(tier => {
        nextFlipped[tier] = true;
      });
    }
    setFlippedCards(nextFlipped);
  };

  // Dynamically generate a Quiz question
  const currentQuestion = useMemo(() => {
    if (mainProducts.length === 0) return null;

    // Pick a random product
    const randomProdIndex = Math.floor(Math.random() * mainProducts.length);
    const prod = mainProducts[randomProdIndex];

    // Pick a random pricing tier (avoiding barcode/vpcode)
    const tiers: PricingTier[] = ['rsp', 'cogs', 'minPrice', 'kolPrice', 'spike', 'miniSpike', 'bau'];
    const randomTier = tiers[Math.floor(Math.random() * tiers.length)];

    const correctAnswer = prod[randomTier];

    // Generate options
    const optionsSet = new Set<number>();
    optionsSet.add(correctAnswer);

    // Add wrong options from other products or multipliers
    while (optionsSet.size < 4) {
      const modeChance = Math.random();
      if (modeChance < 0.5) {
        // Option from other products
        const otherProd = mainProducts[Math.floor(Math.random() * mainProducts.length)];
        optionsSet.add(otherProd[randomTier]);
      } else {
        // Multiplier of current answer (around +-15% or 30%)
        const mult = 1 + (Math.floor(Math.random() * 4) - 2) * 0.15;
        // Nearest 10.000
        const val = Math.round((correctAnswer * (mult === 1 ? 1.05 : mult)) / 10000) * 10000;
        if (val > 0) optionsSet.add(val);
      }
    }

    const options = Array.from(optionsSet).sort((a, b) => a - b);

    return {
      product: prod,
      tier: randomTier,
      correctAnswer,
      options,
      questionText: `Giá trị của mức ${tierLabels[randomTier].toUpperCase()} của sản phẩm "${prod.name}" là bao nhiêu?`,
    };
  }, [mainProducts, quizTotal]); // regenerates when quizTotal changes (new question)

  // Handle Answer Selection
  const handleAnswerSelect = (option: number) => {
    if (answerState !== 'idle' || !currentQuestion) return;
    
    setSelectedAnswer(option);
    const isCorrect = option === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      setAnswerState('correct');
      setQuizScore(prev => prev + 1);
      setCurrentStreak(prev => {
        const next = prev + 1;
        if (next > bestStreak) setBestStreak(next);
        return next;
      });
    } else {
      setAnswerState('incorrect');
      setCurrentStreak(0);
    }
  };

  // Move to next question
  const handleNextQuestion = () => {
    setAnswerState('idle');
    setSelectedAnswer(null);
    setQuizTotal(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5 gap-3">
        <div>
          <h2 className="text-2xl font-sans font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Brain className="text-indigo-600 animate-pulse" /> Trung Tâm Học Tập Giá Bán
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Chương trình đào tạo phản xạ giá kinh doanh công ty dành cho nhân viên bán hàng
          </p>
        </div>
        
        {/* Study Mode Switcher */}
        <div className="bg-slate-100 border border-slate-200/60 p-1 rounded-xl flex self-start md:self-auto gap-1">
          <button
            onClick={() => { setMode('flashcard'); flipAll(false); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
              mode === 'flashcard' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-950 font-semibold'
            }`}
          >
            <BookOpen size={13} /> Thẻ Flashcard Ghi Nhớ
          </button>
          <button
            onClick={() => { setMode('quiz'); handleNextQuestion(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${
              mode === 'quiz' 
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-950 font-semibold'
            }`}
          >
            <HelpIcon size={13} /> Trắc Nghiệm Phản Xạ
          </button>
        </div>
      </div>

      {mode === 'flashcard' ? (
        <div className="space-y-6 animate-fade-in text-slate-805">
          {/* Card Top Selection Control */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 w-full sm:w-auto">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Chọn sản phẩm cần ghi nhớ giá
                </label>
                <select
                  value={selectedProductIndex}
                  onChange={(e) => { setSelectedProductIndex(Number(e.target.value)); flipAll(false); }}
                  className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full sm:w-[320px] focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold text-slate-800 cursor-pointer"
                >
                  {mainProducts.map((p, index) => (
                    <option key={index} value={index}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Instant Controls */}
              <div className="flex gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => flipAll(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition active:scale-95 shadow-2xs"
                >
                  <Eye size={14} className="text-slate-400" /> Lật toàn thẻ
                </button>
                <button
                  onClick={() => flipAll(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-100 cursor-pointer transition active:scale-95 shadow-2xs"
                >
                  <EyeOff size={14} className="text-slate-400" /> Úp toàn thẻ
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 flex items-center gap-2 border border-slate-200/55 shadow-2xs">
              <span className="font-bold text-slate-700 font-mono text-[9px] bg-white border border-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">Gợi ý</span>
              Mẹo: Nhấp vào từng thẻ sau để lật mở mặt trước (biết giá) hoặc mặt sau (kiểm tra khả năng đoán trước).
            </div>
          </div>

          {/* Flashcard Item Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiersList.map((tier) => {
              const value = selectedProduct ? selectedProduct[tier] : 0;
              const isFlipped = !!flippedCards[tier];
              
              return (
                <div 
                  key={tier}
                  onClick={() => toggleCard(tier)}
                  className="perspective h-[155px] cursor-pointer group"
                >
                  <div className={`relative w-full h-full transition-transform duration-550 transform-stylepreserve ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}>
                    {/* BACK of Card (Facedown - Hide Value) */}
                    <div className="absolute inset-0 bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 flex flex-col justify-between backface-hidden shadow-xs hover:border-slate-700 transition">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-bold tracking-wider opacity-60 text-indigo-200 uppercase">STUDY TIER</span>
                        <Brain size={14} className="text-indigo-400 opacity-80 group-hover:scale-110 transition" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs tracking-tight text-slate-100 uppercase">
                          {tierLabels[tier]}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium font-sans">
                          Nhấp để lật mở mặt chứa giá tiền
                        </p>
                      </div>
                    </div>

                    {/* FRONT of Card (Faceup - Show Value) */}
                    <div className="absolute inset-0 bg-white border border-slate-200 text-slate-900 rounded-2xl p-5 flex flex-col justify-between rotate-y-180 backface-hidden shadow-2xs shadow-indigo-50/50">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-extrabold font-mono bg-slate-100 text-slate-550 px-2 py-0.5 rounded border border-slate-200 uppercase">
                            {tier}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-sans font-bold uppercase tracking-wider">Đã mở</span>
                        </div>
                        <h4 className="font-medium text-xs text-slate-400 mt-2 font-bold">
                          {tierLabels[tier]}
                        </h4>
                      </div>
                      <div>
                        <p className="text-xl font-mono font-extrabold text-slate-900 tracking-tight">
                          {formatVND(value)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 border-t border-slate-100 pt-1.5 line-clamp-1 italic font-medium">
                          {tierDescriptions[tier]}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in text-slate-800">
          {/* Active Quiz Layout */}
          {currentQuestion ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Question Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6 relative overflow-hidden">
                  
                  {/* Decorative Background Accent */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-slate-50 rounded-full translate-x-12 -translate-y-12 border border-slate-200/40" />

                  {/* Question Header Status */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[9px] text-slate-400 tracking-wider">CÂU HỎI TRẮC NGHIỆM</span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-bold text-[10px] text-slate-600 uppercase tracking-wider">
                      Mức: {tierLabels[currentQuestion.tier]}
                    </span>
                  </div>

                  {/* Question Big Text */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] bg-slate-900 text-white font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">Sản phẩm đối chiếu</span>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {currentQuestion.product.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-700 mt-4 leading-relaxed font-sans">
                      {currentQuestion.questionText}
                    </p>
                  </div>

                  {/* Multiple Choice Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrectAnswer = option === currentQuestion.correctAnswer;
                      
                      let btnStyle = 'border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-slate-50/80 hover:shadow-2xs text-slate-700';
                      if (answerState !== 'idle') {
                        if (isCorrectAnswer) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-990 font-black scale-[1.01]';
                        } else if (isSelected) {
                          btnStyle = 'border-rose-500 bg-rose-50 text-rose-990 font-black';
                        } else {
                          btnStyle = 'border-slate-100 bg-slate-50/10 text-slate-400';
                        }
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerSelect(option)}
                          disabled={answerState !== 'idle'}
                          className={`border text-left p-4 rounded-xl font-mono font-bold text-sm transition-all cursor-pointer flex justify-between items-center ${btnStyle}`}
                        >
                          <span>{formatVND(option)}</span>
                          {answerState !== 'idle' && isCorrectAnswer && (
                            <CheckCircle size={16} className="text-emerald-600 shrink-0 ml-1" />
                          )}
                          {answerState !== 'idle' && isSelected && !isCorrectAnswer && (
                            <XCircle size={16} className="text-rose-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* feedback panel / next question */}
                  {answerState !== 'idle' && (
                    <div className={`mt-6 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-up ${
                      answerState === 'correct' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      <div>
                        <h4 className="font-bold text-sm">
                          {answerState === 'correct' ? 'Tuyệt vời! Câu trả lời chính xác!' : 'Tiếc quá, chưa chính xác!'}
                        </h4>
                        <p className="text-xs mt-1 opacity-90 font-medium font-sans">
                          {answerState === 'correct' 
                            ? `Bạn đã nhớ chuẩn mức giá của ${currentQuestion.product.name}.`
                            : `Giá trị đúng là ${formatVND(currentQuestion.correctAnswer)}. Hãy học thêm thẻ ở Flashcard!`
                          }
                        </p>
                      </div>
                      <button
                        onClick={handleNextQuestion}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl cursor-pointer transition active:scale-95 whitespace-nowrap"
                      >
                        Tiếp tục <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics/Leaderboard Column */}
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-5">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                    <Trophy size={16} className="text-amber-500" /> Thống Kê Phản Xạ
                  </h4>

                  {/* Current Streak with dynamic Fire graphic details based on streak counts */}
                  <div className="flex items-center justify-between p-3.5 bg-rose-50/20 border border-rose-100/40 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-rose-50 ${currentStreak > 0 ? 'animate-pulse' : ''}`}>
                        <Flame className={`w-5 h-5 ${currentStreak > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block font-mono uppercase tracking-wider">STREAK ĐANG CÓ</span>
                        <span className="text-base font-black font-mono text-rose-600">{currentStreak} chuỗi</span>
                      </div>
                    </div>
                    {currentStreak >= 3 && (
                      <span className="text-[9px] font-bold text-rose-750 bg-rose-105 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        Đang cháy! 🔥
                      </span>
                    )}
                  </div>

                  {/* Grid of details */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/65 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 block font-mono uppercase tracking-wider">ĐÚNG</span>
                      <span className="text-2xl font-black font-mono text-emerald-600">{quizScore}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/65 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 block font-mono uppercase tracking-wider">KỶ LỤC</span>
                      <span className="text-2xl font-black font-mono text-amber-600">{bestStreak}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 leading-normal font-medium text-slate-605">
                    <div className="flex justify-between text-xs">
                      <span>Tổng số lần trả lời:</span>
                      <span className="font-mono font-bold text-slate-800">{quizTotal} câu</span>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span>Tỷ lệ chính xác:</span>
                      <span className="font-mono font-bold text-slate-850">
                        {quizTotal > 0 ? ((quizScore / quizTotal) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Achievements List */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-3">
                    <Award size={16} className="text-indigo-500" /> Huy Hiệu Đạt Được
                  </h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${quizScore >= 1 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-105 text-slate-300'}`}>
                        <CheckCircle size={14} className="fill-current" />
                      </div>
                      <span className={`text-xs ${quizScore >= 1 ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                        Khai mở (Đúng câu đầu tiên)
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${bestStreak >= 3 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-105 text-slate-300'}`}>
                        <CheckCircle size={14} className="fill-current" />
                      </div>
                      <span className={`text-xs ${bestStreak >= 3 ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                        Khởi đầu cháy (Đạt 3 chuỗi liên tiếp)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${quizScore >= 10 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-105 text-slate-300'}`}>
                        <CheckCircle size={14} className="fill-current" />
                      </div>
                      <span className={`text-xs ${quizScore >= 10 ? 'text-slate-800 font-bold' : 'text-slate-400 font-medium'}`}>
                        Cao thủ định giá (Đúng từ 10 câu)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="py-16 text-center text-sm text-slate-450 font-medium">
              Không thể tải câu hỏi trắc nghiệm vì không tìm thấy sản phẩm cốt lõi.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
