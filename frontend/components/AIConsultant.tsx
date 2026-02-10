
import React, { useState, useRef, useEffect } from 'react';
import { getBathroomAdvice } from '../geminiService';
import { ChatMessage, Language } from '../types';
import { translations } from '../translations';

interface AIConsultantProps {
  language: Language;
}

const AIConsultant: React.FC<AIConsultantProps> = ({ language }) => {
  const t = translations;
  const initialMessages: Record<Language, string> = {
    en: 'Hello! I am your TopMax design consultant. Are you looking to renovate your bathroom?',
    ru: 'Здравствуйте! Я ваш консультант по дизайну TopMax. Планируете ремонт ванной комнаты?',
    kk: 'Сәлеметсіз бе! Мен сіздің TopMax дизайн бойынша кеңесшіңізбін. Ванна бөлмесін жөндеуді жоспарлап отырсыз ба?'
  };

  const suggestions = [
    t.aiSuggestion1[language],
    t.aiSuggestion2[language],
    t.aiSuggestion3[language]
  ];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: initialMessages[language] }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    const finalInput = text || input;
    if (!finalInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: finalInput };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await getBathroomAdvice(finalInput, history, language);
    
    setMessages(prev => [...prev, { role: 'model', text: response || 'Error' }]);
    setIsTyping(false);
  };

  return (
    <div className="max-w-4xl mx-auto my-12 px-4 flex flex-col h-[750px]">
      <div className="bg-slate-900 p-8 rounded-t-[3rem] text-white flex items-center gap-4 shadow-xl">
         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl">🎩</div>
         <div>
           <h2 className="font-black text-xl leading-none">TopMax Virtual Expert</h2>
           <span className="text-blue-400 text-xs font-black uppercase tracking-widest animate-pulse">Online & Ready to Help</span>
         </div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-white border-x shadow-inner no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[2rem] shadow-sm text-lg leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-gray-50 border border-gray-100 text-slate-800 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-gray-50 p-6 rounded-[2rem] rounded-tl-none flex gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
      </div>

      <div className="p-8 bg-white border-x border-b rounded-b-[3rem] shadow-2xl">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-3 mb-6">
           {suggestions.map((s, i) => (
             <button 
              key={i} 
              onClick={() => handleSend(s)}
              className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-black rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
             >
               {s}
             </button>
           ))}
        </div>

        <div className="flex space-x-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-slate-900 font-medium text-lg outline-none"
            placeholder="Ask anything about bathroom design..."
          />
          <button 
            onClick={() => handleSend()} 
            disabled={isTyping} 
            className="bg-slate-900 text-white w-14 h-14 rounded-xl font-black flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg active:scale-90 disabled:opacity-50"
          >
            <svg className="w-6 h-6 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConsultant;
