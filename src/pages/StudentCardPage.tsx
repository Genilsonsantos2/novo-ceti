import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useParams, Link } from 'react-router-dom';
import { StudentBadge } from '../components/StudentBadge';
import { ExportActions } from '../components/ExportActions';
import { StudentPhotoUpload } from '../components/students/StudentPhotoUpload';

export const StudentCardPage: React.FC = () => {
  const { user } = useAuth();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [aiContext, setAiContext] = useState<any>(null);
  const [aiQuestion, setAiQuestion] = useState('Qual é o risco deste aluno no momento?');
  const [aiAnswer, setAiAnswer] = useState('');

  const getAiAnswer = (question: string, context: any) => {
    if (!context) return 'Ainda não há contexto suficiente para gerar a resposta.';

    const normalized = question.toLowerCase();

    if (normalized.includes('risco') || normalized.includes('alerta')) {
      return `O risco atual do aluno é ${context.riskLevel.toLowerCase()} com ${context.recentAbsences} registros recentes. ${context.recommendation}`;
    }

    if (normalized.includes('falt') || normalized.includes('ausencia')) {
      return `Nos últimos 30 dias, há ${context.recentAbsences} registros de ausência ou abono. O histórico sugere ${context.riskLevel.toLowerCase()} acompanhamento e atenção à rotina escolar.`;
    }

    if (normalized.includes('termo') || normalized.includes('devolutiva')) {
      return `${context.termStatus}. ${context.termMessage}`;
    }

    if (normalized.includes('autoriz') || normalized.includes('document')) {
      return `${context.authorizationStatus}. ${context.documentMessage}`;
    }

    return `Resumo do aluno: ${context.summary}`;
  };

  const loadAiContext = async (id?: string) => {
    const actualId = id || studentId;
    if (!actualId) return;

    try {
      const { data: absenceData, error: absenceError } = await supabase
        .from('student_absences')
        .select('id, type, date, reason, sigeduc_synced')
        .eq('student_id', actualId)
        .order('date', { ascending: false })
        .limit(20);

      if (absenceError) {
        console.error('Erro ao buscar contexto de IA:', absenceError);
      }

      const absences = absenceData || [];
      const last30Days = absences.filter((item: any) => {
        const itemDate = new Date(item.date);
        const now = new Date();
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      });

      const hasReturnedTerm = !!(student?.term_attachments && student.term_attachments.length > 0) || !!student?.term_returned_physical;
      const hasActiveAuthorization = Array.isArray(student?.student_authorizations) && student.student_authorizations.length > 0;
      const recentAbsences = last30Days.length;
      const riskLevel = recentAbsences >= 3 ? 'Alto' : recentAbsences >= 1 ? 'Médio' : 'Baixo';
      const termStatus = hasReturnedTerm ? 'Termo devolvido e validado' : 'Termo pendente de devolução';
      const authorizationStatus = hasActiveAuthorization ? 'Há autorização ativa registrada' : 'Sem autorização ativa no momento';

      const summary = `${student?.full_name || 'Aluno'} está em ${riskLevel.toLowerCase()} risco, com ${recentAbsences} registros recentes e status de termo: ${termStatus.toLowerCase()}.`;
      const recommendation = riskLevel === 'Alto'
        ? 'Recomenda-se revisão do acompanhamento e comunicação com a família.'
        : riskLevel === 'Médio'
          ? 'Sugere-se monitoramento mais frequente nos próximos 15 dias.'
          : 'O aluno está em acompanhamento estável, com atenção preventiva.';

      const generatedContext = {
        recentAbsences,
        riskLevel,
        recommendation,
        summary,
        termStatus,
        termMessage: hasReturnedTerm
          ? 'O documento foi devolvido e está disponível para conferência.'
          : 'Ainda não houve devolução do termo de autorização para fechamento do processo.',
        authorizationStatus,
        documentMessage: hasActiveAuthorization
          ? 'Há registro de autorização no sistema, o que reduz a necessidade de intervenção manual.'
          : 'Revisar documentação e pendências para evitar bloqueios de acesso.'
      };

      setAiContext(generatedContext);
      setAiAnswer(getAiAnswer(aiQuestion || 'Qual é o risco deste aluno no momento?', generatedContext));
    } catch (error) {
      console.error('Erro ao montar contexto de IA:', error);
    }
  };

  useEffect(() => {
    if (user) fetchStudentData();
  }, [user, studentId]);

  const fetchStudentData = async () => {
    let query = supabase.from('students').select('*, student_authorizations(*), term_attachments(id)');
    if (studentId) query = query.eq('id', studentId);
    else query = query.limit(1);

    const { data, error } = await query.single();
    if (error) console.error(error);
    else {
      setStudent(data);
      await loadAiContext(data?.id || studentId);
    }
    setLoading(false);
  };

  const handleUploadSuccess = (newUrl: string) => {
    setStudent({ ...student, photo_url: newUrl });
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-outline animate-spin block mb-3">progress_activity</span>
        <p className="text-outline font-medium">Carregando carteirinha...</p>
      </div>
    </div>
  );

  if (!student) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="glass-card rounded-3xl p-10 text-center max-w-sm">
        <span className="material-symbols-outlined text-5xl text-error/30 block mb-3">person_off</span>
        <p className="text-error font-bold">Estudante não encontrado.</p>
        <Link to="/students" className="mt-4 inline-block text-primary font-bold">Voltar para lista</Link>
      </div>
    </div>
  );

  const hasReturnedTerm = (student.term_attachments && student.term_attachments.length > 0) || student.term_returned_physical;

  if (!hasReturnedTerm) return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh] p-6">
      <div className="glass-card rounded-[2.5rem] p-10 text-center max-w-md border-amber-200 bg-amber-50/50 shadow-xl">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
          <span className="material-symbols-outlined text-4xl">history_edu</span>
        </div>
        <h2 className="text-2xl font-headline font-extrabold text-amber-900 mb-2">Termo Pendente</h2>
        <p className="text-amber-800 font-medium leading-relaxed">
          A carteirinha digital só estará disponível após a <strong>devolutiva do termo de autorização</strong> assinado.
        </p>
        <Link to="/students" className="mt-8 inline-block px-6 py-2 bg-amber-200 text-amber-900 rounded-xl font-bold hover:bg-amber-300 transition-all">
          Voltar
        </Link>
      </div>
    </div>
  );

  return (
    <main className="max-w-3xl mx-auto p-6 pb-32">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Identidade do Aluno</p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface notranslate" translate="no">Cartão de {student.full_name}</h1>
          <p className="text-on-surface-variant font-medium mt-1">Versão para impressão física - Padrão PVC (86×54mm)</p>
        </div>
        <Link to="/students" className="p-3 glass-card rounded-2xl hover:bg-gray-100 transition-all">
          <span className="material-symbols-outlined">close</span>
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <StudentPhotoUpload student={student} onUploadSuccess={handleUploadSuccess} />
        <button
          onClick={() => setShowPhoto(!showPhoto)}
          className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
            showPhoto ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className="material-symbols-outlined">{showPhoto ? 'visibility' : 'visibility_off'}</span>
          {showPhoto ? 'Ocultar Foto' : 'Mostrar Foto'}
        </button>
      </div>

      <div className="bg-gradient-to-br from-surface-container to-surface/50 rounded-[3rem] p-12 mb-10 border border-white/20 shadow-inner">
        <div className="flex justify-center" id="student-card-export">
          <StudentBadge student={student} showPhoto={showPhoto} />
        </div>
      </div>

      <section className="glass-card rounded-[2rem] p-6 mb-8 border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-2">Assistente IA (protótipo)</p>
            <h3 className="text-xl font-headline font-extrabold text-slate-800">Resumo inteligente do aluno</h3>
          </div>
          <button
            onClick={() => setAiAnswer(getAiAnswer(aiQuestion, aiContext))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Atualizar resumo
          </button>
        </div>

        {aiContext ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Nível de risco</p>
                <p className="text-2xl font-black text-slate-800">{aiContext.riskLevel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Registros recentes</p>
                <p className="text-2xl font-black text-slate-800">{aiContext.recentAbsences}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Status do termo</p>
                <p className="text-sm font-bold text-slate-800">{aiContext.termStatus}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 mb-5">
              <p className="text-xs uppercase tracking-wide text-indigo-700 mb-2">Resumo gerado</p>
              <p className="text-sm text-slate-700 leading-relaxed">{aiContext.summary}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Sugestão de texto</p>
              <p className="text-sm leading-relaxed text-slate-700">
                {aiContext.recommendation} {hasReturnedTerm
                  ? 'O termo foi encaminhado corretamente e o processo está alinhado.'
                  : 'Ainda há pendência documental que deve ser resolvida para concluir o acompanhamento.'}
              </p>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Carregando contexto do aluno para gerar a análise...
          </div>
        )}

        <div className="mt-6">
          <label className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Pergunta ao assistente</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-400"
              placeholder="Ex.: Qual é o risco deste aluno?"
            />
            <button
              onClick={() => setAiAnswer(getAiAnswer(aiQuestion, aiContext))}
              className="rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-all"
            >
              Perguntar
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Resposta do assistente</p>
          <p className="text-sm leading-relaxed text-slate-700">{aiAnswer || 'Aguardando pergunta...'}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold text-sm text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">download</span>
            Exportar Documento
          </h3>
          <ExportActions 
            elementId="student-card-export" 
            filename={`Cartao_${student.full_name.replace(/\s+/g, '_')}`}
          />
        </div>

        <div className="glass-card rounded-3xl p-6 bg-primary/5 border-primary/10">
          <h3 className="font-bold text-sm text-primary mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined">info</span>
            Orientações
          </h3>
          <ul className="text-xs text-on-surface-variant leading-relaxed space-y-2 font-medium">
            <li>• <strong>PVC Padrão:</strong> 86 × 54 mm</li>
            <li>• <strong>Papel:</strong> Couchê 300g (mínimo)</li>
            <li>• <strong>Impressão:</strong> Alta Qualidade (100% escala)</li>
          </ul>
        </div>
      </div>
    </main>
  );
};
