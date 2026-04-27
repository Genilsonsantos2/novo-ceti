import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useSearchParams } from 'react-router-dom';

import { ExportActions } from '../components/ExportActions';

export const PrintTermsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialGrade = searchParams.get('grade') || '';
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>(initialGrade);
  const [termType, setTermType] = useState<'lunch' | 'gym'>('lunch');

  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('full_name');

    if (error) console.error(error);
    else setStudents(data || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-outline animate-spin block mb-3">progress_activity</span>
        <p className="text-outline font-medium">Carregando lote de termos...</p>
      </div>
    </div>
  );

  const uniqueGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort();
  const filteredStudents = selectedGrade ? students.filter(s => s.grade === selectedGrade) : [];

  return (
    <div className="min-h-screen bg-surface">
      {/* Print Controls - Hidden during actual printing */}
      <div className="print:hidden p-6 glass-panel border-b border-white/20 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 z-50 shadow-xl rounded-b-[2rem] mx-2 bg-white/80 backdrop-blur-md">
        <div className="flex-1">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Lote</p>
          <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight">Impressão de Termos em Lote</h1>
          <p className="text-sm font-medium text-on-surface-variant flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-sm">settings</span>
            A4 • Margens: Nenhuma • Escala: 100% • Gráficos de plano de fundo: Ativado
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
          {/* Display Options & Filters */}
          <div className="flex flex-wrap gap-2 glass-card rounded-2xl p-3 items-center border border-gray-200 bg-white/50">
            <div className="flex items-center gap-2 px-2 bg-gray-100 rounded-xl border border-gray-200">
              <span className="material-symbols-outlined text-gray-500 text-sm">filter_list</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0 py-2 w-full md:w-auto outline-none cursor-pointer"
              >
                <option value="" disabled>Selecione uma Turma</option>
                {uniqueGrades.map(grade => (
                  <option key={grade as string} value={grade as string}>{grade}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-2 bg-gray-100 rounded-xl border border-gray-200">
              <span className="material-symbols-outlined text-gray-500 text-sm">assignment</span>
              <select
                value={termType}
                onChange={(e) => setTermType(e.target.value as 'lunch' | 'gym')}
                className="bg-transparent border-none text-sm font-bold text-gray-600 focus:ring-0 py-2 w-full md:w-auto outline-none cursor-pointer"
              >
                <option value="lunch">Saída para Almoço</option>
                <option value="gym">Academia / Transporte</option>
              </select>
            </div>
            
            <ExportActions 
              elementId="print-terms-container" 
              filename={`Lote_Termos_${termType === 'gym' ? 'Academia' : 'Almoco'}_${selectedGrade ? selectedGrade.replace(/[^a-zA-Z0-9]/g, '_') : 'Todas_Turmas'}_${filteredStudents.length}_alunos`}
              className="flex-1 md:flex-initial"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 md:flex-none">
            <Link to="/students" className="px-6 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">arrow_back</span>
              Voltar
            </Link>
          </div>
        </div>
      </div>

      {/* Container that will be printed */}
      <div id="print-terms-container" className="print:m-0 print:p-0 bg-gray-100/50 min-h-screen pb-12 print:bg-white print:pb-0">
        {!selectedGrade ? (
           <div className="p-12 text-center text-gray-500 print:hidden pt-32">
             <span className="material-symbols-outlined text-6xl mb-4 opacity-50">school</span>
             <h2 className="text-xl font-bold">Selecione uma turma para carregar os termos</h2>
             <p className="mt-2 text-sm">A impressão em lote só está disponível por turma individualmente.</p>
           </div>
        ) : filteredStudents.length === 0 ? (
           <div className="p-12 text-center text-gray-500 print:hidden pt-32">
             Nenhum aluno encontrado para esta turma.
           </div>
        ) : (
          filteredStudents.map((student) => (
            <div key={student.id} className="print:break-after-page print:m-0 print:shadow-none w-full max-w-[210mm] mx-auto bg-white shadow-xl relative mt-8 print:mt-0 page-container" style={{ minHeight: '297mm' }}>
              <div className="p-12 md:p-20 flex flex-col min-h-[297mm] relative overflow-hidden print:p-0">
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
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">
                      {termType === 'lunch' ? 'Controle de Saída - Almoço Externo' : 'Controle de Saída - Academia e Transporte'}
                    </p>
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
                      {termType === 'lunch' ? (
                        <p>
                          <strong>1. AUTORIZAR</strong> a saída do(a) discente no horário de almoço (12h às 13h);
                        </p>
                      ) : (
                        <p>
                          <strong>1. AUTORIZAR</strong> a saída do(a) discente no horário de <strong>14h40 às 16h10</strong> para atividades na academia e acesso ao transporte rural;
                        </p>
                      )}
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-black">Sistema CETI v2.7</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Documento gerado eletronicamente em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest italic text-primary mt-2">Validez supeditada à conferência da identidade escolar</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="p-2 border-2 border-gray-100 rounded-xl">
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
          ))
        )}
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
            background: white !important;
          }
          .print\\:hidden { display: none !important; }
          #print-terms-container {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .page-container {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 20mm 20mm 15mm 20mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            background: white !important;
            border: none !important;
          }
          .page-container:last-child {
            page-break-after: auto !important;
          }
          /* Font consistency */
          .font-sans { font-size: 11.5pt !important; line-height: 1.4 !important; }
          h1 { font-size: 13pt !important; font-weight: 900 !important; }
          h2 { font-size: 12pt !important; font-weight: 900 !important; }
        }
      `}} />
    </div>
  );
};
