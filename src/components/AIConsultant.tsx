import React, { useState, useRef, useEffect } from 'react';
import { MainProduct, CogsProduct } from '../types';
import { 
  MessageSquare, Sparkles, Send, RefreshCw, HelpCircle, 
  Lightbulb, ChevronRight, Brain
} from 'lucide-react';

interface AIConsultantProps {
  mainProducts: MainProduct[];
  cogsProducts: CogsProduct[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIConsultant({ mainProducts, cogsProducts }: AIConsultantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Chào bạn! Tôi là **Trợ lý Tư vấn Chiến lược Định giá AI**. Tôi có quyền truy cập toàn bộ bảng định giá sản phẩm và danh mục quà tặng Inochi hiện có.\n\nHãy chọn một câu hỏi gợi ý bên dưới hoặc nhắn trực tiếp cho tôi để bắt đầu tính toán!'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Pre-configured quick questions
  const preConfiguredQuestions = [
    { label: '🔥 Đề xuất combo Nồi Chiên 5L', query: 'Gợi ý các quà tặng Inochi tối ưu nhất cho Nồi chiên không dầu 5L ở giá bán ngày thường (BAU) để giữ biên lợi nhuận trên 30%.' },
    { label: '📊 Phân tích Tăm Nước giá rẻ', query: 'Hãy phân tích bài toán định giá của Tăm nước du lịch. Nhận diện các mức giá tối thiểu (Min Price) so với giá BAU và giá KOL.' },
    { label: '💡 Thiết lập Mega Campaign tuần', query: 'Xây dựng một kịch bản trợ giá tặng quà cho đợt sale lớn Mega Spike nhằm kích cầu sản phẩm Bàn chải điện cao cấp.' }
  ];

  // Send message to Express endpoint
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const chatPayload = {
        messages: [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content
        })),
        mainProducts,
        cogsProducts
      };

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload)
      });

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply || "Xin lỗi, tôi gặp trục trặc trong quá trình kết nối với máy chủ AI."
      }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Đã xảy ra lỗi khi kết nối với mô hình Gemini AI. Vui lòng thử lại sau giây lát!"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[520px] overflow-hidden">
      {/* Advisor Header */}
      <div className="bg-slate-50/80 px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-150">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">Trợ lý Chiến lược AI</h3>
            <p className="text-[10px] text-slate-400 font-bold font-sans">Bổ trợ bởi mô hình Gemini 1.5 Pro</p>
          </div>
        </div>
        
        <button
          onClick={() => setMessages([
            {
              role: 'assistant',
              content: 'Chào bạn! Tôi đã làm mới lịch sử tư vấn. Hãy cùng thảo luận về bài toán tối ưu biên gộp và lập combo bán hàng nào.'
            }
          ])}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 focus:outline-none flex items-center gap-1 cursor-pointer transition"
          title="Xoá lịch sử hội thoại"
        >
          <RefreshCw size={12} /> Làm mới
        </button>
      </div>

      {/* Conversation Thread Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((m, id) => {
          const isUser = m.role === 'user';
          return (
            <div 
              key={id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser 
                  ? 'bg-slate-900 text-white rounded-br-none font-medium shadow-2xs' 
                  : 'bg-white text-slate-805 rounded-bl-none border border-slate-200 shadow-3xs'
              }`}>
                {/* Parse minimal bold notations */}
                <div className="whitespace-pre-wrap select-text font-medium">
                  {m.content.split('\n').map((paragraph, index) => {
                    const formatted = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-950">$1</strong>');
                    return (
                      <p 
                        key={index} 
                        className={index > 0 ? 'mt-2' : ''}
                        dangerouslySetInnerHTML={{ __html: formatted }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 text-sm text-slate-400 flex items-center gap-1.5 font-bold shadow-3xs">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-bounce delay-200" />
              <span className="text-[11px] ml-1 font-sans">AI đang hoạch định chiến thuật...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions panel */}
      {messages.length === 1 && !isTyping && (
        <div className="px-4 py-2.5 bg-indigo-50/20 border-t border-slate-200">
          <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider block mb-1.5 flex items-center gap-1">
            <Lightbulb size={12} className="text-indigo-600" /> Đề xuất chủ đề nhanh:
          </span>
          <div className="flex flex-col gap-1.5">
            {preConfiguredQuestions.map((q, id) => (
              <button
                key={id}
                onClick={() => handleSendMessage(q.query)}
                className="text-left py-2 px-3 text-xs bg-white hover:bg-indigo-50/50 border border-slate-200 text-slate-705 font-bold rounded-xl transition cursor-pointer flex justify-between items-center group active:scale-[0.99]"
              >
                <span>{q.label}</span>
                <ChevronRight size={10} className="text-indigo-400 group-hover:translate-x-0.5 transition" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputMessage);
        }}
        className="px-4 py-3 border-t border-slate-200 flex items-center gap-2 bg-white"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Hỏi về biên gộp, quà tặng hoặc định hướng khuyến mãi..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 font-bold text-slate-805"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isTyping}
          className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-slate-850 active:scale-95 focus:outline-none transition shrink-0 cursor-pointer disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
