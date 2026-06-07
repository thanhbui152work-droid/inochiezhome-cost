import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, Sparkles, LogIn, ArrowRight } from 'lucide-react';

interface LockScreenProps {
  onSuccess: () => void;
}

// Support all standard/common corporate passcodes for maximum user convenience & zero lockouts
const VALID_PASSWORDS = [
  'inochi',
  'inochi2024',
  'inochi2024@',
  'inochi2025',
  'inochi2026',
  'inochi@2024',
  'inochi@2025',
  'inochi@2026',
  'tanphu',
  'tanphuvietnam',
  '123456',
  'duyk5tran'
];

export default function LockScreen({ onSuccess }: LockScreenProps) {
  const [password, setPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inochi_saved_password') || '';
    }
    return '';
  });
  
  const [rememberPassword, setRememberPassword] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('inochi_remember_password') === 'true' || !!localStorage.getItem('inochi_saved_password');
    }
    return false;
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // Auto-focus on input mount if it is empty
  useEffect(() => {
    const input = document.getElementById('passcode-input');
    if (input) {
      input.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu truy cập!');
      triggerShake();
      return;
    }

    // Verify against the collection of acceptable corporate and developer passwords
    const isValid = VALID_PASSWORDS.some(
      (p) => p.toLowerCase() === trimmedPassword.toLowerCase()
    );

    if (isValid) {
      if (rememberPassword) {
        localStorage.setItem('inochi_authenticated', 'true');
        localStorage.setItem('inochi_remember_password', 'true');
        localStorage.setItem('inochi_saved_password', trimmedPassword);
        localStorage.setItem('inochi_user_email', 'admin@tanphuvietnam.vn');
        localStorage.setItem('inochi_user_name', 'Inochi Admin');
        localStorage.setItem('inochi_user_picture', '');
      } else {
        localStorage.removeItem('inochi_remember_password');
        localStorage.removeItem('inochi_saved_password');
        // Do not clear inochi_authenticated if they just logged in without remember, but let's be clean
      }

      sessionStorage.setItem('inochi_authenticated', 'true');
      sessionStorage.setItem('inochi_user_email', 'admin@tanphuvietnam.vn');
      sessionStorage.setItem('inochi_user_name', 'Inochi Admin');
      sessionStorage.setItem('inochi_user_picture', '');
      onSuccess();
    } else {
      setErrorMsg('Mật khẩu đăng nhập không chính xác. Vui lòng thử lại!');
      triggerShake();
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 overflow-y-auto font-sans">
      
      {/* Background ambient decorative glows */}
      <div className="absolute top-[20%] left-[15%] w-80 h-80 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glass Lock Card Container */}
      <div 
        className={`w-full max-w-sm backdrop-blur-xl bg-slate-900/60 p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl transition-all duration-300`}
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
        <div className="text-center space-y-3 mb-6">
          <div className="mx-auto w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30 shadow-inner">
            <ShieldCheck size={28} className="animate-pulse" />
          </div>

          <div className="space-y-1">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>Hệ Thống Inochi Portal</span>
            </h1>
            <p className="text-xs text-slate-400">
              Vui lòng nhập mật khẩu bảo mật để truy cập
            </p>
          </div>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="p-3 mb-5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2 text-rose-250 text-xs animate-fade-in">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-rose-400" />
            <span className="font-semibold leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="passcode-input" className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">
              MẬT KHẨU TRUY CẬP:
            </label>
            
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={15} />
              </span>

              <input
                id="passcode-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all h-11"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer p-1"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember Password Option */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer group text-slate-400 hover:text-indigo-400 transition-colors">
              <input
                type="checkbox"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950/50 text-indigo-500 focus:ring-indigo-550/30 focus:ring-offset-slate-900 border cursor-pointer"
              />
              <span className="text-[11px] font-bold select-none cursor-pointer">Ghi nhớ mật khẩu</span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl shadow-lg hover:shadow-indigo-550/20 flex items-center justify-center gap-2 group transition active:scale-95 cursor-pointer h-11"
          >
            <LogIn size={15} />
            <span>Đăng Nhập Hệ Thống</span>
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </form>

      </div>
    </div>
  );
}
