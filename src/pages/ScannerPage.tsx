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
    <div className="min-h-screen bg-surface p-6 pb-32">
      <header className="mb-10 text-center">
        <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Controle Portaria</h1>
        <p className="text-outline font-medium">Aponte o QR Code para a câmera</p>
      </header>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* Toggle IN / OUT */}
        <div className="bg-surface-container-high p-2 rounded-2xl flex gap-2 w-full mx-auto relative shadow-sm">
          <button 
            onClick={() => setScanType('IN')}
            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all z-10 ${
              scanType === 'IN' ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-md' : 'text-outline hover:bg-surface-container-highest'
            }`}
          >
            Entrada
          </button>
          <button 
            onClick={() => setScanType('OUT')}
            className={`flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all z-10 ${
              scanType === 'OUT' ? 'bg-error-container text-on-error-container shadow-md' : 'text-outline hover:bg-surface-container-highest'
            }`}
          >
            Saída
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="bg-surface-container-highest rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl aspect-square relative">
          <div id="reader" className="w-full h-full"></div>
          
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {status !== 'idle' && (
            <div className={`absolute inset-0 flex items-center justify-center z-20 animate-in fade-in zoom-in duration-300 ${
              status === 'success' ? 'bg-tertiary-fixed/90 text-on-tertiary-fixed' : 'bg-error-container/90 text-on-error-container'
            }`}>
              <div className="text-center p-8">
                <span className="material-symbols-outlined text-6xl mb-4">
                  {status === 'success' ? 'check_circle' : 'cancel'}
                </span>
                <h2 className="text-2xl font-bold uppercase tracking-widest">
                  {status === 'success' ? (scanType === 'IN' ? 'Entrada Registrada' : 'Saída Permitida') : 'Acesso Negado'}
                </h2>
                <button 
                  onClick={() => {setStatus('idle'); setStudent(null);}}
                  className="mt-6 px-8 py-3 bg-white/20 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-white/40 transition-colors"
                >
                  Novo Scan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Result Card */}
        {student && (
          <div className="bg-white rounded-[2rem] p-8 shadow-xl animate-in slide-in-from-bottom-5 duration-500 border border-outline-variant/30">
            <div className="flex items-center gap-6">
              <img 
                src={student.photo_url || "https://via.placeholder.com/150"} 
                alt="Foto" 
                className="w-20 h-20 rounded-2xl object-cover shadow-md bg-surface-container-high"
              />
              <div>
                <h3 className="font-headline font-bold text-xl text-primary">{student.full_name}</h3>
                <p className="text-sm text-outline font-medium tracking-tight mt-1">ID: {student.enrollment_id} • {student.grade}</p>
                <div className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  student.is_authorized ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
                }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {student.is_authorized ? 'verified' : 'block'}
                  </span>
                  {student.is_authorized ? 'Status: Liberado' : 'Status: Bloqueado'}
                </div>
              </div>
            </div>
          </div>
        )}

        {!student && !loading && status === 'idle' && (
          <div className="bg-surface-container-low rounded-[2rem] p-8 text-center text-outline">
             <span className="material-symbols-outlined text-4xl mb-2 opacity-50">qr_code_scanner</span>
             <p className="text-sm font-medium">Aguardando bilhete virtual...</p>
          </div>
        )}
      </div>
    </div>
  );
};
