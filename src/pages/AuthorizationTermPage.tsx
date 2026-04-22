import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    <div className="min-h-screen bg-gray-50 p-0 md:p-12">
      {/* Action Bar */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden px-4">
        <button onClick={() => navigate('/students')} className="text-primary font-black flex items-center gap-2 hover:underline">
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar para Alunos
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-xl flex items-center gap-3 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">print</span>
          IMPRIMIR TERMO OFICIAL
        </button>
      </div>

      {/* Document Sheet */}
      <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-2xl border border-gray-200 print:border-none p-16 md:p-24 relative overflow-hidden">
        {/* Background Emblem */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none w-[600px]">
           <img src="/ceti-logo.png" alt="" className="w-full h-full grayscale" />
        </div>

        {/* Header */}
        <div className="text-center mb-20 relative z-10 border-b-4 border-double border-gray-900 pb-10">
          <img src="/ceti-logo.png" alt="Logo" className="w-32 h-32 mx-auto mb-8 object-contain" />
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">
            GOVERNO DO ESTADO DA BAHIA
          </h1>
          <h2 className="text-lg font-bold text-gray-700 uppercase tracking-tight mb-4">
            SECRETARIA DA EDUCAÇÃO
          </h2>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest bg-gray-100 py-2 inline-block px-6 rounded-lg">
            COLÉGIO ESTADUAL DE TEMPO INTEGRAL DE NOVA ITARANA - CETI
          </h3>
        </div>

        {/* Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-widest decoration-primary decoration-[6px] underline-offset-[12px] underline">
            TERMO DE AUTORIZAÇÃO
          </h2>
          <p className="text-gray-500 font-black text-sm mt-8 uppercase tracking-[0.4em] block">Controle de Saída - Almoço Externo</p>
        </div>

        {/* Body */}
        <div className="space-y-10 text-gray-950 text-justify leading-[1.8] font-serif text-xl">
          <p>
            Eu, <strong className="text-2xl underline decoration-gray-300">{student.guardian_name || "__________________________________________________"}</strong>, 
            portador(a) do CPF nº <strong className="bg-gray-50 px-2">{student.guardian_cpf || "____________________"}</strong>, 
            na condição de responsável legal pelo(a) aluno(a) <strong className="text-2xl text-primary">{student.full_name}</strong>, 
            devidamente matriculado(a) sob o número de RM <strong className="font-mono">{student.enrollment_id}</strong>, cursando atualmente o <strong className="underline">{student.grade}</strong>, 
            nascido(a) em <strong className="font-mono">{student.birth_date ? format(new Date(student.birth_date), "dd/MM/yyyy") : "___/___/______"}</strong>, 
            inscrito(a) no CPF nº <strong className="bg-gray-50 px-2">{student.cpf || "____________________"}</strong>, 
            venho por este instrumento:
          </p>

          <div className="pl-6 space-y-8 border-l-4 border-primary/20">
            <p>
              <strong>1. AUTORIZAR</strong> a saída do(a) discente no horário de almoço (12h às 13h);
            </p>
            <p>
              <strong>2. DECLARAR</strong> ciência de que a responsabilidade civil e criminal sobre o(a) menor, uma vez fora do ambiente escolar, recai inteiramente sobre os pais/responsáveis;
            </p>
            <p>
              <strong>3. CIÊNCIA</strong> de que o acesso só será permitido mediante a apresentação da <strong>Carteira Estudantil Digital/Física</strong>.
            </p>
          </div>

          <p className="pt-10">
            Nova Itarana - BA, {today}.
          </p>
        </div>

        {/* Signature Area */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-24 relative z-10">
          <div className="text-center">
            <div className="border-t-2 border-gray-950 pt-4">
              <p className="font-black text-gray-900 uppercase text-base">{student.guardian_name || "Assinatura do Responsável"}</p>
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-2">Responsável Legal</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-950 pt-4">
              <p className="font-black text-gray-900 uppercase text-base">Direção CETI</p>
              <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mt-2">Assinatura e Carimbo Oficial</p>
            </div>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="mt-32 pt-10 border-t-2 border-gray-100 flex justify-between items-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-widest">Sistema CETI v2.0</p>
          <p className="text-[10px] font-black uppercase tracking-widest italic">Documento Oficial de Registro Escolar</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 2cm; size: A4; }
          strong { color: black !important; font-weight: 900 !important; }
        }
      `}} />
    </div>
  );
};
