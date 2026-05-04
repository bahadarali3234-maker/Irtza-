import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Globe, Activity, Timer, RefreshCw, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

enum TestStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  STOPPING = 'STOPPING'
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function App() {
  const [url, setUrl] = useState('https://example.com');
  const [status, setStatus] = useState<TestStatus>(TestStatus.IDLE);
  const [counter, setCounter] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nextCycleIn, setNextCycleIn] = useState<number | null>(null);
  
  const testWindowRef = useRef<Window | null>(null);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const closeWindow = useCallback(() => {
    if (testWindowRef.current && !testWindowRef.current.closed) {
      testWindowRef.current.close();
      testWindowRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setNextCycleIn(null);
  }, []);

  const runCycle = useCallback(() => {
    if (status === TestStatus.STOPPING) return;

    // Close previous if exists
    closeWindow();

    // Prepare URL with bypass
    const bypassUrl = new URL(url);
    bypassUrl.searchParams.set('_stress_t', Date.now().toString());
    bypassUrl.searchParams.set('_rand', Math.random().toString(36).substring(7));

    // Open new window
    try {
      addLog(`Opening ${bypassUrl.hostname}...`, 'info');
      const newWindow = window.open(bypassUrl.toString(), '_blank');
      
      if (!newWindow) {
        addLog('Popup blocked! Please allow popups for this site.', 'error');
        setStatus(TestStatus.IDLE);
        return;
      }
      
      testWindowRef.current = newWindow;
      setCounter((c) => c + 1);
      addLog('Hit successfully dispatched', 'success');

      // Schedule next cycle
      const waitTime = Math.floor(Math.random() * (25000 - 15000 + 1) + 15000);
      setStatus(TestStatus.WAITING);
      
      let remaining = Math.floor(waitTime / 1000);
      setNextCycleIn(remaining);

      countdownRef.current = window.setInterval(() => {
        remaining -= 1;
        setNextCycleIn(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
        }
      }, 1000);

      timerRef.current = window.setTimeout(() => {
        clearTimers();
        runCycle();
      }, waitTime);

    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setStatus(TestStatus.IDLE);
    }
  }, [url, status, closeWindow, addLog, clearTimers]);

  const handleStart = () => {
    if (!url) {
      addLog('Please enter a valid URL', 'warning');
      return;
    }
    try {
      new URL(url);
    } catch {
      addLog('Invalid URL format', 'warning');
      return;
    }

    setCounter(0);
    setLogs([]);
    setStatus(TestStatus.RUNNING);
    addLog('Stress test started', 'info');
    runCycle();
  };

  const handleStop = () => {
    setStatus(TestStatus.STOPPING);
    clearTimers();
    closeWindow();
    setStatus(TestStatus.IDLE);
    addLog('Stress test manually stopped', 'warning');
  };

  useEffect(() => {
    return () => {
      clearTimers();
      closeWindow();
    };
  }, [clearTimers, closeWindow]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E2E2] font-sans selection:bg-orange-500/30">
      {/* Structural Grid Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      
      <main className="relative max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <header className="lg:col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 mb-4">
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Activity className="w-5 h-5" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">System.Monitor.v1</span>
            </div>
            <h1 className="text-4xl font-light tracking-tight text-white">
              StressTest <span className="font-bold">UI</span>
            </h1>
            <p className="text-white/40 text-sm mt-1">Professional Web Automated Load & UI Monitoring Tool</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full border border-white/10">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${status === TestStatus.IDLE ? 'bg-white/10 text-white/60' : 'bg-orange-500/10 text-orange-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status === TestStatus.IDLE ? 'bg-white/20' : 'bg-orange-500 animate-pulse'}`} />
              {status}
            </div>
            {status !== TestStatus.IDLE && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white/60 text-xs font-mono">
                <Timer className="w-3.5 h-3.5" />
                {nextCycleIn !== null ? `CYCLE: ${nextCycleIn}s` : 'SYNCING...'}
              </div>
            )}
          </div>
        </header>

        {/* Main Control Panel */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* URL Input Area */}
          <section className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono uppercase tracking-wider mb-2">
              <Globe className="w-4 h-4" />
              <span>Target Configuration</span>
            </div>
            <div className="relative group">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status !== TestStatus.IDLE}
                placeholder="https://your-server.com/test"
                className="w-full bg-[#151619] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-mono text-sm disabled:opacity-50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex gap-4">
              {status === TestStatus.IDLE ? (
                <button 
                  onClick={handleStart}
                  id="btn-start"
                  className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  START TEST SEQUENCE
                </button>
              ) : (
                <button 
                  onClick={handleStop}
                  id="btn-stop"
                  className="flex-1 bg-red-500/10 text-red-500 border border-red-500/20 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                >
                  <Square className="w-5 h-5 fill-current" />
                  HALT ALL OPERATIONS
                </button>
              )}
            </div>
          </section>

          {/* Large Counter Display */}
          <section className="relative overflow-hidden bg-[#151619] rounded-3xl border border-white/10 p-12 flex flex-col items-center justify-center min-h-[340px]">
            {/* Background elements for the display */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
              <div className="absolute inset-x-0 h-[1px] top-1/4 bg-white" />
              <div className="absolute inset-x-0 h-[1px] top-2/4 bg-white" />
              <div className="absolute inset-x-0 h-[1px] top-3/4 bg-white" />
              <div className="absolute inset-y-0 w-[1px] left-1/4 bg-white" />
              <div className="absolute inset-y-0 w-[1px] left-2/4 bg-white" />
              <div className="absolute inset-y-0 w-[1px] left-3/4 bg-white" />
            </div>

            <div className="relative z-10 text-center">
              <span className="text-white/20 text-xs font-mono uppercase tracking-[0.3em] mb-4 block underline decoration-orange-500/40 underline-offset-8">
                Verified Hits
              </span>
              <div className="flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span 
                    key={counter}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    className="text-[120px] font-mono font-black text-white leading-none tracking-tighter"
                  >
                    {counter.toString().padStart(3, '0')}
                  </motion.span>
                </AnimatePresence>
                <div className="ml-4 flex flex-col items-start gap-1">
                  <motion.div 
                    animate={status !== TestStatus.IDLE ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="p-2 rounded-full bg-white/5 border border-white/10"
                  >
                    <RefreshCw className="w-6 h-6 text-orange-500" />
                  </motion.div>
                </div>
              </div>
              <p className="text-white/40 text-[10px] font-mono mt-6 border-t border-white/5 pt-4">
                LAST CACHE-BYPASS KEY: {Date.now().toString().slice(-8)}
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Log Panel */}
        <aside className="lg:col-span-5 flex flex-col h-full max-h-[700px]">
          <div className="bg-[#151619] rounded-2xl border border-white/10 overflow-hidden flex flex-col flex-1">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-mono uppercase font-bold tracking-wider">Live System Logs</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Buffer: 50.Entries</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence initial={false}>
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 italic text-sm py-12">
                    <Activity className="w-8 h-8 mb-4 opacity-20" />
                    Waiting for tool initialization...
                  </div>
                ) : (
                  logs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="group flex gap-3 text-[11px] font-mono border-b border-white/[0.03] pb-2 last:border-0"
                    >
                      <span className="text-white/20 shrink-0">{log.timestamp}</span>
                      <span className={`
                        flex-1 
                        ${log.type === 'success' ? 'text-green-400' : ''}
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'warning' ? 'text-yellow-400' : ''}
                        ${log.type === 'info' ? 'text-blue-400' : ''}
                      `}>
                        {log.message}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Terminal Footer */}
            <div className="p-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> NO_INTERRUPTS</span>
                <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> AUTO_DISPATCH</span>
              </div>
              <span>UTF-8.SYS</span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.02] text-[11px] leading-relaxed text-white/40 italic">
            <span className="text-orange-500 font-bold not-italic">Note:</span> This tool simulates real user interaction cycles. Ensure your browser allows popups to enable automated window dispatching. 
          </div>
        </aside>

      </main>
    </div>
  );
}
