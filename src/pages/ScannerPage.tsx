import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '../lib/supabase';

export const ScannerPage: React.FC = () => {
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [scanType, setScanType] = useState<'IN' | 'OUT'>('OUT');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText: string) {
      handleValidateStudent(decodedText, scanType);
    }

    function onScanFailure(_error: any) {}

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [scanType]); // Re-render scanner if we absolutely have to, or just read state in the handler via passed param

  const handleValidateStudent = async (qrId: string, currentScanType: 'IN' | 'OUT') => {
    setLoading(true);
    setStatus('idle');
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, student_authorizations(*)')
        .eq('qr_code_id', qrId)
        .single();

      if (error || !data) throw new Error('Estudante não encontrado');

      setStudent(data);
      
      // Se for Saída (OUT), verificar se tem autorização ativa
      if (currentScanType === 'OUT' && !data.is_authorized) {
        setStatus('error');
      } else {
        // Se for Entrada (IN) ou se tiver autorizado para Saída
        setStatus('success');
        
        // Log the access
        await supabase.from('access_logs').insert({
          student_id: data.id,
          type: currentScanType,
        });
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 pb-32">
      <header className="mb-8 text-center">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Portaria Digital</p>
        <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Controle de Acesso</h1>
        <p className="text-on-surface-variant font-medium mt-1">Aponte o QR Code do aluno para a câmera</p>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        
        {/* Toggle IN / OUT */}
        <div className="glass-card p-1.5 rounded-2xl flex gap-1.5 w-full mx-auto relative">
          <button 
            onClick={() => setScanType('IN')}
            className={`flex-1 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
              scanType === 'IN' ? 'bg-gradient-to-r from-tertiary-fixed to-tertiary-fixed-dim text-on-tertiary-fixed shadow-md shadow-tertiary-fixed/20 scale-[1.02]' : 'text-outline hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">login</span>
            Entrada
          </button>
          <button 
            onClick={() => setScanType('OUT')}
            className={`flex-1 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
              scanType === 'OUT' ? 'bg-gradient-to-r from-error to-error/80 text-white shadow-md shadow-error/20 scale-[1.02]' : 'text-outline hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Saída
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden p-2 shadow-xl">
          <div className="rounded-[2rem] overflow-hidden aspect-square relative bg-on-surface">
            <div id="reader" className="w-full h-full"></div>
            
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
                  <span className="text-xs font-bold text-primary uppercase tracking-widest">Processando...</span>
                </div>
              </div>
            )}

            {status !== 'idle' && (
              <div className={`absolute inset-0 flex items-center justify-center z-20 ${
                status === 'success' 
                  ? 'bg-gradient-to-br from-tertiary-fixed/95 to-tertiary-fixed-dim/95 text-on-tertiary-fixed' 
                  : 'bg-gradient-to-br from-error/95 to-error/80 text-white'
              }`}>
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-7xl mb-4 block" style={{fontVariationSettings: "'FILL' 1"}}>
                    {status === 'success' ? 'check_circle' : 'cancel'}
                  </span>
                  <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">
                    {status === 'success' ? (scanType === 'IN' ? 'Entrada Registrada' : 'Saída Permitida') : 'Acesso Negado'}
                  </h2>
                  <p className="text-sm opacity-80 font-medium mb-6">
                    {status === 'success' ? 'Registro salvo com sucesso' : 'Aluno sem autorização de saída'}
                  </p>
                  <button 
                    onClick={() => {setStatus('idle'); setStudent(null);}}
                    className="px-8 py-3 bg-white/20 backdrop-blur-sm rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-white/30 transition-all hover:scale-105"
                  >
                    <span className="material-symbols-outlined text-base align-middle mr-1">refresh</span>
                    Novo Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Result Card */}
        {student && (
          <div className="glass-card rounded-[2rem] p-6 shadow-lg">
            <div className="flex items-center gap-5">
              <div className="relative">
                <img 
                  src={student.photo_url || "https://via.placeholder.com/150"} 
                  alt="Foto" 
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white shadow-md"
                />
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                  student.is_authorized ? 'bg-tertiary-fixed' : 'bg-error'
                }`}>
                  <span className="material-symbols-outlined text-white text-[10px]" style={{fontVariationSettings: "'FILL' 1"}}>
                    {student.is_authorized ? 'check' : 'close'}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-headline font-bold text-lg text-on-surface">{student.full_name}</h3>
                <p className="text-xs text-outline font-medium mt-0.5">#{student.enrollment_id} • {student.grade}</p>
                <div className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  student.is_authorized ? 'bg-tertiary-fixed/20 text-on-tertiary-container' : 'bg-error/10 text-error'
                }`}>
                  {student.is_authorized ? 'Liberado' : 'Bloqueado'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!student && !loading && status === 'idle' && (
          <div className="glass-card rounded-[2rem] p-10 text-center">
             <span className="material-symbols-outlined text-5xl mb-3 text-outline/30 block">qr_code_scanner</span>
             <p className="text-sm font-bold text-outline">Aguardando leitura do QR Code...</p>
             <p className="text-xs text-outline/60 mt-1">Posicione o cartão do aluno em frente à câmera</p>
          </div>
        )}
      </div>
    </div>
  );
};
