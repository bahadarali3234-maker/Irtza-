import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Square, Globe, Activity, Timer, RefreshCw, AlertCircle, ExternalLink, ShieldCheck, Monitor, Smartphone, Tablet, Percent, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

enum TestStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING', // Cooldown Mode
  STOPPING = 'STOPPING'
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface Viewport {
  width: number;
  height: number;
  label: string;
}

const VIEWPORTS: Viewport[] = [
  { width: 375, height: 667, label: 'Mobile (iPhone SE)' },
  { width: 414, height: 896, label: 'Mobile (iPhone XR)' },
  { width: 768, height: 1024, label: 'Tablet (iPad)' },
  { width: 834, height: 1194, label: 'Tablet (iPad Pro)' },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0",
  "Mozilla/5.0 (Linux; Android 13; Samsung SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; U; Android 13; en-US; SM-G998B) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 UCBrowser/13.4.0.1306 Mobile Safari/534.30",
  "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 DuckDuckGo/5"
];

const REFERRERS = [
  "https://www.google.com/search?q=top+deals+usa",
  "https://www.facebook.com/l.php?u=https://usa.gov",
  "https://t.co/us_trending",
  "https://www.reddit.com/r/technology/",
  "https://www.bing.com/search?q=best+cloud+server+us",
  "https://twitter.com/search?q=usa+performance",
  "https://duckduckgo.com/?q=us+market+trends"
];

const TIMEZONES = ["America/New_York", "America/Los_Angeles", "America/Chicago", "America/Denver"];
const PLATFORMS = ["iPhone", "MacIntel", "Win32", "Linux armv8l"];

export default function App() {
  const [url, setUrl] = useState('https://example.com');
  const [status, setStatus] = useState<TestStatus>(TestStatus.IDLE);
  const [counter, setCounter] = useState(0); // Successful hits
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nextCycleIn, setNextCycleIn] = useState<number | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('N/A');
  const [realTimeStatus, setRealTimeStatus] = useState<string>('System Ready');
  
  const testWindowRef = useRef<Window | null>(null);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const interactionTimerRef = useRef<number | null>(null);

  const successRate = useMemo(() => {
    if (totalAttempts === 0) return 0;
    return Math.round((counter / totalAttempts) * 100);
  }, [counter, totalAttempts]);

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
    // Smart Tab Management: Force-kill hanging windows
    if (testWindowRef.current) {
      try {
        if (!testWindowRef.current.closed) {
          testWindowRef.current.close();
        }
      } catch (e) {
        addLog('Hanging window detected and force-abandoned', 'warning');
      }
      testWindowRef.current = null;
    }
  }, [addLog]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (watchdogRef.current) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    if (interactionTimerRef.current) {
      window.clearTimeout(interactionTimerRef.current);
      interactionTimerRef.current = null;
    }
    setNextCycleIn(null);
  }, []);

  const runCycle = useCallback((isHardReset = false) => {
    if (status === TestStatus.STOPPING) return;

    if (isHardReset) {
      addLog('Triggering Hard Reset: Self-Healing Active', 'warning');
      setRealTimeStatus('Self-Healing: Hard Reset');
    }

    // Randomized Behavior Pattern: Human Rest Cycle (Every 10 sessions)
    if (totalAttempts > 0 && totalAttempts % 10 === 0 && !isHardReset) {
      const restTime = Math.floor(Math.random() * (240000 - 120000 + 1) + 120000); // 2-4 mins
      addLog(`Human Rest Cycle Triggered: Sleeping for ${Math.floor(restTime/1000)}s...`, 'warning');
      setRealTimeStatus('Rest Cycle: Simulating Break');
      
      let restRemaining = Math.floor(restTime / 1000);
      setNextCycleIn(restRemaining);
      
      const restCounter = setInterval(() => {
        restRemaining -= 1;
        setNextCycleIn(restRemaining);
        if (restRemaining <= 0) clearInterval(restCounter);
      }, 1000);

      timerRef.current = window.setTimeout(() => {
        runCycle();
      }, restTime);
      return;
    }

    // Smart Tab Management: Before every cycle, ensure cleanup
    closeWindow();
    clearTimers();

    // Session Rotation Logic
    const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
    setCurrentSessionId(sessionId);
    
    // Pick User-Agent from list; rotate every 5th session
    const uaIndex = (Math.floor(totalAttempts / 5)) % 10;
    const selectedUA = USER_AGENTS[uaIndex];
    
    // Pick Randomized Referrer from US Pool
    const selectedRef = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];

    // Deep Clean & Noise Logic
    const deepCleanId = `clean_${Math.random().toString(36).substring(7)}`;
    const noiseSignature = `noise_${Math.random().toString(16).substring(2, 6)}`;

    // US Locale & Environment Spoofing
    const selectedTZ = TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
    const selectedPlatform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

    setTotalAttempts((a) => a + 1);

    // Dynamic Viewport Randomization: Base choice + slight jitter (±15px)
    const baseViewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
    const viewportWidth = baseViewport.width + Math.floor(Math.random() * 30 - 15);
    const viewportHeight = baseViewport.height + Math.floor(Math.random() * 30 - 15);
    const windowFeatures = `width=${viewportWidth},height=${viewportHeight},left=100,top=100,resizable=yes,scrollbars=yes`;

    // Prepare URL with Advanced Geo-Environment parameters
    const bypassUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    bypassUrl.searchParams.set('_stress_t', Date.now().toString());
    bypassUrl.searchParams.set('_rand', Math.random().toString(36).substring(7));
    bypassUrl.searchParams.set('session_id', sessionId);
    bypassUrl.searchParams.set('_sim_ua', selectedUA);
    bypassUrl.searchParams.set('_sim_ref', selectedRef);
    bypassUrl.searchParams.set('_locale', 'en-US');
    bypassUrl.searchParams.set('_platform', selectedPlatform);
    bypassUrl.searchParams.set('_tz', selectedTZ);
    bypassUrl.searchParams.set('_noise', noiseSignature);
    bypassUrl.searchParams.set('_clean_id', deepCleanId);

    // Open new window
    try {
      setRealTimeStatus('Spoofing: US Geo-Environment');
      addLog(`Environment: US-Locale [${selectedTZ}] Active`, 'info');
      addLog(`Noise Profile: ${noiseSignature} injected`, 'info');
      
      setRealTimeStatus('Session Active: Verifying Load...');
      addLog(`Initiating Session ${sessionId} [v-jitter active]`, 'info');
      
      const newWindow = window.open(bypassUrl.toString(), '_blank', windowFeatures);
      
      if (!newWindow) {
        addLog('Popup blocked! Critical error.', 'error');
        setRealTimeStatus('Error: Popups Blocked');
        setStatus(TestStatus.IDLE);
        return;
      }
      
      testWindowRef.current = newWindow;
      setCounter((c) => c + 1);
      addLog(`Session successfully dispatched`, 'success');

      // Network Latency Simulation: Natural human reading delay before interaction (3-5s)
      const latencyDelay = Math.floor(Math.random() * (5000 - 3000 + 1) + 3000);
      setRealTimeStatus('Reading: Simulating Human Latency');
      
      interactionTimerRef.current = window.setTimeout(() => {
        // Interaction Simulation: Scrolls and Randomized Touch Events
        addLog('Interaction: Simulating Randomized Touch & Scroll...', 'info');
        setRealTimeStatus('Session Active: Touch Emulation');
        
        // Secondary delay for the actual interaction sequence
        setTimeout(() => {
           addLog('Interaction: Sequence Finished', 'success');
           setRealTimeStatus('Session Active: Page Stay Mode');
        }, 4000);
      }, latencyDelay);

      // Automated Error Handling (Self-Healing Watchdog)
      watchdogRef.current = window.setTimeout(() => {
        addLog('Watchdog: No response detected for 40s. Session timeout.', 'error');
        runCycle(true); 
      }, 40000);

      // Advanced Human-Behavior Simulation: Randomized Cooldown (25 to 50 seconds)
      const waitTime = Math.floor(Math.random() * (50000 - 25000 + 1) + 25000);
      setStatus(TestStatus.WAITING);
      
      let remaining = Math.floor(waitTime / 1000);
      setNextCycleIn(remaining);

      countdownRef.current = window.setInterval(() => {
        remaining -= 1;
        setNextCycleIn(remaining);
        if (remaining === Math.floor(waitTime / 2000)) {
           setRealTimeStatus('Cooldown Mode: Simulated Interaction Finished');
        }
        if (remaining <= 0) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
        }
      }, 1000);

      timerRef.current = window.setTimeout(() => {
        clearTimers();
        runCycle();
      }, waitTime);

    } catch (err) {
      addLog(`System Fault: ${err instanceof Error ? err.message : String(err)}`, 'error');
      setRealTimeStatus('System Fault: Execution Halted');
      setStatus(TestStatus.IDLE);
    }
  }, [url, status, totalAttempts, closeWindow, addLog, clearTimers]);

  const handleStart = () => {
    if (!url) {
      addLog('URL Required for target initialization', 'warning');
      return;
    }
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      addLog('Malformed URL signature detected', 'warning');
      return;
    }

    setCounter(0);
    setTotalAttempts(0);
    setLogs([]);
    setStatus(TestStatus.RUNNING);
    addLog('Automated stress test initialized', 'info');
    runCycle();
  };

  const handleStop = () => {
    setStatus(TestStatus.STOPPING);
    setRealTimeStatus('Manual Termination Initialized');
    clearTimers();
    closeWindow();
    setStatus(TestStatus.IDLE);
    addLog('Stress test sequence manually aborted', 'warning');
    setTimeout(() => setRealTimeStatus('System Idle'), 1000);
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
      
      <main className="relative max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <header className="lg:col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 mb-4">
          <div>
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Zap className="w-5 h-5 fill-current" />
              <span className="text-xs font-mono uppercase tracking-widest font-bold">CORE.ARCHITECTURE.v2.PRO</span>
            </div>
            <h1 className="text-4xl font-light tracking-tight text-white">
              StressTest <span className="font-bold text-orange-500">PRO</span>
            </h1>
            <p className="text-white/40 text-sm mt-1 max-w-md">Advanced Web Simulation & Load Monitoring Architecture with Self-Healing Logic.</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-sm">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${status === TestStatus.IDLE ? 'bg-white/10 text-white/60' : 'bg-orange-500/10 text-orange-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status === TestStatus.IDLE ? 'bg-white/20' : 'bg-orange-500 animate-pulse'}`} />
              {status}
            </div>
            {status !== TestStatus.IDLE && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white/60 text-xs font-mono border border-white/5">
                <Timer className="w-3.5 h-3.5" />
                {nextCycleIn !== null ? `RELOAD: ${nextCycleIn}s` : 'SYNCING...'}
              </div>
            )}
          </div>
        </header>

        {/* Info Grid (Top Row) */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase mb-2">
              <Percent className="w-3 h-3" /> SUCCESS_RATE
            </div>
            <div className="text-2xl font-black text-white">{successRate}%</div>
            <div className="w-full bg-white/5 h-1 rounded-full mt-2 overflow-hidden">
              <motion.div 
                animate={{ width: `${successRate}%` }}
                className="h-full bg-green-500"
              />
            </div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase mb-2">
              <Zap className="w-3 h-3" /> TOTAL_ATTEMPTS
            </div>
            <div className="text-2xl font-black text-white">{totalAttempts.toString().padStart(3, '0')}</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase mb-2">
              <ShieldCheck className="w-3 h-3" /> SESSION_ID
            </div>
            <div className="text-2xl font-black text-white overflow-hidden text-ellipsis">{currentSessionId}</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase mb-2">
              <Activity className="w-3 h-3" /> LIVE_STATUS
            </div>
            <div className="text-sm font-bold text-orange-500 uppercase tracking-tighter truncate">{realTimeStatus}</div>
          </div>
        </div>

        {/* Main Control Panel */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* URL Input Area */}
          <section className="bg-white/5 rounded-2xl border border-white/10 p-6 space-y-4">
            <div className="flex items-center gap-2 text-white/60 text-xs font-mono uppercase tracking-wider mb-2">
              <Globe className="w-4 h-4" />
              <span>Target Infrastructure Configuration</span>
            </div>
            <div className="relative group">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status !== TestStatus.IDLE}
                placeholder="https://your-production-server.com/endpoint"
                className="w-full bg-[#151619] border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all font-mono text-sm disabled:opacity-50"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                <Monitor className="w-4 h-4" />
                <Tablet className="w-4 h-4" />
                <Smartphone className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex gap-4">
              {status === TestStatus.IDLE ? (
                <button 
                  onClick={handleStart}
                  id="btn-start"
                  className="flex-1 bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all active:scale-[0.98] shadow-lg shadow-white/5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  START SIMULATION ENGINE
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
                Verified Global Hits
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
                <div className="ml-4 flex flex-col items-start gap-2">
                  <motion.div 
                    animate={status !== TestStatus.IDLE ? { rotate: 360 } : {}}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="p-2 rounded-full bg-white/5 border border-white/10"
                  >
                    <RefreshCw className="w-6 h-6 text-orange-500" />
                  </motion.div>
                </div>
              </div>
              <p className="text-white/40 text-[10px] font-mono mt-6 border-t border-white/5 pt-4 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                CACHE-STAMP PROTECTION ACTIVE: {Date.now().toString().slice(-8)}
              </p>
            </div>
          </section>
        </div>

        {/* Sidebar Log Panel */}
        <aside className="lg:col-span-5 flex flex-col h-full max-h-[780px]">
          <div className="bg-[#151619] rounded-2xl border border-white/10 overflow-hidden flex flex-col flex-1 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="text-xs font-mono uppercase font-bold tracking-wider">Kernel Operations Log</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono tracking-widest uppercase">Buffer: Enabled</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
              <AnimatePresence initial={false}>
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-white/20 italic text-sm py-12">
                    <Activity className="w-8 h-8 mb-4 opacity-20" />
                    Waiting for core sequence...
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
                <span className="flex items-center gap-1 text-green-500"><ShieldCheck className="w-3 h-3" /> US-EMULATION: ACTIVE</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> HEAL_ENABLED</span>
              </div>
              <span>PRO_MODE_v3</span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.02] text-[11px] leading-relaxed text-white/40 italic">
            <span className="text-orange-500 font-bold not-italic">Self-Healing logic:</span> The system tracks active windows. If a stall longer than 40s is detected, a hard reset is triggered to maintain uptime accuracy.
          </div>
        </aside>

      </main>
    </div>
  );
}
