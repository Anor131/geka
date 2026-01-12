
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from './types';
import { TASK_REGISTRY, Task } from './tasks';

const MODULES = [
  { id: 'web', label: 'مهام الإنترنت', en: 'Web Tasks' },
  { id: 'clean', label: 'تنظيف النظام', en: 'System Clean' },
  { id: 'smart', label: 'القرارات الذكية', en: 'Smart Decisions' },
  { id: 'dev', label: 'البرمجة والتطوير', en: 'Dev & Coding' },
  { id: 'system', label: 'الصيانة العامة', en: 'Maintenance' }
];

const App: React.FC = () => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [apiKey, setApiKey] = useState(process.env.API_KEY || '');
  const [activeModule, setActiveModule] = useState('web');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('user_api_key');
    if (savedKey) setApiKey(savedKey);
    addTerminalLine("LOCAL_HOST: Connected to System Kernel.");
  }, []);

  const addTerminalLine = (line: string) => {
    setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-6));
  };

  const callLocalExecutor = async (command: string) => {
    addTerminalLine(`EXECUTING_SHELL: ${command.slice(0, 20)}...`);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        addTerminalLine("SUCCESS: Mission accomplished.");
      } else {
        addTerminalLine(`FAILED: ${data.message.slice(0, 30)}`);
      }
    } catch (e) {
      addTerminalLine("KERNEL_ERROR: Bridge failed.");
    }
  };

  const executeMission = async (task?: Task | string) => {
    if (isProcessing) return;
    if (!apiKey) { setShowSettings(true); return; }
    
    setIsProcessing(true);
    setIsThinking(true);
    const taskLabel = typeof task === 'object' ? task.label : task || customPrompt;

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ text: `Generate a single Windows CMD command for: ${taskLabel}. 
Return JSON: { "summary": "brief description", "command": "the_cmd_code" }` }] },
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    command: { type: Type.STRING }
                },
                required: ["summary", "command"]
            }
        }
      });

      const result = JSON.parse(response.text);
      setMessages(prev => [{ id: Date.now().toString(), role: 'assistant', content: response.text }, ...prev]);
      
      // التنفيذ التلقائي للأوامر
      await callLocalExecutor(result.command);
      
      setCustomPrompt('');
    } catch (err) {
      addTerminalLine("ERROR: Link failed.");
    } finally {
      setIsProcessing(false);
      setIsThinking(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-black ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="h-20 glass-panel border-b border-[#bf953f]/30 flex items-center justify-between px-10 z-[70]">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-xl gold-gradient p-[2px] shadow-lg">
            <div className="w-full h-full bg-[#080808] rounded-xl flex items-center justify-center luxury-font text-2xl text-[#bf953f]">J</div>
          </div>
          <h1 className="text-xl font-black gold-text-gradient luxury-font">JARVIS LOCAL v3.0</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="text-[#bf953f] hover:text-white transition-all">⚙️</button>
      </header>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6">
           <div className="w-full max-w-sm gold-border glass-panel rounded-3xl p-10">
              <h2 className="text-2xl gold-text-gradient mb-6 text-center">Config</h2>
              <input 
                type="password" value={apiKey} onChange={(e) => {setApiKey(e.target.value); localStorage.setItem('user_api_key', e.target.value);}}
                placeholder="Gemini API Key" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6"
              />
              <button onClick={() => setShowSettings(false)} className="w-full py-4 gold-gradient text-black font-black rounded-xl">SAVE</button>
           </div>
        </div>
      )}

      <main className="flex-1 flex p-8 gap-8 overflow-hidden">
        {/* Registry */}
        <aside className="w-[380px] flex flex-col gap-6">
          <div className="flex-1 gold-border glass-panel rounded-3xl p-6 flex flex-col overflow-hidden">
             <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 border-b border-white/5 pb-2">
                {MODULES.map(m => (
                  <button key={m.id} onClick={() => setActiveModule(m.id)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[11px] font-bold ${activeModule === m.id ? 'bg-[#bf953f] text-black' : 'text-white/40'}`}>
                    {lang === 'ar' ? m.label : m.en}
                  </button>
                ))}
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
               {TASK_REGISTRY[activeModule]?.map(task => (
                 <button key={task.id} onClick={() => executeMission(task)} className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/5 text-start hover:border-[#bf953f]/40 transition-all">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[14px] font-bold text-white">{task.label}</span>
                   </div>
                   <p className="text-[11px] text-white/30">{task.description}</p>
                 </button>
               ))}
             </div>
          </div>
          <div className="h-40 gold-border glass-panel rounded-2xl p-4 font-mono text-[11px] text-cyan-400 bg-black/60 overflow-hidden">
             {terminalLines.map((line, i) => <div key={i} className="mb-1 opacity-70 truncate">{line}</div>)}
          </div>
        </aside>

        {/* Console */}
        <section className="flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="flex-1 gold-border glass-panel rounded-[3rem] relative flex flex-col overflow-hidden">
             
             {isThinking && <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-[#bf953f] text-black px-8 py-2 rounded-full font-black animate-pulse">PROCESSING...</div>}

             <div className="flex-1 p-10 overflow-y-auto space-y-8 custom-scrollbar" ref={scrollRef}>
               {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center opacity-20">
                    <span className="luxury-font text-9xl gold-text-gradient">J</span>
                    <p className="tracking-[1em] text-[#bf953f]">LOCAL READY</p>
                 </div>
               )}
               {messages.map(m => {
                 const data = JSON.parse(m.content);
                 return (
                   <div key={m.id} className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                      <div className="gold-border bg-black/40 rounded-3xl p-8 border-[#bf953f]/20">
                         <p className="text-2xl text-white font-black mb-6">{data.summary}</p>
                         <div className="bg-black rounded-2xl p-6 border border-cyan-500/30 font-mono text-green-400 text-lg">
                            <code>{data.command}</code>
                         </div>
                      </div>
                   </div>
                 );
               })}
             </div>

             <div className="p-8 bg-black/60 border-t border-white/5">
                <div className="max-w-4xl mx-auto flex gap-4">
                  <input 
                    value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeMission()}
                    placeholder="Ask JARVIS locally..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-[#bf953f]"
                  />
                  <button onClick={() => executeMission()} className="px-10 gold-gradient text-black font-black rounded-2xl shadow-xl">RUN</button>
                </div>
             </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
