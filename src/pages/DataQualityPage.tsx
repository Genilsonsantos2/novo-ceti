import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface StudentRecord {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
  cpf: string | null;
  birth_date: string | null;
  guardian_name: string | null;
  guardian_cpf: string | null;
}

interface QualityIssue {
  id: string;
  title: string;
  description: string;
  students: StudentRecord[];
  type: 'DUPLICIDADE' | 'INCOMPLETO';
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const digits = (value: string) => value.replace(/\D/g, '');

export const DataQualityPage: React.FC = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'TODAS' | QualityIssue['type']>('TODAS');

  useEffect(() => {
    const loadStudents = async () => {
      const { data, error: queryError } = await supabase.from('students').select('id, full_name, enrollment_id, grade, cpf, birth_date, guardian_name, guardian_cpf').order('full_name');
      if (queryError) setError(`Não foi possível analisar os cadastros: ${queryError.message}`);
      else setStudents((data || []) as StudentRecord[]);
      setLoading(false);
    };
    loadStudents();
  }, []);

  const issues = useMemo(() => {
    const next: QualityIssue[] = [];
    const addDuplicates = (field: 'full_name' | 'cpf', label: string) => {
      const groups = new Map<string, StudentRecord[]>();
      students.forEach(student => {
        const value = field === 'full_name' ? normalize(student.full_name) : digits(student.cpf || '');
        if (!value || (field === 'cpf' && value.length !== 11)) return;
        groups.set(value, [...(groups.get(value) || []), student]);
      });
      groups.forEach((group, value) => {
        if (group.length < 2) return;
        next.push({
          id: `duplicate-${field}-${value}`,
          type: 'DUPLICIDADE',
          title: `Possível duplicidade de ${label}`,
          description: field === 'full_name' ? `${group.length} cadastros com o mesmo nome normalizado.` : `${group.length} cadastros compartilham o mesmo CPF.`,
          students: group,
        });
      });
    };

    addDuplicates('full_name', 'nome');
    addDuplicates('cpf', 'CPF');
    students.forEach(student => {
      const missing: string[] = [];
      if (!student.grade?.trim()) missing.push('turma');
      if (!student.birth_date) missing.push('data de nascimento');
      if (!student.guardian_name?.trim()) missing.push('responsável');
      if (!student.cpf?.trim()) missing.push('CPF do aluno');
      if (missing.length) next.push({
        id: `incomplete-${student.id}`,
        type: 'INCOMPLETO',
        title: 'Dados cadastrais pendentes',
        description: `Faltam: ${missing.join(', ')}.`,
        students: [student],
      });
    });
    return next;
  }, [students]);

  const visibleIssues = filter === 'TODAS' ? issues : issues.filter(issue => issue.type === filter);
  const duplicateCount = issues.filter(issue => issue.type === 'DUPLICIDADE').length;
  const incompleteCount = issues.filter(issue => issue.type === 'INCOMPLETO').length;

  return (
    <main className="min-h-screen px-4 py-6 md:px-10 md:py-8">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Secretaria • Confiabilidade cadastral</p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">Revisão de cadastros</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Possíveis problemas para conferência manual. Nenhum cadastro é alterado ou removido automaticamente.</p>
      </header>

      {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</div>}
      <section className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[{ label: 'Alunos analisados', value: students.length }, { label: 'Grupos possivelmente duplicados', value: duplicateCount }, { label: 'Cadastros incompletos', value: incompleteCount }].map(metric => <div key={metric.label} className="rounded-xl border border-gray-200 bg-white p-4"><p className="text-2xl font-black text-gray-900">{loading ? '—' : metric.value}</p><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{metric.label}</p></div>)}
      </section>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar inconsistências">
        {[{ value: 'TODAS' as const, label: 'Todas' }, { value: 'DUPLICIDADE' as const, label: 'Possíveis duplicidades' }, { value: 'INCOMPLETO' as const, label: 'Dados pendentes' }].map(option => <button type="button" key={option.value} onClick={() => setFilter(option.value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === option.value ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-700'}`}>{option.label}</button>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? <p className="p-10 text-center text-sm text-gray-500">Analisando cadastros...</p> : visibleIssues.length === 0 ? <p className="p-10 text-center text-sm text-gray-500">Nenhum item nesta categoria.</p> : <ul className="divide-y divide-gray-100">{visibleIssues.map(issue => <li key={issue.id} className="p-4 md:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${issue.type === 'DUPLICIDADE' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>{issue.type === 'DUPLICIDADE' ? 'Conferir possível duplicidade' : 'Revisar dados'}</span><h2 className="mt-2 font-bold text-gray-900">{issue.title}</h2><p className="mt-1 text-sm text-gray-600">{issue.description}</p><div className="mt-3 flex flex-wrap gap-2">{issue.students.map(student => <span key={student.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs"><strong>{student.full_name}</strong><span className="ml-2 text-gray-500">RM {student.enrollment_id} · {student.grade || 'Sem turma'}</span></span>)}</div></div><Link to="/students" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/20 px-3 py-2 text-xs font-bold text-primary"><span className="material-symbols-outlined text-base">edit</span>Revisar aluno</Link></div></li>)}</ul>}
      </section>
    </main>
  );
};
