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
        <button onClick={() => navigate('/students')} className="text-primary font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">arrow_back</span>
          Voltar
        </button>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined">print</span>
          Imprimir Termo
        </button>
      </div>

      {/* Document Sheet */}
      <div className="max-w-4xl mx-auto bg-white print:shadow-none shadow-2xl border border-gray-200 print:border-none p-16 md:p-20 relative overflow-hidden">
        {/* Background Emblem */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none w-[500px]">
           <img src="/ceti-logo.png" alt="" className="w-full h-full grayscale" />
        </div>

        {/* Header */}
        <div className="text-center mb-16 relative z-10">
          <img src="/ceti-logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-[0.15em] leading-tight">
            ESTADO DA BAHIA<br />
            SECRETARIA DA EDUCAÇÃO DO ESTADO DA BAHIA<br />
            COLÉGIO ESTADUAL DE TEMPO INTEGRAL DE NOVA ITARANA - CETI
          </h1>
          <div className="w-32 h-1 bg-primary mx-auto mt-6"></div>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest decoration-primary decoration-4 underline-offset-8 underline">
            TERMO DE AUTORIZAÇÃO E RESPONSABILIDADE
          </h2>
          <p className="text-gray-400 font-bold text-xs mt-4 uppercase tracking-[0.3em]">(SAÍDA PARA ALMOÇO EXTERNO)</p>
        </div>

        {/* Body */}
        <div className="space-y-8 text-gray-800 text-justify leading-relaxed font-serif text-lg">
          <p>
            Eu, <strong>{student.guardian_name || "__________________________________________________"}</strong>, 
            inscrito(a) no CPF sob o nº <strong>{student.guardian_cpf || "____________________"}</strong>, 
            na qualidade de responsável legal pelo(a) aluno(a) <strong>{student.full_name}</strong>, 
            matriculado(a) sob o RM nº <strong>{student.enrollment_id}</strong>, cursando o <strong>{student.grade}</strong>, 
            com data de nascimento em {student.birth_date ? format(new Date(student.birth_date), "dd/MM/yyyy") : "___/___/______"}, 
            inscrito(a) no CPF nº <strong>{student.cpf || "____________________"}</strong>, 
            venho por meio deste documento:
          </p>

          <ol className="list-decimal pl-8 space-y-6">
            <li>
              <strong>AUTORIZAR</strong> expressamente o(a) referido(a) discente a ausentar-se das dependências deste estabelecimento de ensino 
              durante o período de intervalo para o almoço (compreendido entre 12h00 e 13h00), para realizar sua refeição em domicílio.
            </li>
            <li>
              <strong>DECLARAR</strong> ciência de que, ao portar a <strong>Carteira de Identidade Estudantil CETI</strong>, o(a) aluno(a) terá 
              acesso liberado pelos portões mediante identificação eletrônica ou conferência manual, assumindo total responsabilidade 
              por sua integridade física e conduta fora do ambiente escolar durante este intervalo.
            </li>
            <li>
              <strong>COMPROMETER-SE</strong> com o cumprimento rigoroso do horário de retorno para as atividades escolares do turno vespertino, 
              sob pena de aplicação das normas disciplinares vigentes no Regimento Interno do Colégio.
            </li>
            <li>
              <strong>ACEITAR</strong> os termos de uso do sistema de acesso inteligente e a emissão da carteirinha exclusiva para controle de fluxo.
            </li>
          </ol>

          <p className="pt-8">
            Por ser expressão da verdade e estar de pleno acordo com as condições estabelecidas, firmo o presente termo.
          </p>
        </div>

        {/* Date and Signature */}
        <div className="mt-20 space-y-20 relative z-10">
          <p className="text-right font-medium text-gray-700">
            Nova Itarana - BA, {today}.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-10">
            <div className="text-center">
              <div className="border-t-2 border-gray-900 pt-3">
                <p className="font-black text-gray-900 uppercase text-sm">{student.guardian_name || "Assinatura do Responsável"}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Responsável Legal</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-gray-900 pt-3">
                <p className="font-black text-gray-900 uppercase text-sm">Direção / CETI</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Carimbo e Assinatura</p>
              </div>
            </div>
          </div>
        </div>

        {/* Legal Footer */}
        <div className="mt-24 pt-8 border-t border-gray-100 text-[10px] text-gray-400 font-medium text-center italic">
          Documento gerado eletronicamente pelo Sistema de Gestão de Acesso CETI - Colégio Estadual de Tempo Integral de Nova Itarana.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}} />
    </div>
  );
};
