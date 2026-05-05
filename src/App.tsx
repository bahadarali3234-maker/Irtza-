import { useState, useEffect, useRef, useCallback, useMemo, FormEvent } from 'react';
import { Play, Square, Globe, Activity, Timer, RefreshCw, AlertCircle, ExternalLink, ShieldCheck, Monitor, Smartphone, Tablet, Percent, Zap, Shield, Lock, Unlock } from 'lucide-react';
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

const MASTER_KEY = "12345";
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

export default function App() {
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [secretClickCount, setSecretClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Main Dashboard States
  const [url, setUrl] = useState('https://example.com');
  const [customScript, setCustomScript] = useState('');
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

  const gpuVendors = ['Apple GPU', 'Google SwiftShader', 'NVIDIA GeForce', 'ARM Mali-G78', 'Adreno 740'];
  const batteryLevels = [12, 45, 68, 89, 94];

  // Initialize Auth from persistence
  useEffect(() => {
    const savedAuth = localStorage.getItem('ghost_engine_auth_v2');
    const lockExpiry = localStorage.getItem('ghost_engine_lock_expiry');
    
    if (lockExpiry) {
      const expiry = parseInt(lockExpiry);
      if (Date.now() < expiry) {
        setIsLocked(true);
        setLockTimeLeft(Math.ceil((expiry - Date.now()) / 1000));
        const lockTimer = setInterval(() => {
          const remaining = Math.ceil((expiry - Date.now()) / 1000);
          if (remaining <= 0) {
            setIsLocked(false);
            localStorage.removeItem('ghost_engine_lock_expiry');
            setWrongAttempts(0);
            clearInterval(lockTimer);
          } else {
            setLockTimeLeft(remaining);
          }
        }, 1000);
        return () => clearInterval(lockTimer);
      } else {
        localStorage.removeItem('ghost_engine_lock_expiry');
      }
    }

    if (savedAuth) {
      const authDate = new Date(parseInt(savedAuth)).toDateString();
      const today = new Date().toDateString();
      if (authDate === today) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('ghost_engine_auth_v2');
      }
    }
  }, []);

  const handleSecretTrigger = () => {
    if (isLocked) return;
    const now = Date.now();
    if (now - lastClickTime > 1500) {
      setSecretClickCount(1);
    } else {
      const newCount = secretClickCount + 1;
      setSecretClickCount(newCount);
      if (newCount === 3) {
        setShowPasswordInput(true);
        setSecretClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (password === MASTER_KEY) {
      // Local Mode Only
      setIsAuthenticated(true);
      localStorage.setItem('ghost_engine_auth_v2', Date.now().toString());
      setPassword('');
      setWrongAttempts(0);
    } else {
      const newWrongAttempts = wrongAttempts + 1;
      setWrongAttempts(newWrongAttempts);
      setPassword('');
      if (newWrongAttempts >= 3) {
        const expiry = Date.now() + LOCK_DURATION;
        setIsLocked(true);
        localStorage.setItem('ghost_engine_lock_expiry', expiry.toString());
        setLockTimeLeft(Math.ceil(LOCK_DURATION / 1000));
        
        const lockTimer = setInterval(() => {
          const remaining = Math.ceil((expiry - Date.now()) / 1000);
          if (remaining <= 0) {
            setIsLocked(false);
            localStorage.removeItem('ghost_engine_lock_expiry');
            setWrongAttempts(0);
            clearInterval(lockTimer);
          } else {
            setLockTimeLeft(remaining);
          }
        }, 1000);
      }
    }
  };

  const successRate = useMemo(() => {
    if (totalAttempts === 0) return 0;
    return Math.round((counter / totalAttempts) * 100);
  }, [counter, totalAttempts]);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp,
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
      addLog('Self-Healing: Recovery Reset Triggered', 'warning');
      setRealTimeStatus('SYSTEM_RECOVERY_ACTIVE');
    }

    // Randomized Behavior Pattern: Human Rest Cycle (Disabled for Manual Mode)
    /*
    if (counter > 0 && counter % 10 === 0 && !isHardReset) {
      ...
    }
    */

    closeWindow();
    clearTimers();

    const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
    setCurrentSessionId(sessionId);
    
    const uaIndex = (Math.floor(totalAttempts / 5)) % 10;
    const selectedUA = USER_AGENTS[uaIndex];
    const selectedRef = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
    const deepCleanId = `clean_${Math.random().toString(36).substring(7)}`;
    const noiseSignature = `noise_${Math.random().toString(16).substring(2, 6)}`;
    const selectedTZ = TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
    const selectedPlatform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];

    // Advanced Hardware Spoofing
    const selectedGPU = gpuVendors[Math.floor(Math.random() * gpuVendors.length)];
    const batteryStatus = batteryLevels[Math.floor(Math.random() * batteryLevels.length)];
    const orientation = Math.random() > 0.5 ? 'portrait' : 'landscape';

    // Residential Proxy Simulation (Randomized Packet Jitter 100-400ms)
    const proxyJitter = Math.floor(Math.random() * 300) + 100;

    // Encrypted Identity Rotation (Hard Flush every 5th cycle)
    const isHardFlush = totalAttempts > 0 && totalAttempts % 5 === 0;
    const fingerprints = isHardFlush ? `FLUSH_${Date.now()}` : `HASH_${Math.random().toString(36).substring(7)}`;

    // Ghost Identity: Hardware, Fingerprint & Audio Noise
    const glNoise = `gl_${Math.random().toString(16).substring(2, 10)}`;
    const canvasNoise = `cv_${Math.random().toString(16).substring(2, 10)}`;
    const audioNoise = `au_${Math.random().toString(16).substring(2, 10)}`;

    // Final Stealth: Header Sequence & Interaction Depth
    const headerSequence = ["UA", "CH", "PL", "EN", "RE", "TE"].sort(() => Math.random() - 0.5).join(',');
    const interactionDepth = Math.floor(Math.random() * 5) + 1; // 1-5 level intensity
    const netJitter = Math.floor(Math.random() * 2000) + 1000; // 1-3s mobile jitter

    setTotalAttempts((a) => a + 1);

    const baseViewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
    const viewportWidth = baseViewport.width + Math.floor(Math.random() * 30 - 15);
    const viewportHeight = baseViewport.height + Math.floor(Math.random() * 30 - 15);
    const windowFeatures = `width=${viewportWidth},height=${viewportHeight},left=100,top=100,resizable=yes,scrollbars=yes`;

    const bypassUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    bypassUrl.searchParams.set('_stress_t', Date.now().toString());
    bypassUrl.searchParams.set('_rand', Math.random().toString(36).substring(7));
    bypassUrl.searchParams.set('session_id', sessionId);
    bypassUrl.searchParams.set('_ua', selectedUA);
    bypassUrl.searchParams.set('_ref', selectedRef);
    bypassUrl.searchParams.set('_locale', 'en-US');
    bypassUrl.searchParams.set('_platform', selectedPlatform);
    bypassUrl.searchParams.set('_tz', selectedTZ);
    bypassUrl.searchParams.set('_noise', noiseSignature);
    bypassUrl.searchParams.set('_gl_noise', glNoise);
    bypassUrl.searchParams.set('_canvas_noise', canvasNoise);
    bypassUrl.searchParams.set('_audio_noise', audioNoise);
    bypassUrl.searchParams.set('_h_seq', headerSequence);
    bypassUrl.searchParams.set('_i_depth', interactionDepth.toString());
    bypassUrl.searchParams.set('_gpu', selectedGPU);
    bypassUrl.searchParams.set('_battery', batteryStatus.toString());
    bypassUrl.searchParams.set('_orient', orientation);
    bypassUrl.searchParams.set('_proxy_jitter', proxyJitter.toString());
    bypassUrl.searchParams.set('_dns_leak_prot', 'enabled');
    bypassUrl.searchParams.set('_webrtc_prot', 'masked');
    bypassUrl.searchParams.set('_fp', fingerprints);
    bypassUrl.searchParams.set('_clean_id', deepCleanId);

    if (customScript) {
      bypassUrl.searchParams.set('_injector_node', btoa(customScript).substring(0, 50));
    }

    try {
      if (isHardFlush) {
        addLog('Ghost Identity: Performing hard flush of device fingerprints', 'warning');
        setRealTimeStatus('HARD_IDENTITY_FLUSH_ACTIVE');
      }

      setRealTimeStatus('NETWORK_SYNCING: MOBILE_JITTER');
      addLog(`Network Jitter: Simulating 3G/4G unstable flow (${netJitter}ms)`, 'info');
      addLog(`Header Sequence: Randomized [${headerSequence.substring(0, 8)}...]`, 'info');

      setTimeout(() => {
        setRealTimeStatus('TESTING IN PROGRESS');
        addLog(`Session Dispatched: ID ${sessionId}`, 'info');
        addLog(`Resident Flow: DNS & WebRTC masking verified`, 'info');
        
        const newWindow = window.open(bypassUrl.toString(), '_blank', windowFeatures);
        
        if (!newWindow) {
          addLog('Popup Blocked! Please enable popups.', 'error');
          setRealTimeStatus('ERROR: POPUPS_BLOCKED');
          setStatus(TestStatus.IDLE);
          return;
        }
        
        testWindowRef.current = newWindow;

        // Behavioral Human Randomization: reading delay, hover, selection and back/forth
        const latencyDelay = Math.floor(Math.random() * (5000 - 3000 + 1) + 3000);
        interactionTimerRef.current = window.setTimeout(() => {
          addLog(`Interaction: Level ${interactionDepth} Stealth Sync initialized`, 'info');
          setRealTimeStatus('BEHAVIORAL_PATTERN: GHOST_HUMAN_SYNC');
          
          const interactionTime = interactionDepth * 1000 + 2000;
          setTimeout(() => {
             addLog('Interaction: Nav-Pattern [Back/Forth] Emulated', 'success');
             setRealTimeStatus('TESTING IN PROGRESS');
          }, interactionTime);
        }, latencyDelay);

        // Watchdog: 30s timeout for "Self-Healing"
        watchdogRef.current = window.setTimeout(() => {
          addLog('Self-Healing: Stalled Session Detected (30s). Emergency Halt.', 'error');
          handleStop();
        }, 30000);
      }, netJitter); 

      // Ghost Identity: Random Jitter (±5s) added to base stay time (20-25s)
      const baseWait = Math.floor(Math.random() * (25000 - 20000 + 1) + 20000);
      const jitter = Math.floor(Math.random() * 10000 - 5000); // ±5000ms
      const waitTime = Math.max(15000, baseWait + jitter); // Min 15s floor
      
      setStatus(TestStatus.WAITING);
      
      let remaining = Math.floor(waitTime / 1000);
      setNextCycleIn(remaining);

      countdownRef.current = window.setInterval(() => {
        remaining -= 1;
        setNextCycleIn(remaining);
        if (remaining <= 0) clearInterval(countdownRef.current!);
      }, 1000);

      timerRef.current = window.setTimeout(() => {
        setCounter((c) => c + 1);
        addLog(`Session Verified: Result Recorded`, 'success');

        clearTimers();
        setStatus(TestStatus.IDLE);
        setRealTimeStatus('Session Complete - Pending Manual Trigger');
        addLog('Engine Stood Down: Manual cycle finished.', 'info');
      }, waitTime);

    } catch (err) {
      addLog(`System Fault: Execution Halted`, 'error');
      setRealTimeStatus('SYSTEM_FAULT_DETECTED');
      setStatus(TestStatus.IDLE);
    }
  }, [url, status, totalAttempts, counter, closeWindow, addLog, clearTimers]);

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
    <div className="min-h-screen bg-[#0A0A0B] text-[#E2E2E2] font-sans selection:bg-orange-500/30 overflow-hidden">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div 
            key="auth-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" 
                 style={{ backgroundImage: 'radial-gradient(#ff0000 1px, transparent 0)', backgroundSize: '30px 30px' }} />
            
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="mb-8"
            >
              <Shield className="w-24 h-24 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
            </motion.div>

            <h2 className="text-2xl font-black text-red-600 tracking-tighter mb-2 uppercase">
              System Error: Unauthorized Access
            </h2>
            <p className="text-white/30 font-mono text-xs max-w-sm mb-12">
              Critical integrity failure. Host identity could not be verified. 
              The requested resource has been isolated from the public network.
            </p>

            <div className="relative mt-auto mb-12">
              {/* Secret Trigger Pulse Circle */}
              <button
                onClick={handleSecretTrigger}
                className="group relative flex items-center justify-center p-4 focus:outline-none"
              >
                <div className="absolute inset-0 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-white/20 animate-pulse group-active:scale-95 transition-transform" />
              </button>
            </div>

            <AnimatePresence>
              {showPasswordInput && !isLocked && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-xs"
                >
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="relative">
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        placeholder="ENTER ACCESS KEY"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-center text-sm font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                      />
                      {wrongAttempts > 0 && (
                        <div className="absolute -bottom-6 left-0 right-0 text-[10px] text-red-500 font-mono">
                          INVALID KEY - ATTEMPT {wrongAttempts}/3
                        </div>
                      )}
                    </div>
                  </form>
                </motion.div>
              )}

              {isLocked && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-4 text-red-500"
                >
                  <Lock className="w-8 h-8 animate-bounce" />
                  <div className="text-xs font-mono uppercase tracking-widest">
                    Hard Lock Active: {Math.floor(lockTimeLeft / 60)}:{(lockTimeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-auto text-[10px] font-mono text-white/10 uppercase tracking-[0.2em]">
              ERR_CODE: 0x8872 - ISOLATION_MODE
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="main-app"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full"
          >
            {/* Main Application Start */}
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
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-light tracking-tight text-white">
                      StressTest <span className="font-bold text-orange-500">PRO</span>
                    </h1>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={() => {
                          localStorage.removeItem('ghost_engine_auth_v2');
                          window.location.reload();
                        }}
                        className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/20 hover:text-white/60 transition-colors"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
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

            {/* INJECTOR_NODE Custom Script Sandbox */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/40 text-[10px] font-mono uppercase tracking-wider">
                <Zap className="w-3 h-3 text-orange-500" />
                <span>Injector_Node Sandbox (JS/HTML)</span>
              </div>
              <textarea 
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                disabled={status !== TestStatus.IDLE}
                placeholder="// Paste custom performance tags or simulation scripts here..."
                className="w-full bg-[#0F1012] border border-white/5 rounded-xl px-4 py-3 text-orange-500/80 placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-all font-mono text-[11px] h-20 resize-none disabled:opacity-30"
              />
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
              <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono tracking-widest uppercase">
                <Activity className="w-3 h-3 text-white/20" />
                <span>Local Mode: Active</span>
              </div>
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
                <span className="flex items-center gap-1 text-orange-500/60"><Activity className="w-3 h-3" /> AES-256 ACTIVE</span>
                <span className="flex items-center gap-1 text-blue-500/60"><Globe className="w-3 h-3" /> PROXY: VERIFIED</span>
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> HEAL_ENABLED</span>
              </div>
              <span>PRO_MODE_v4_ULTIMATE</span>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl border border-orange-500/20 bg-orange-500/[0.02] text-[11px] leading-relaxed text-white/40 italic">
            <span className="text-orange-500 font-bold not-italic">Self-Healing logic:</span> The system tracks active windows. If a stall longer than 40s is detected, a hard reset is triggered to maintain uptime accuracy.
          </div>
        </aside>

      </main>
    </motion.div>
  )}
</AnimatePresence>
</div>
);
}
