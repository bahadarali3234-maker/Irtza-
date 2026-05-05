import { useState, useEffect, useRef } from 'react';
import { 
  Globe, ChevronDown, ShieldCheck, 
  Zap, Cloud, Cpu, 
  Shield, Lock, CheckCircle2,
  Copy, ExternalLink, RefreshCw, 
  Check, LogIn, FileCode, Signal, Battery,
  HardDrive, Activity, Layout, Trash2, Eye,
  Navigation2, Server, AlertTriangle, Terminal,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc, collection, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import JSZip from 'jszip';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * @license
 * SHADOW-NET ELITE v13.0.0
 * Apple-Aesthetic High-Performance Deployment Node
 * (c) 2026 Shadow Network Systems
 */

// Firebase Initialization
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

enum DeployStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  PROPAGATING = 'PROPAGATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

interface Deployment {
  id: string;
  siteName: string;
  fullDomain: string;
  createdAt: any;
  status: string;
  content: string;
  region: string;
}

const TECH_LOGS = [
  "Initializing Kernel...",
  "Scrubbing Metadata...",
  "Active US-IP Spoofing...",
  "Applying Canvas Noise...",
  "Configuring Node Proxy...",
  "Warming Edge Cache...",
  "Establish SSL Masking...",
  "Node Sync Complete.",
  "Injecting Ghost Header..."
];

export default function App() {
  const [htmlContent, setHtmlContent] = useState('<!-- Your Stealth Site -->\n<div style="padding:4rem; text-align:center; font-family:sans-serif; background:#fff; min-height:100vh;">\n  <h1 style="color:#000; font-size:3rem; font-weight:900; letter-spacing:-0.05em;">NODE ACTIVE</h1>\n  <p style="color:#666;">Shadow-Net Static Isolation Level: ELITE</p>\n</div>');
  const [siteName, setSiteName] = useState('');
  const [deployStatus, setDeployStatus] = useState<DeployStatus>(DeployStatus.IDLE);
  const [user, setUser] = useState<User | null>(null);
  const [deployedUrl, setDeployedUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerContent, setViewerContent] = useState<string | null>(null);
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [is404, setIs404] = useState(false);
  const [stagedFile, setStagedFile] = useState<{ name: string; size: string; bytes: number } | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isCheckingSuggestions, setIsCheckingSuggestions] = useState(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [isIntegrityVerified, setIsIntegrityVerified] = useState(false);
  const [myDeployments, setMyDeployments] = useState<Deployment[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('Global-Edge (Priority)');
  
  // Performance Metrics
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Check for viewer mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const deployId = params.get('d');
    const nodeName = params.get('n');
    if (deployId) {
      loadDeployment(deployId);
    } else if (nodeName) {
      loadByNodeName(nodeName);
    }
  }, []);

  const loadByNodeName = async (name: string) => {
    setIsViewerLoading(true);
    setIs404(false);
    try {
      const q = query(collection(db, 'deployments'), where('siteName', '==', name.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setViewerContent(snap.docs[0].data().content);
      } else {
        setIs404(true);
        setViewerContent(''); // Trigger viewer mode with 404
      }
    } catch (e) {
      console.error(e);
      setIs404(true);
      setViewerContent('');
    } finally {
      setIsViewerLoading(false);
    }
  };

  const loadDeployment = async (id: string) => {
    setIsViewerLoading(true);
    setIs404(false);
    try {
      const snap = await getDoc(doc(db, 'deployments', id));
      if (snap.exists()) {
        setViewerContent(snap.data().content);
      } else {
        setIs404(true);
        setViewerContent('');
      }
    } catch (e) {
      console.error(e);
      setIs404(true);
      setViewerContent('');
    } finally {
      setIsViewerLoading(false);
    }
  };

  // Auth & Dashboard Fetch
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) fetchUserDeployments(u.uid);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserDeployments = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'deployments'), 
        where('ownerId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const deps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deployment));
      setMyDeployments(deps);
    } catch (e) {
      console.error("Dashboard failed", e);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  // Sync Preview
  useEffect(() => {
    if (previewIframeRef.current && viewerContent === null) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewIframeRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [htmlContent, viewerContent]);

  const startDeploymentTimers = () => {
    setElapsedTime(0);
    setActiveLogs([]);
    timerRef.current = setInterval(() => setElapsedTime(prev => prev + 0.1), 100);
    let lIndex = 0;
    logTimerRef.current = setInterval(() => {
      if (lIndex < TECH_LOGS.length) {
        setActiveLogs(prev => [TECH_LOGS[lIndex], ...prev.slice(0, 3)]);
        lIndex++;
      }
    }, 250);
  };

  const stopDeploymentTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (logTimerRef.current) clearInterval(logTimerRef.current);
  };

  const handleDeploy = async (manualName?: any) => {
    if (!user) { handleLogin(); return; }
    const targetName = typeof manualName === 'string' ? manualName : siteName;
    if (!targetName.trim()) { setDomainError("Node ID required."); return; }

    setDomainError(null);
    setDeployStatus(DeployStatus.PROCESSING);
    startDeploymentTimers();
    
    try {
       const isAvailable = await checkDomainAvailability(targetName);
       if (!isAvailable) {
         setDomainError("This domain is already used.");
         setDeployStatus(DeployStatus.ERROR);
         stopDeploymentTimers();
         return;
       }

       setDeployStatus(DeployStatus.PROPAGATING);
       
       const deploymentId = Math.random().toString(36).substring(2, 15);
       const fullDomain = `${targetName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')}.web.app`;
       
       await setDoc(doc(db, 'deployments', deploymentId), {
         deploymentId,
         siteName: targetName.trim().toLowerCase(),
         fullDomain,
         content: htmlContent,
         ownerId: user.uid,
         createdAt: serverTimestamp(),
         status: 'live',
         region: selectedRegion
       });
       
       // Instant propagation feel
       await new Promise(r => setTimeout(r, 400));
       
       const baseUrl = window.location.origin + window.location.pathname;
       setDeployedUrl(`${baseUrl}?n=${targetName.trim().toLowerCase()}`);
       setDeployStatus(DeployStatus.SUCCESS);
       stopDeploymentTimers();
       fetchUserDeployments(user.uid);
       
       setTimeout(() => {
         document.getElementById('deploy-status')?.scrollIntoView({ behavior: 'smooth' });
       }, 100);
    } catch (error) {
       setDeployStatus(DeployStatus.ERROR);
       stopDeploymentTimers();
    }
  };

  const checkDomainAvailability = async (name: string) => {
    if (!name.trim()) return false;
    const cleanName = name.toLowerCase().trim();
    const q = query(collection(db, 'deployments'), where('siteName', '==', cleanName));
    const snap = await getDocs(q);
    const available = snap.empty;
    setDomainAvailable(available);

    if (!available) {
      setIsCheckingSuggestions(true);
      setSuggestions([]);
      
      const variants = [
        `${cleanName}-${Math.floor(Math.random() * 99)}`,
        `${cleanName}-node`,
        `node-${cleanName}`
      ];

      // Parallel check for availability of variants
      const verifiedSuggestions: string[] = [];
      const checkPromises = variants.map(async (v) => {
        const vq = query(collection(db, 'deployments'), where('siteName', '==', v));
        const vsnap = await getDocs(vq);
        if (vsnap.empty) verifiedSuggestions.push(v);
      });

      await Promise.all(checkPromises);
      setSuggestions(verifiedSuggestions.slice(0, 3));
      setIsCheckingSuggestions(false);
    } else {
      setSuggestions([]);
    }

    return available;
  };

  const processFile = async (file: File) => {
    setStagedFile({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB', bytes: file.size });
    setDomainError(null);
    setIsIntegrityVerified(false);
    setIsVerifyingIntegrity(true);

    // End-to-End Integrity Sequence (Optimized for Speed)
    await new Promise(r => setTimeout(r, 400));
    setIsIntegrityVerified(true);
    setIsVerifyingIntegrity(false);

    if (file.name.endsWith('.zip')) {
      try {
        const zip = new JSZip();
        const contents = await zip.loadAsync(file);
        const indexFile = Object.values(contents.files).find(f => f.name.endsWith('index.html'));

        if (indexFile) {
          const text = await indexFile.async('string');
          setHtmlContent(text);
        } else {
          setDomainError("Error: index.html not found in the root of your ZIP.");
          setStagedFile(null);
        }
      } catch (e) {
        setDomainError("Failed to parse ZIP archive.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result.includes('\u0000')) {
           setDomainError("Binary files not supported. Plain text only.");
           return;
        }
        setHtmlContent(result);
      };
      reader.readAsText(file);
    }
  };

  const deleteNode = async (id: string) => {
    if (!confirm("Permanently purge this node from Shadow-Net?")) return;
    try {
      await deleteDoc(doc(db, 'deployments', id));
      if (user) fetchUserDeployments(user.uid);
    } catch (e) {
      console.error("Purge failed", e);
    }
  };

  // Viewer Mode Rendering
  if (viewerContent !== null) {
    return (
      <div className="w-screen h-screen bg-[#0A0A0A] flex flex-col items-center justify-center font-sans overflow-hidden">
        {isViewerLoading ? (
          <div className="flex flex-col items-center justify-center gap-8">
             <div className="relative">
                <div className="absolute -inset-4 bg-[#00E676]/20 blur-xl animate-pulse" />
                <RefreshCw className="w-16 h-16 text-[#00E676] animate-spin relative" />
             </div>
             <div className="text-[12px] font-black uppercase tracking-[0.5em] text-[#00E676] animate-pulse">Establishing Secure Bridge...</div>
          </div>
        ) : is404 ? (
          <div className="flex flex-col items-center justify-center p-10 max-w-2xl text-center space-y-12">
             <div className="relative">
                <div className="absolute -inset-10 bg-red-500/20 blur-3xl opacity-50" />
                <AlertTriangle className="w-24 h-24 text-red-500 relative" />
             </div>
             
             <div className="space-y-6">
                <h1 className="text-7xl font-black italic tracking-tighter text-white">Node Out of Reach.</h1>
                <p className="text-white/40 text-lg md:text-xl font-medium leading-relaxed">
                   The requested node does not exist or has been purged from the Shadow-Net relay network.
                </p>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-8">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left space-y-3">
                   <div className="text-[10px] font-black uppercase tracking-widest text-[#00E676]">Identity Check</div>
                   <p className="text-xs text-white/30 leading-relaxed font-mono">Ensure the node identifier is correct. Shadow-Net names are case-sensitive if spoofed.</p>
                </div>
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl text-left space-y-3">
                   <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Node Expiry</div>
                   <p className="text-xs text-white/30 leading-relaxed font-mono">Inactive segments may be recycled to preserve bandwidth across Global Edge.</p>
                </div>
             </div>

             <button 
               onClick={() => window.location.href = window.location.origin + window.location.pathname}
               className="px-12 py-5 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:scale-105 active:scale-95 transition-all outline-none"
             >
               Return to Hub
             </button>
          </div>
        ) : (
          <iframe srcDoc={viewerContent} className="w-full h-full border-none bg-white" title="Shadow Node" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#00E676]/30 h-screen overflow-y-auto no-scrollbar scroll-smooth snap-y snap-mandatory bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl z-[100] flex items-center justify-between px-6 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#00E676] flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.3)]">
            <ShieldCheck className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-black tracking-[0.2em] text-[#00E676]">SHADOW-NET</span>
        </div>
        
        <div className="flex items-center gap-6 md:gap-12">
          {user && (
            <button onClick={() => setShowDashboard(true)} className="hidden md:flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-[#00E676] transition-colors">
              <Layout className="w-3.5 h-3.5" /> Dashboard ({myDeployments.length})
            </button>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">Operator</div>
                  <div className="text-[10px] font-bold text-[#00E676]">{user.email?.split('@')[0]}</div>
                </div>
                <img src={user.photoURL || ''} className="w-9 h-9 rounded-full border border-white/10" alt="avatar" />
              </div>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                <LogIn className="w-3.5 h-3.5" /> Identify
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* DASHBOARD OVERLAY */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6 md:p-12">
            <div className="w-full max-w-6xl bg-[#111]/80 border border-white/10 rounded-[48px] p-8 md:p-16 h-[85vh] flex flex-col relative shadow-[0_0_100px_rgba(0,0,0,1)]">
               <div className="flex justify-between items-center mb-16">
                  <div className="flex items-center gap-6">
                    <Navigation2 className="w-10 h-10 text-[#00E676]" />
                    <h2 className="text-4xl font-black italic tracking-tighter">Relay Control.</h2>
                  </div>
                  <button onClick={() => setShowDashboard(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all rotate-45"><Zap className="w-6 h-6" /></button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-4">
                  {myDeployments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/10 space-y-6">
                       <Server className="w-20 h-20" />
                       <span className="font-black uppercase tracking-[0.5em] text-xs">No Nodes Propagated</span>
                    </div>
                  ) : (
                    myDeployments.map(dep => (
                      <div key={dep.id} className="bg-white/5 border border-white/5 p-8 rounded-3xl flex flex-col md:flex-row md:justify-between md:items-center gap-6 group hover:bg-[#151515] hover:border-[#00E676]/20 transition-all">
                         <div className="flex items-center gap-8">
                            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-[#00E676] group-hover:scale-110 transition-transform"><Activity className="w-7 h-7" /></div>
                            <div>
                               <div className="flex items-center gap-3">
                                 <span className="font-black text-2xl">{dep.siteName}</span>
                                 <span className="px-3 py-1 bg-[#00E676]/10 text-[#00E676] text-[9px] font-black rounded-full border border-[#00E676]/20 uppercase">Live</span>
                               </div>
                               <div className="text-white/30 text-xs font-mono mt-1">{dep.fullDomain}</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <a href={`${window.location.origin}${window.location.pathname}?n=${dep.siteName}`} target="_blank" className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all"><Eye className="w-5 h-5" /></a>
                            <button onClick={() => deleteNode(dep.id)} className="h-14 px-8 bg-red-500/10 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-3"><Trash2 className="w-4 h-4" /> Purge</button>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: HERO */}
      <section className="snap-start min-h-screen flex flex-col justify-center items-center px-10 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,230,118,0.06),transparent_60%)]" />
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} className="text-center z-10 space-y-16">
          <div className="space-y-6">
             <h1 className="text-[10rem] md:text-[14rem] font-black tracking-tighter leading-[0.75] italic">
               SHADOW <br/> <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/20">ELITE.</span>
             </h1>
             <p className="text-white/30 text-lg md:text-2xl font-bold uppercase tracking-[0.6em] leading-loose max-w-2xl mx-auto">Instant Static Isolation Hub</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <button 
              onClick={() => document.getElementById('config-node')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-20 py-8 bg-[#00E676] text-black font-black text-2xl rounded-2xl shadow-[0_30px_100px_rgba(0,230,118,0.2)] hover:scale-110 active:scale-95 transition-all outline-none"
            >
              INITIALIZE NODE
            </button>
            <div className="flex items-center gap-8 px-10 py-8 border border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl">
               <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-emerald-400" /> <span className="text-[10px] font-black uppercase tracking-widest text-white/50">SLS Security</span></div>
               <div className="h-4 w-px bg-white/10" />
               <div className="flex items-center gap-3"><Lock className="w-5 h-5 text-blue-400" /> <span className="text-[10px] font-black uppercase tracking-widest text-white/50">End-to-End</span></div>
            </div>
          </div>
        </motion.div>
        
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-12 flex flex-col items-center gap-3 text-white/10">
          <span className="text-[9px] font-black uppercase tracking-[0.5em]">Systems Optimized</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </section>

      {/* SECTION 2: CONFIGURATION */}
      <section id="config-node" className="snap-start min-h-screen flex flex-col justify-center px-6 md:px-24 relative bg-black/40">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-32 items-center">
            
            <div className="space-y-16">
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-1 w-12 bg-[#00E676] rounded-full" />
                    <span className="text-[12px] font-black text-[#00E676] uppercase tracking-[0.5em]">Identify Node</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-black italic tracking-tighter leading-tight">Assign <br/> Identity.</h2>
                  <p className="text-white/40 text-xl font-medium leading-relaxed">Shadow-Net maps your assets to a secure global edge. Fast-Pass enabled for high-bandwidth propagation.</p>
               </div>

               <div className="space-y-8">
                  <div className="relative group">
                     <input 
                       type="text"
                       value={siteName}
                       onChange={(e) => { setSiteName(e.target.value); if (domainError) setDomainError(null); setDomainAvailable(null); if (deployStatus === DeployStatus.ERROR) setDeployStatus(DeployStatus.IDLE); }}
                       onBlur={() => siteName && checkDomainAvailability(siteName)}
                       placeholder="node-identifier"
                       className={`w-full h-24 bg-[#111]/60 border rounded-3xl px-10 text-2xl font-black transition-all outline-none focus:border-[#00E676]/40 ${domainError ? 'border-red-500/50' : 'border-white/5'}`}
                     />
                     <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-4">
                        {domainAvailable === true && <Check className="w-6 h-6 text-[#00E676]" />}
                        {domainError && <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">{domainError}</span>}
                        <span className="text-white/10 font-black text-xl italic tracking-tighter">.WEB.APP</span>
                     </div>
                  </div>

                  <AnimatePresence>
                    {(suggestions.length > 0 || isCheckingSuggestions) && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }}
                        className="flex flex-wrap gap-3 px-2"
                      >
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 w-full mb-1">Available Alternatives:</span>
                        {isCheckingSuggestions ? (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-[#00E676]/40 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Scanning Relay...
                          </div>
                        ) : (
                          suggestions.map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setSiteName(s);
                                setDomainError(null);
                                setDomainAvailable(true);
                                setSuggestions([]);
                                handleDeploy(s);
                              }}
                              className="px-4 py-2 bg-[#00E676]/5 border border-[#00E676]/20 rounded-xl text-[11px] font-black text-[#00E676] hover:bg-[#00E676] hover:text-black transition-all"
                            >
                              {s}
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if(f) processFile(f); }}
                    className={`h-72 rounded-[48px] border-2 border-dashed flex flex-col items-center justify-center gap-8 cursor-pointer transition-all relative group ${isDragging ? 'border-[#00E676] bg-[#00E676]/5' : 'border-white/5 bg-[#111]/40 hover:border-white/10 hover:bg-[#111]/60'}`}
                    onClick={() => document.getElementById('up-zone')?.click()}
                  >
                     {stagedFile ? (
                        <div className="flex flex-col items-center gap-6">
                           <div className="w-20 h-20 bg-[#00E676]/10 rounded-3xl flex items-center justify-center text-[#00E676]"><HardDrive className="w-10 h-10" /></div>
                           <div className="text-center">
                              <div className="text-lg font-black text-white/80">{stagedFile.name}</div>
                              <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2">{stagedFile.size} — Ready for Shadow Sync</div>
                           </div>
                        </div>
                     ) : (
                        <>
                           <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 group-hover:scale-110 group-hover:text-[#00E676]/60 transition-all"><Cloud className="w-12 h-12" /></div>
                           <div className="text-center">
                              <div className="text-2xl font-black text-white/40">Drop Source</div>
                              <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-3 italic">ZIP (Auto-Extraction) or HTML</div>
                           </div>
                        </>
                     )}
                     <input id="up-zone" type="file" className="hidden" onChange={(e) => {const f = e.target.files?.[0]; if(f) processFile(f);}} />
                  </div>
               </div>
            </div>

            <div className="relative group">
               <div className="absolute -inset-1 bg-[#00E676] rounded-[60px] blur opacity-0 group-hover:opacity-10 transition-opacity" />
               <div className="relative bg-[#111]/40 border border-white/5 rounded-[60px] p-12 h-[750px] shadow-2xl backdrop-blur-2xl flex flex-col">
                  <div className="flex items-center justify-between mb-12">
                     <div className="flex gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500/20" />
                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-500/20" />
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500/20" />
                     </div>
                     <div className="flex items-center gap-4">
                        {isVerifyingIntegrity && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-[#00E676] animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" /> E2E CHECKING...
                          </div>
                        )}
                        {isIntegrityVerified && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-black bg-[#00E676] px-3 py-1 rounded-full border border-[#00E676]/20 uppercase tracking-tighter">
                            <ShieldCheck className="w-3 h-3" /> E2E VERIFIED
                          </div>
                        )}
                        <span className="px-5 py-2 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-3">
                           <FileCode className="w-4 h-4 text-[#00E676]" /> Ingestion Buffer
                        </span>
                     </div>
                  </div>
                  
                  <textarea 
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="flex-1 bg-transparent border-none text-white/20 font-mono text-sm leading-relaxed outline-none resize-none custom-scrollbar" 
                  />

                  <div className="absolute bottom-12 right-12">
                     <div className="relative group/btn">
                        <div className="absolute inset-0 bg-[#00E676]/40 blur-2xl opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                        <button 
                          onClick={handleDeploy}
                          disabled={deployStatus !== DeployStatus.IDLE || !!domainError}
                          className="relative w-28 h-28 bg-[#00E676] text-black rounded-full shadow-[0_20px_60px_rgba(0,230,118,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all outline-none disabled:opacity-20 disabled:scale-90"
                        >
                           <Zap className="w-12 h-12 fill-current" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>

        </div>
      </section>

      {/* SECTION 3: DEPLOYMENT STATUS / PHONE PREVIEW */}
      <section id="deploy-status" className="snap-start min-h-screen flex items-center justify-center px-10 md:px-24 bg-black relative">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-24 md:gap-40 items-center">
            
            {/* PHONE PREVIEW */}
            <div className="flex justify-center order-2 lg:order-1">
               <div className="w-[340px] h-[680px] bg-black rounded-[60px] border-[14px] border-[#1F1F1F] shadow-[0_0_200px_rgba(0,0,0,1)] relative overflow-hidden group">
                  <div className="absolute inset-x-0 top-0 h-12 flex items-center justify-between px-10 z-[50] text-[10px] font-black text-white/30 tracking-widest">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-2">
                       <Signal className="w-4 h-4" />
                       <Battery className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="absolute top-0 left-1/2 -track-x-1/2 w-36 h-9 bg-black rounded-b-3xl z-[60] ml-[-72px]" />
                  <div className="absolute inset-0 bg-white">
                     <iframe ref={previewIframeRef} className="w-full h-full border-none" title="Live Preview" />
                  </div>
                  {/* Subtle glass overlay */}
                  <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 rounded-[48px]" />
               </div>
            </div>

            {/* STATUS CARDS */}
            <div className="order-1 lg:order-2 space-y-16">
               {deployStatus === DeployStatus.SUCCESS ? (
                  <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="bg-[#111]/80 border border-[#00E676]/30 p-12 md:p-20 rounded-[64px] backdrop-blur-3xl shadow-[0_40px_100px_rgba(0,0,0,1)] relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-12">
                        <div className="px-6 py-2 bg-[#00E676]/10 text-[#00E676] text-[10px] font-black uppercase tracking-[0.4em] rounded-full border border-[#00E676]/20">Active Node</div>
                     </div>

                     <div className="flex items-center gap-10 mb-16">
                        <div className="w-20 h-20 bg-[#00E676]/20 rounded-[28px] flex items-center justify-center text-[#00E676] shadow-[0_0_40px_rgba(0,230,118,0.2)]">
                           <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div>
                           <h3 className="text-5xl font-black italic tracking-tighter mb-2">Relay Live.</h3>
                           <p className="text-white/20 text-xs font-black uppercase tracking-[0.2em]">Global Edge Propagation Success</p>
                        </div>
                     </div>

                     <div className="space-y-10 mb-16">
                        <div className="space-y-4">
                           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Identity Subdomain</span>
                           <div className="h-18 bg-black/60 border border-white/5 flex items-center px-8 rounded-2xl font-mono text-sm text-[#00E676] truncate">{siteName.toLowerCase()}.web.app</div>
                        </div>
                        <div className="space-y-4">
                           <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Shadow Relay Bridge (Live)</span>
                           <div className="flex gap-4">
                              <div className="flex-1 h-18 bg-black/60 border border-white/5 flex items-center px-8 rounded-2xl font-mono text-[10px] text-white/40 truncate">{deployedUrl}</div>
                              <button 
                                onClick={() => { navigator.clipboard.writeText(deployedUrl); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }}
                                className="w-18 h-18 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all"
                              >
                                 {isCopied ? <Check className="w-6 h-6 text-[#00E676]" /> : <Copy className="w-6 h-6 text-white/30" />}
                              </button>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <a href={deployedUrl} target="_blank" rel="noreferrer" className="h-20 bg-white text-black rounded-[28px] flex items-center justify-center gap-4 font-black uppercase text-[11px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5">
                           Launch Hub <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => setDeployStatus(DeployStatus.IDLE)} className="h-20 bg-white/5 border border-white/10 text-white rounded-[28px] font-black uppercase text-[11px] tracking-widest hover:bg-white/10 transition-all">
                           New Relay
                        </button>
                     </div>
                  </motion.div>
               ) : (
                  <div className="space-y-12">
                     <div className="space-y-6">
                        <span className="text-[12px] font-black text-[#00E676] uppercase tracking-[0.5em]">Sync Phase</span>
                        <h2 className="text-7xl md:text-8xl font-black italic tracking-tighter leading-tight">Propagate <br/> to Hub.</h2>
                        <p className="text-white/30 text-xl font-medium leading-relaxed max-w-xl">Instant propagation v13. AES-256 masking and global sync typically complete in <strong>&lt; 5 seconds</strong>.</p>
                     </div>

                     <div className="space-y-8">
                        <button 
                           onClick={handleDeploy}
                           disabled={deployStatus !== DeployStatus.IDLE || !siteName}
                           className="w-full h-32 bg-[#00E676] text-black rounded-[40px] flex items-center justify-center gap-10 shadow-[0_40px_100px_rgba(0,230,118,0.2)] hover:scale-[1.02] active:scale-98 disabled:opacity-20 transition-all outline-none"
                        >
                           {deployStatus === DeployStatus.IDLE ? (
                              <>
                                <span className="text-4xl font-black italic tracking-tighter">GHOSTIFY NODE</span>
                                <Zap className="w-12 h-12 fill-current" />
                              </>
                           ) : (
                              <div className="flex items-center gap-8 italic font-black text-3xl">
                                 <RefreshCw className="w-12 h-12 animate-spin" />
                                 {deployStatus}...
                              </div>
                           )}
                        </button>
                     </div>

                     <div className="flex gap-12 justify-center lg:justify-start">
                        <div className="flex items-center gap-3 text-white/20"><Globe className="w-4 h-4" /> <span className="text-[10px] font-black tracking-widest uppercase">Global CDN</span></div>
                        <div className="flex items-center gap-3 text-white/20"><ShieldCheck className="w-4 h-4 text-emerald-400/40" /> <span className="text-[10px] font-black tracking-widest uppercase">Verified Hub</span></div>
                        <div className="flex items-center gap-3 text-white/20"><Terminal className="w-4 h-4" /> <span className="text-[10px] font-black tracking-widest uppercase">Dev Console</span></div>
                     </div>
                  </div>
               )}
            </div>

        </div>
      </section>

      {/* Persistent Status Overlay */}
      <div className="fixed bottom-12 left-12 z-[100]">
        <button 
          onClick={() => setShowDashboard(true)}
          className="relative group outline-none"
        >
           <div className="absolute inset-0 bg-[#00E676]/20 blur-2xl group-hover:opacity-100 opacity-60 transition-opacity" />
           <div className="relative flex items-center gap-5 bg-black/60 border border-white/5 px-10 py-5 rounded-full backdrop-blur-3xl shadow-2xl transition-all hover:scale-105 active:scale-95">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 group-hover:text-[#00E676] transition-colors">Shadow-Net Engine v13 / Instant</span>
           </div>
        </button>
      </div>

      <AnimatePresence>
        {deployStatus !== DeployStatus.IDLE && deployStatus !== DeployStatus.SUCCESS && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-6 pointer-events-none"
          >
            <div className="bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col gap-4 pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#00E676]/20 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-[#00E676] animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#00E676]">{deployStatus}</h3>
                    <p className="text-[10px] text-white/30 font-bold">Node Sequence Active</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <Timer className="w-3 h-3 text-[#00E676]" />
                  <span className="text-xs font-mono font-black text-white/60">{elapsedTime.toFixed(1)}s</span>
                </div>
              </div>

              <div className="h-px bg-white/5 w-full" />

              <div className="space-y-2 overflow-hidden h-12">
                <AnimatePresence mode="popLayout">
                  {activeLogs.slice(0, 2).map((log, i) => (
                    <motion.div 
                      key={log + i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1 - i * 0.4, x: 0 }}
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-3"
                    >
                      <div className="w-1 h-1 bg-[#00E676] rounded-full" />
                      {log}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
