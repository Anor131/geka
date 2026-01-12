
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Asset, Message } from './types';
import { TASK_REGISTRY, Task } from './tasks';

const MODULES = [
  { id: 'clean', label: 'تنظيف النظام', icon: '🧹' },
  { id: 'smart', label: 'القرارات الذكية', icon: '🧠' },
  { id: 'web', label: 'مهام الإنترنت', icon: '🌐' },
  { id: 'dev', label: 'البرمجة والتطوير', icon: '💻' },
  { id: 'system', label: 'الصيانة العامة', icon: '⚙️' }
];

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState('clean');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [securityHold, setSecurityHold] = useState<{ task: string, command: string, description: string, executor: string, plan?: string[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedAssets = localStorage.getItem('gold_assets');
    const savedMessages = localStorage.getItem('gold_messages');
    if (savedAssets) setAssets(JSON.parse(savedAssets));
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    addTerminalLine("JARVIS_EXEC: System optimization modules online.");
  }, []);

  useEffect(() => {
    localStorage.setItem('gold_assets', JSON.stringify(assets));
    localStorage.setItem('gold_messages', JSON.stringify(messages));
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assets, messages]);

  const addTerminalLine = (line: string) => {
    setTerminalLines(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`].slice(-6));
  };

  const analyzeAsset = async (assetId: string, base64Data: string, mimeType: string) => {
    addTerminalLine(`AI_SCAN: Analyzing asset content for indexing...`);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: "Analyze this file. Provide a concise alt-text description and a list of 5 relevant tags for categorization. Output in JSON format." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              altText: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["altText", "tags"]
          }
        }
      });

      const analysis = JSON.parse(response.text);
      setAssets(prev => prev.map(a => 
        a.id === assetId ? { ...a, altText: analysis.altText, tags: analysis.tags, isAnalyzing: false } : a
      ));
      addTerminalLine(`AI_SCAN: Indexing complete for node ${assetId.slice(-4)}.`);
    } catch (err) {
      addTerminalLine(`AI_SCAN_ERROR: Failed to analyze asset.`);
      setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isAnalyzing: false } : a));
    }
  };

  const executeMission = async (task?: Task | string) => {
    setIsProcessing(true);
    const isObjectTask = typeof task === 'object';
    const taskLabel = isObjectTask ? task.label : task || customPrompt;
    const defaultExecutor = isObjectTask ? task.executor : 'ai_core';

    addTerminalLine(`SCANNING: Initiating sequence for: ${taskLabel}`);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const systemInstruction = `
        أنت محرك Jarvis للتنفيذ (Execution Engine) والمسؤول عن صيانة النظام.
        مهمتك: تحويل طلب المستخدم لـ "خطة تنفيذية" وأمر برمي (CLI Command).
        تصنيفات المهام الحالية تشمل "تنظيف النظام" (Cleaning):
        - يجب توليد أوامر CMD أو PowerShell حقيقية لمسح ملفات الـ Temp، الكاش، وتحرير الـ RAM.
        - إذا كان الأمر يمس ملفات النظام أو يتطلب صلاحيات أدمن، يجب تفعيل requiresApproval = true.
        - في قسم الذكاء: قدم تحليلات دقيقة لموارد الجهاز.
      `;

      let parts: any[] = [{ text: systemInstruction }, { text: `MISSION_REQUEST: ${taskLabel}` }];
      
      if (selectedAsset) {
        parts.push({ 
          inlineData: { 
            data: selectedAsset.url.split(',')[1], 
            mimeType: selectedAsset.mimeType 
          } 
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              steps: { type: Type.ARRAY, items: { type: Type.STRING } },
              command: { type: Type.STRING },
              executor: { type: Type.STRING },
              riskLevel: { type: Type.STRING },
              requiresApproval: { type: Type.BOOLEAN }
            },
            required: ["summary", "steps", "command", "riskLevel", "requiresApproval"]
          }
        }
      });

      const result = JSON.parse(response.text);

      if (result.requiresApproval || result.riskLevel === 'high' || (isObjectTask && task.isSensitive)) {
        addTerminalLine(`SECURITY: High-risk maintenance detected. Admin approval required.`);
        setSecurityHold({
          task: taskLabel,
          command: result.command,
          description: result.summary,
          executor: result.executor || defaultExecutor,
          plan: result.steps
        });
        setIsProcessing(false);
      } else {
        finalizeExecution(result);
      }
    } catch (err) {
      addTerminalLine(`ERROR: Optimization bridge failure. System standby.`);
      setIsProcessing(false);
    }
  };

  const finalizeExecution = (result: any) => {
    setMessages(prev => [{
      id: Date.now().toString(),
      role: 'assistant',
      content: JSON.stringify(result),
      type: 'code',
      model: result.executor
    }, ...prev]);
    addTerminalLine(`SUCCESS: System optimization via ${result.executor} deployed.`);
    setSecurityHold(null);
    setCustomPrompt('');
    setIsProcessing(false);
  };

  const currentTasks = TASK_REGISTRY[activeModule] || [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#020202] text-[#d4af37]">
      {/* HUD Header */}
      <header className="h-20 border-b border-[#bf953f]/20 bg-black/90 backdrop-blur-xl flex items-center justify-between px-10">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 rounded-full border-2 border-[#bf953f]/30 flex items-center justify-center relative group">
            <div className="absolute inset-0 border-t-2 border-[#bf953f] rounded-full animate-spin duration-[3s]" />
            <span className="luxury-font text-2xl gold-text-gradient">J</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.4em] uppercase gold-text-gradient">Command Core v3.0</h1>
            <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-widest opacity-60">System Cleaner & Optimizer Active</span>
          </div>
        </div>

        <nav className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          {MODULES.map(m => (
            <button 
              key={m.id} 
              onClick={() => setActiveModule(m.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all duration-300 ${activeModule === m.id ? 'bg-[#bf953f] text-black shadow-lg shadow-[#bf953f]/30 scale-105' : 'text-white/30 hover:text-white/60'}`}
            >
              {m.label}
            </button>
          ))}
        </nav>
      </header>
      
      <main className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* Task Ledger */}
        <section className="w-80 flex flex-col gap-6">
          <div className="flex-1 gold-border rounded-[2rem] bg-black/40 p-5 flex flex-col overflow-hidden shadow-2xl">
             <div className="flex justify-between items-center mb-6 pb-2 border-b border-white/5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#bf953f]">Maintenance Logs</span>
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
             </div>
             <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
               {currentTasks.map(task => (
                 <button 
                  key={task.id}
                  onClick={() => executeMission(task)}
                  className="w-full p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-right hover:border-[#bf953f]/60 hover:bg-[#bf953f]/5 transition-all group"
                 >
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-[11px] font-bold text-white/90 group-hover:text-[#bf953f]">{task.label}</span>
                     <span className="text-[6px] font-mono opacity-30 uppercase tracking-tighter">{task.executor}</span>
                   </div>
                   <p className="text-[9px] text-white/30 line-clamp-2 leading-relaxed">{task.description}</p>
                 </button>
               ))}
             </div>
          </div>
          
          <div className="h-48 gold-border rounded-[2rem] bg-black/80 p-5 font-mono text-[9px] text-cyan-400/70 space-y-1.5 overflow-hidden">
             <div className="flex justify-between border-b border-white/5 pb-2 mb-2 text-[#bf953f]/50">
                <span className="text-[7px] uppercase tracking-widest">Live Telemetry</span>
                <span className="text-[7px]">PURGE_PROTO</span>
             </div>
             {terminalLines.map((line, i) => <div key={i} className="animate-in fade-in slide-in-from-left-4">{line}</div>)}
             <div ref={terminalEndRef} />
          </div>
        </section>

        {/* Execution Area */}
        <section className="flex-1 flex flex-col gap-6 relative">
          <div className="flex-1 gold-border rounded-[3rem] bg-black/20 backdrop-blur-md relative flex flex-col overflow-hidden shadow-2xl">
             {isProcessing && (
               <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
                  <div className="w-40 h-40 relative flex items-center justify-center">
                     <div className="absolute inset-0 border-2 border-[#bf953f]/10 rounded-full" />
                     <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" />
                     <span className="luxury-font text-6xl gold-text-gradient animate-pulse">G</span>
                  </div>
                  <p className="mt-8 text-[10px] uppercase tracking-[1em] text-cyan-400 font-bold">Purging System Junk</p>
               </div>
             )}

             {securityHold && (
               <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-3xl p-12 flex items-center justify-center">
                  <div className="w-full max-w-2xl p-12 gold-border rounded-[3.5rem] bg-black shadow-[0_0_120px_rgba(0,255,255,0.05)] animate-in zoom-in-95 duration-500">
                    <div className="text-center mb-10">
                      <div className="w-20 h-20 rounded-3xl border border-cyan-500/20 flex items-center justify-center mx-auto mb-6 bg-cyan-500/5">
                        <span className="text-cyan-500 text-4xl font-bold">!</span>
                      </div>
                      <h3 className="text-3xl gold-text-gradient luxury-font mb-2">تصريح صيانة النظام</h3>
                      <p className="text-[9px] text-white/30 uppercase tracking-[0.3em]">{securityHold.task}</p>
                    </div>

                    <div className="space-y-8">
                       <div className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5">
                          <span className="text-[9px] uppercase text-[#bf953f] font-bold block mb-4">خطة الصيانة المقترحة</span>
                          <div className="space-y-3">
                             {securityHold.plan?.map((step, i) => (
                               <div key={i} className="text-xs text-white/60 flex gap-4 italic leading-relaxed">
                                 <span className="text-cyan-400/40 font-mono">CODE_{i+1}</span> {step}
                               </div>
                             ))}
                          </div>
                       </div>
                       <div className="font-mono text-xs bg-black p-6 rounded-2xl border border-cyan-400/30 text-green-500 overflow-x-auto shadow-inner">
                          {securityHold.command}
                       </div>
                       <div className="flex gap-4">
                          <button onClick={() => setSecurityHold(null)} className="flex-1 py-5 text-[10px] font-bold uppercase text-white/20 hover:text-white transition-all">إلغاء الصيانة</button>
                          <button onClick={() => finalizeExecution(securityHold)} className="flex-1 py-5 gold-gradient text-black font-bold text-[10px] uppercase rounded-2xl shadow-2xl hover:scale-105 transition-all">تفعيل التنظيف</button>
                       </div>
                    </div>
                  </div>
               </div>
             )}

             <div className="flex-1 p-12 overflow-y-auto space-y-20 custom-scrollbar scroll-smooth">
               {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <div className="w-64 h-64 border-2 border-[#bf953f]/5 rounded-full flex items-center justify-center relative">
                       <div className="absolute inset-0 border-t-2 border-[#bf953f]/40 rounded-full animate-spin" style={{ animationDuration: '15s' }} />
                       <span className="luxury-font text-9xl gold-text-gradient">J</span>
                    </div>
                    <p className="mt-16 text-xs uppercase tracking-[1.5em] text-[#bf953f] font-bold">Cleaner Module Ready</p>
                 </div>
               )}
               {messages.map(m => {
                 const data = JSON.parse(m.content);
                 return (
                   <div key={m.id} className="preview-deploy max-w-5xl mx-auto space-y-10 group">
                      <div className="flex items-center gap-6">
                        <div className={`w-3 h-3 rounded-full ${data.riskLevel === 'low' ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'}`} />
                        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Maintenance Node #{m.id.slice(-4)}</span>
                        <div className="flex-1 h-[1px] bg-white/5" />
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">{data.executor} Engine</span>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                         <div className="space-y-6">
                            <h4 className="text-sm font-bold text-white/90 tracking-widest uppercase">Maintenance Insight</h4>
                            <p className="text-[15px] leading-[1.8] text-white/50 text-right">{data.summary}</p>
                            <div className="space-y-4 mt-8">
                               {data.steps.map((s: any, i: number) => (
                                 <div key={i} className="flex gap-4 text-xs text-cyan-400/80 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
                                    <span className="font-mono opacity-20">PROTO_{i+1}</span> {s}
                                 </div>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-6">
                            <h4 className="text-sm font-bold text-white/90 tracking-widest uppercase">Purge Command</h4>
                            <div className="bg-black/95 rounded-[2.5rem] p-10 border border-cyan-400/20 font-mono text-xs text-green-400 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group-hover:border-cyan-400/40 transition-all">
                               <div className="absolute top-4 right-8 text-[7px] text-white/10 uppercase tracking-[0.4em] font-bold">Optimization_Stack_v3</div>
                               <code className="break-all leading-relaxed"><span className="text-cyan-400 opacity-40">>></span> {data.command}</code>
                            </div>
                            <div className="flex justify-end gap-8">
                               <button className="text-[9px] uppercase tracking-widest text-cyan-400 hover:text-white transition-all underline underline-offset-8">Copy Script</button>
                            </div>
                         </div>
                      </div>
                   </div>
                 );
               })}
             </div>

             {/* Command Input Area */}
             <div className="p-10 bg-black/60 border-t border-white/10 backdrop-blur-2xl">
                <div className="flex gap-8 max-w-6xl mx-auto items-center">
                  <div className="flex-1 relative">
                    <textarea 
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), executeMission())}
                      placeholder="Enter system command (e.g., 'Clean all temp files' or 'Analyze disk usage')..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 text-sm text-white focus:outline-none focus:border-cyan-400/40 resize-none h-24 transition-all placeholder:text-white/10"
                    />
                  </div>
                  <button 
                    onClick={() => executeMission()}
                    disabled={isProcessing || !customPrompt}
                    className="w-24 h-24 gold-gradient rounded-[2.5rem] flex items-center justify-center shadow-[0_20px_40px_rgba(0,255,255,0.05)] active:scale-90 transition-all disabled:opacity-10 group"
                  >
                    <span className="text-black text-3xl group-hover:rotate-12 transition-transform">🧹</span>
                  </button>
                </div>
             </div>
          </div>
        </section>

        {/* Asset Vault */}
        <section className="w-80 flex flex-col gap-6">
           <div className="flex-1 gold-border rounded-[2rem] bg-black/40 backdrop-blur-xl p-6 flex flex-col overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-white/5">
                 <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#bf953f]">System Snapshot</h2>
                 <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 gold-border rounded-2xl flex items-center justify-center text-[#bf953f] hover:bg-[#bf953f] hover:text-black transition-all shadow-xl">+</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                 {assets.map(a => (
                   <div 
                    key={a.id} 
                    onClick={() => setSelectedAsset(a)}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer group relative overflow-hidden ${selectedAsset?.id === a.id ? 'border-[#bf953f] bg-[#bf953f]/10' : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'}`}
                   >
                     <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-black mb-4 relative shadow-inner">
                       {a.mimeType.startsWith('image/') ? (
                         <img src={a.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-white/5 text-[10px] font-bold tracking-widest opacity-20">LOG_DATA</div>
                       )}
                       {a.isAnalyzing && (
                         <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <div className="w-6 h-6 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mb-2" />
                            <span className="text-[6px] text-cyan-400 uppercase font-bold tracking-widest">Scanning</span>
                         </div>
                       )}
                     </div>
                     <div className="text-[10px] font-bold truncate text-white/80 mb-1">{a.name}</div>
                     <p className="text-[8px] text-white/30 italic mb-2 line-clamp-1">{a.altText || "Awaiting AI Analysis..."}</p>
                     
                     {a.tags && a.tags.length > 0 && (
                       <div className="flex flex-wrap gap-1 mb-3">
                         {a.tags.map((tag, idx) => (
                           <span key={idx} className="text-[6px] bg-[#bf953f]/10 text-[#bf953f] px-1.5 py-0.5 rounded border border-[#bf953f]/20 font-mono">#{tag}</span>
                         ))}
                       </div>
                     )}

                     <div className="text-[7px] text-white/20 uppercase font-mono flex justify-between tracking-tighter mt-auto">
                        <span>{a.mimeType.split('/')[1]}</span>
                        <span>{a.size}</span>
                     </div>
                   </div>
                 ))}
                 {assets.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
                      <div className="text-4xl mb-4">📂</div>
                      <p className="text-[10px] uppercase tracking-widest text-center leading-relaxed">Vault Empty<br/>Upload Assets</p>
                   </div>
                 )}
              </div>
           </div>
        </section>
      </main>

      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
        if (e.target.files?.[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64Data = (ev.target?.result as string).split(',')[1];
            const newAsset: Asset = {
              id: Date.now().toString(),
              name: file.name,
              url: ev.target?.result as string,
              mimeType: file.type,
              altText: '',
              tags: [],
              isAnalyzing: true,
              timestamp: Date.now(),
              size: (file.size / 1024).toFixed(1) + ' KB'
            };
            setAssets(prev => [newAsset, ...prev]);
            addTerminalLine(`SYSTEM: Data asset "${newAsset.name}" successfully cached.`);
            
            // Trigger AI analysis
            analyzeAsset(newAsset.id, base64Data, file.type);
          };
          reader.readAsDataURL(file);
        }
      }} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
