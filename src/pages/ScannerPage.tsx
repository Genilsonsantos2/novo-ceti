import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const ScannerPage: React.FC = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [scanType, setScanType] = useState<'IN' | 'OUT'>('OUT');
  const [cameras, setCameras] = useState<{ id: string, label: string }[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [isScannerStarted, setIsScannerStarted] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanTypeRef = useRef<'IN' | 'OUT'>('OUT');
  const lastScannedIdRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Sync ref with state for the scanner callback
  useEffect(() => {
    scanTypeRef.current = scanType;
  }, [scanType]);

  useEffect(() => {
    // Initial camera detection
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length > 0) {
        const formattedCameras = devices.map(d => ({ id: d.id, label: d.label }));
        setCameras(formattedCameras);
        
        // Prefer back camera
        const backCamera = formattedCameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('traseira') ||
          c.label.toLowerCase().includes('0')
        );
        setActiveCameraId(backCamera ? backCamera.id : formattedCameras[0].id);
      } else {
        setErrorMessage("Nenhuma câmera encontrada no dispositivo.");
      }
    }).catch(err => {
      console.error("Erro ao listar câmeras:", err);
      setErrorMessage("Erro ao acessar câmeras. Verifique as permissões.");
    });

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraId: string) => {
    if (scannerRef.current) {
      await stopScanner();
    }

    const scanner = new Html5Qrcode("reader", { 
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
      verbose: false
    });
    scannerRef.current = scanner;

    try {
      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleValidateStudent(decodedText);
        },
        (_errorMessage) => {
          // ignore
        }
      );
      
      setIsScannerStarted(true);
      setErrorMessage(null);
      
      // Check if torch is supported
      const capabilities = scanner.getRunningTrackCapabilities();
      setHasFlash(!!(capabilities as any).torch);
      
    } catch (err) {
      console.error("Falha ao iniciar scanner:", err);
      setErrorMessage("Não foi possível iniciar a câmera selecionada.");
      setIsScannerStarted(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScannerStarted(false);
        setIsFlashOn(false);
      } catch (err) {
        console.error("Erro ao parar scanner:", err);
      }
    }
  };

  const toggleFlash = async () => {
    if (scannerRef.current && hasFlash) {
      const newState = !isFlashOn;
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: newState } as any]
        });
        setIsFlashOn(newState);
      } catch (err) {
        console.error("Erro ao alternar flash:", err);
      }
    }
  };

  useEffect(() => {
    if (activeCameraId && !isScannerStarted) {
      startScanner(activeCameraId);
    }
  }, [activeCameraId]);

  const playBeep = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const EXIT_TYPE_CONFIG: Record<string, { label: string; sub: string; color: string; icon: string }> = {
    none:  { label: 'Sem Autorização',          sub: 'Saída NÃO permitida',              color: 'bg-logo-red/10 text-logo-red border border-logo-red/30',    icon: 'block' },
    lunch: { label: 'Autorizado: Almoço',        sub: 'Saída 12h00 – 13h00',             color: 'bg-logo-green/10 text-logo-green border border-logo-green/30', icon: 'restaurant' },
    gym:   { label: 'Autorizado: Academia',      sub: 'Saída 14h40 – 16h10',             color: 'bg-logo-blue/10 text-logo-blue border border-logo-blue/30',   icon: 'fitness_center' },
    both:  { label: 'Autorizado: Almoço + Acad.', sub: 'Saída 12h–13h e 14h40–16h10',  color: 'bg-purple-100 text-purple-700 border border-purple-300',        icon: 'verified_user' },
    term:  { label: 'Termo Assinado',            sub: 'Saída Autorizada pelos Pais',     color: 'bg-emerald-100 text-emerald-700 border border-emerald-300',     icon: 'assignment_turned_in' },
  };

  const handleValidateStudent = async (qrId: string) => {
    // Prevent multiple simultaneous scans or rapid repeats of the same code
    const now = Date.now();
    const cooldownMs = 5000; // 5 seconds cooldown for the same code
    
    if (loading || status !== 'idle') return;
    
    if (qrId === lastScannedIdRef.current && (now - lastScannedTimeRef.current) < cooldownMs) {
      return;
    }

    setLoading(true);
    lastScannedIdRef.current = qrId;
    lastScannedTimeRef.current = now;
    
    const currentScanType = scanTypeRef.current;
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, student_authorizations(*), term_attachments(id)')
        .eq('qr_code_id', qrId)
        .single();

      if (error || !data) throw new Error('Estudante não encontrado');

      // Restrição Global: Só libera se is_authorized=true E tem o termo devolvido
      const hasReturnedTerm = data.term_attachments && data.term_attachments.length > 0;
      const isAccessAllowed = data.is_authorized && hasReturnedTerm;

      // Log the scan attempt (both allowed and denied)
      try {
        await supabase.from('access_logs').insert({
          student_id: data.id,
          type: currentScanType,
          gatekeeper_id: user?.id,
          notes: isAccessAllowed ? 'Acesso Permitido' : 'Acesso Negado: Termo ou Autorização Pendente'
        });
      } catch (err) {
        console.error('Erro ao registrar log:', err);
      }

      if (!isAccessAllowed) {
        setStudent(data);
        setStatus('error');
        playBeep('error');
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      } else {
        setStatus('success');
        playBeep('success');
        if ('vibrate' in navigator) navigator.vibrate(200);
        
        const exitType = data.exit_type || 'none';
        const hasActiveAuth = (data.student_authorizations && data.student_authorizations.length > 0) || hasReturnedTerm;
        
        // Se for Saída e for sucesso por causa do termo, garantimos que o UI mostre isso
        if (currentScanType === 'OUT' && hasActiveAuth && exitType === 'none') {
          data.exit_type = 'term';
        }

        setStudent(data);
      }

      // Auto-reset status after 3 seconds to allow next scan
      setTimeout(() => {
        setStatus('idle');
        setStudent(null);
      }, 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');
      setStudent(null);
      playBeep('error');
      if ('vibrate' in navigator) navigator.vibrate([300]);
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const switchCamera = () => {
    if (cameras.length < 2) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  return (
    <div className="min-h-screen p-6 pb-32">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Portaria Digital</p>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Controle de Acesso</h1>
        <p className="text-on-surface-variant font-medium mt-1">Scanner de QR Code inteligente</p>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* Toggle IN / OUT */}
        <div className="glass-card p-1.5 rounded-2xl flex gap-1.5 w-full mx-auto relative z-30">
          <button 
            onClick={() => setScanType('IN')}
            className={`flex-1 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
              scanType === 'IN' ? 'bg-logo-green text-white shadow-md shadow-logo-green/20 scale-[1.02]' : 'text-outline hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">login</span>
            Entrada
          </button>
          <button 
            onClick={() => setScanType('OUT')}
            className={`flex-1 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
              scanType === 'OUT' ? 'bg-logo-red text-white shadow-md shadow-logo-red/20 scale-[1.02]' : 'text-outline hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Saída
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden p-2 shadow-xl relative">
          <div className="rounded-[2rem] overflow-hidden aspect-square relative bg-black">
            <div id="reader" className="w-full h-full object-cover"></div>
            
            {/* Custom Scanning Overlay */}
            {isScannerStarted && status === 'idle' && !loading && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Border corners */}
                <div className="absolute top-10 left-10 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
                <div className="absolute top-10 right-10 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
                <div className="absolute bottom-10 left-10 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
                <div className="absolute bottom-10 right-10 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
                
                {/* Scanning line animation */}
                <div className="absolute top-10 left-10 right-10 h-0.5 bg-logo-blue/50 shadow-[0_0_15px_rgba(0,113,188,0.8)] animate-scan-line"></div>
              </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4 z-20">
               {cameras.length > 1 && (
                 <button 
                   onClick={switchCamera}
                   className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-all"
                   title="Trocar Câmera"
                 >
                   <span className="material-symbols-outlined">flip_camera_ios</span>
                 </button>
               )}
               {hasFlash && (
                 <button 
                   onClick={toggleFlash}
                   className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                     isFlashOn ? 'bg-logo-orange text-white shadow-lg shadow-logo-orange/30' : 'bg-black/40 text-white hover:bg-black/60'
                   }`}
                   title="Lanterna"
                 >
                   <span className="material-symbols-outlined" style={{fontVariationSettings: isFlashOn ? "'FILL' 1" : ""}}>
                     {isFlashOn ? 'flashlight_on' : 'flashlight_off'}
                   </span>
                 </button>
               )}
            </div>

            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-white animate-spin">progress_activity</span>
                  <span className="text-xs font-bold text-white uppercase tracking-widest">Validando...</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="absolute inset-0 bg-logo-red/90 text-white flex items-center justify-center z-40 p-8 text-center">
                <div>
                  <span className="material-symbols-outlined text-5xl mb-4">error</span>
                  <p className="font-bold mb-4">{errorMessage}</p>
                  <button 
                    onClick={() => startScanner(activeCameraId)}
                    className="px-6 py-2 bg-white text-logo-red rounded-xl font-bold uppercase text-xs"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            )}

            {status !== 'idle' && (
              <div className={`absolute inset-0 flex items-center justify-center z-50 animate-in fade-in zoom-in duration-300 ${
                status === 'success' 
                  ? 'bg-logo-green/95 text-white' 
                  : 'bg-logo-red/95 text-white'
              }`}>
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-8xl mb-4 block" style={{fontVariationSettings: "'FILL' 1"}}>
                    {status === 'success' ? 'check_circle' : 'cancel'}
                  </span>
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">
                    {status === 'success' ? (scanType === 'IN' ? 'Entrada Registrada' : 'Saída Permitida') : 'Acesso Negado'}
                  </h2>
                  <p className="text-sm opacity-90 font-medium mb-6">
                    {status === 'success' 
                      ? 'Registro salvo com sucesso' 
                      : (student 
                          ? (!student.is_authorized ? 'Aluno bloqueado pelo sistema' : 'Termo de autorização pendente') 
                          : 'Código não reconhecido')}
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full bg-white animate-progress-shrink origin-left"></div>
                    </div>
                    <span className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Aguarde para próximo scan</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Result Card */}
        {student && (() => {
          const exitType = student.exit_type || 'none';
          const cfg = EXIT_TYPE_CONFIG[exitType] || EXIT_TYPE_CONFIG['none'];
          return (
            <div className="glass-card rounded-[2rem] p-6 shadow-lg animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-5 mb-4">
                <div className="relative">
                  <img 
                    src={student.photo_url || "https://via.placeholder.com/150"} 
                    alt="Foto" 
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${
                    student.is_authorized ? 'bg-logo-green' : 'bg-logo-red'
                  }`}>
                    <span className="material-symbols-outlined text-white text-[12px]" style={{fontVariationSettings: "'FILL' 1"}}>
                      {student.is_authorized ? 'check' : 'close'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-[#001e40] font-black text-[14px] leading-[1.1] uppercase line-clamp-2 notranslate" translate="no">
                    {student.full_name}
                  </h2>
                  <p className="text-sm text-outline font-medium mt-0.5">#{student.enrollment_id} • {student.grade}</p>
                </div>
              </div>

              {/* Exit Authorization Badge - BIG & CLEAR */}
              <div className={`w-full p-4 rounded-2xl flex items-center gap-3 ${cfg.color}`}>
                <span className="material-symbols-outlined text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>{cfg.icon}</span>
                <div className="flex flex-col notranslate" translate="no">
                  <p className="font-black text-base uppercase tracking-wide">{cfg.label}</p>
                  <p className="text-xs font-bold opacity-70">{cfg.sub}</p>
                </div>
              </div>
            </div>
          );
        })()}

        {!student && !loading && status === 'idle' && (
          <div className="glass-card rounded-[2.5rem] p-8 text-center border-dashed border-2 border-outline/20 bg-white/40">
             <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-primary/40">qr_code_scanner</span>
             </div>
             <p className="text-sm font-bold text-on-surface">Aguardando Leitura</p>
             <p className="text-xs text-outline/60 mt-1 max-w-[200px] mx-auto">Posicione o QR Code no centro da moldura acima</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scan-line {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
        @keyframes progress-shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
        .animate-progress-shrink {
          animation: progress-shrink 3s linear forwards;
        }
        #reader video {
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
};

