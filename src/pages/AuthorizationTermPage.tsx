import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';

export const AuthorizationTermPage: React.FC = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    if (studentId) fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (error) {
      console.error(error);
      navigate('/students');
    } else {
      setStudent(data);
    }
    setLoading(false);
  };

  const handlePrint = () => window.print();

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button 
          onClick={() => navigate('/students')} 
          className="flex items-center gap-2 text-gray-600 hover:text-primary font-bold transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar aos Alunos
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-10 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 hover:scale-105 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined">print</span>
          IMPRIMIR TERMO OFICIAL
        </button>
      </div>

      {/* Document Sheet - Optimized for A4 Portrait */}
      <div className="w-full max-w-[210mm] mx-auto bg-white shadow-2xl relative print:shadow-none print:m-0" id="printable-term">
        
        {/* Absolute Container for Print Scaling */}
        <div className="p-12 md:p-20 flex flex-col min-h-[297mm] relative overflow-hidden print:p-0 print:shadow-none">
          
          <div className="relative z-10 flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="text-center mb-6 border-b-2 border-gray-950 pb-4">
              <div className="flex justify-center mb-6">
                <img src="/ceti-logo.png" alt="CETI Logo" className="h-16 w-auto object-contain" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
                  GOVERNO DO ESTADO DA BAHIA
                </h1>
                <h2 className="text-base font-bold text-gray-600 uppercase tracking-[0.2em]">
                  SECRETARIA DA EDUCAÇÃO
                </h2>
                <h3 className="text-lg font-black text-primary uppercase tracking-tight">
                  COLÉGIO ESTADUAL DE TEMPO INTEGRAL DE NOVA ITARANA
                </h3>
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-black inline-block uppercase tracking-tight text-gray-950 border-b-4 border-gray-950 pb-1">
                Termo de Autorização
              </h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Controle de Saída - Almoço Externo</p>
            </div>

            {/* Body Content */}
            <div className="flex-1 space-y-8 text-gray-950 text-justify leading-relaxed font-sans text-[12pt]">
              <p>
                Eu, <strong className="text-xl border-b border-gray-400">{student.guardian_name || "__________________________________________________"}</strong>, 
                portador(a) do CPF nº <strong className="bg-gray-50 px-2">{student.guardian_cpf || "____________________"}</strong>, 
                na condição de responsável legal pelo(a) aluno(a) <strong className="text-xl text-primary font-black uppercase tracking-tight">{student.full_name}</strong>, 
                matriculado(a) sob RM nº <strong className="font-mono font-bold">{student.enrollment_id}</strong>, cursando o <strong className="underline decoration-gray-400">{student.grade}</strong>, 
                nascido(a) em <strong className="font-mono">{student.birth_date ? format(new Date(student.birth_date), "dd/MM/yyyy") : "___/___/______"}</strong>, 
                inscrito(a) no CPF nº <strong className="bg-gray-50 px-2">{student.cpf || "____________________"}</strong>, 
                venho por este instrumento:
              </p>

              <div className="pl-6 space-y-4 border-l-4 border-primary/20 bg-gray-50/50 p-6 rounded-r-2xl">
                <p>
                  <strong>1. AUTORIZAR</strong> a saída do(a) discente no horário de almoço (12h às 13h);
                </p>
                <p>
                  <strong>2. DECLARAR</strong> ciência de que a responsabilidade civil e criminal sobre o(a) menor, uma vez fora do ambiente escolar, recai inteiramente sobre os pais/responsáveis;
                </p>
                <p>
                  <strong>3. CIÊNCIA</strong> de que o acesso só será permitido mediante a apresentação obrigatória da <strong>Carteira Estudantil Oficial</strong>.
                </p>
              </div>

              <p className="pt-8 font-sans text-base text-gray-600">
                Nova Itarana - BA, {today}.
              </p>
            </div>

            {/* Signatures */}
            <div className="mt-10 grid grid-cols-2 gap-12">
              <div className="text-center">
                <div className="border-t border-black pt-2">
                  <p className="font-black text-gray-900 uppercase text-[11px]">{student.guardian_name || "Assinatura do Responsável"}</p>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Responsável Legal</p>
                  <p className="text-[8px] text-gray-400">CPF: {student.guardian_cpf || "___.___.___-__"}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-black pt-2">
                  <p className="font-black text-gray-900 uppercase text-[11px]">Direção CETI</p>
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Assinatura e Carimbo Oficial</p>
                </div>
              </div>
            </div>

            {/* Footer Text & QR Authenticity */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-black">Sistema CETI v2.6</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Documento gerado eletronicamente em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
                <p className="text-[10px] font-black uppercase tracking-widest italic text-primary mt-2">Validez supeditada à conferência da identidade escolar</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="p-2 border-2 border-gray-100 rounded-xl">
                  {/* We can use the student's QR ID as a verification token */}
                  <div className="w-16 h-16 bg-white flex items-center justify-center border border-gray-100">
                    <QRCodeSVG value={`https://ceti-digital.vercel.app/verify/${student.qr_code_id}`} size={64} level="H" />
                  </div>
                </div>
                <span className="text-[8px] font-mono font-bold text-gray-400">VERIFICAÇÃO: {student.qr_code_id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 0 !important;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            background: white !important;
            font-family: Arial, sans-serif !important;
          }
          .print\\:hidden { display: none !important; }
          #printable-term {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 30mm 20mm 20mm 30mm !important;
            box-sizing: border-box !important;
            background: white !important;
            z-index: 9999 !important;
            overflow: hidden !important;
          }
          #printable-term > div {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
          }
          /* Typography */
          .font-sans { font-size: 11pt !important; line-height: 1.4 !important; }
          h1 { font-size: 12pt !important; }
          h2 { font-size: 12pt !important; }
          strong { font-weight: bold !important; }
          
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}} />
    </div>
  );
};
