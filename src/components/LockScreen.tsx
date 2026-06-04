import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, Key, ArrowRight, Sparkles } from 'lucide-react';

interface LockScreenProps {
  onSuccess: () => void;
}

export default function LockScreen({ onSuccess }: LockScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();

    if (cleanPass.toLowerCase() === 'toiyeuinochi') {
      setErrorMsg('');
      onSuccess();
    } else {
      setErrorMsg('Mật khẩu chưa chính xác. Vui lòng kiểm tra lại!');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-[25%] left-[20%] w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[25%] right-[20%] w-72 h-72 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Lock Card Container with subtle shaking keyframes */}
      <div 
        className={`w-full max-w-md backdrop-blur-xl bg-slate-900/45 p-8 rounded-3xl border border-white/10 shadow-2xl transition-all duration-300 ${
          isShaking ? 'animate-bounce' : ''
        }`}
        style={isShaking ? {
          animation: 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both',
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          perspective: '1000px'
        } : undefined}
      >
        <style>{`
          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }
        `}</style>

        {/* Card Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-inner group">
            <Lock size={24} className="group-hover:rotate-6 transition" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-white to-indigo-300">
                Inochi Portal Access
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Hệ thống Giám sát Biên lợi nhuận & Lịch sử Quà tặng
            </p>
          </div>
        </div>

        {/* Input Form Block */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">
              MẬT KHẨU TRUY CẬP HỆ THỐNG
            </label>
            
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 pointer-events-none">
                <Key size={16} className="text-slate-500" />
              </span>

              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Nhập mã bảo mật..."
                className="w-full pl-10 pr-12 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all h-[44px]"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Feedback error line */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-center gap-2 text-rose-300 text-xs animate-fade-in">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Action Trigger button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-550/30 flex items-center justify-center gap-2 group cursor-pointer transition-all h-[44px]"
          >
            <span>Xác thực truy cập</span>
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </form>

        {/* Dynamic Disclaimer */}
        <div className="mt-8 pt-6 border-t border-slate-850 flex flex-col items-center justify-center gap-1.5 text-center">
          <p className="text-[10px] text-slate-500 font-medium tracking-wide">
            Cổng thông tin bảo mật theo tiêu chuẩn giải pháp doanh nghiệp Inochi Enterprise.
          </p>
        </div>

      </div>
    </div>
  );
}
