import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string | null;
  photo_url?: string | null;
  qr_code_id?: string;
  is_authorized?: boolean;
}

interface Occurrence {
  id: string;
  student_id: string | null;
  student_name: string;
  enrollment_id: string | null;
  grade: string | null;
  has_card: boolean;
  reason: string;
  details: string | null;
  occurred_at: string;
  students?: { photo_url: string | null } | null;
}

const reasons = ['Tentativa de saída sem autorização', 'Carteira não apresentada', 'Carteira irregular ou danificada', 'Outro'];

export const OccurrencesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [hasCard, setHasCard] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualGrade, setManualGrade] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterCard, setFilterCard] = useState<'ALL' | 'WITH' | 'WITHOUT'>('ALL');
  const [reportSearch, setReportSearch] = useState('');
  const [filterReason, setFilterReason] = useState('ALL');
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScannerLoading, setQrScannerLoading] = useState(false);
  const [qrScannerError, setQrScannerError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    fetchOccurrences();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!isQrScannerOpen) return;

    const scanner = new Html5Qrcode('occurrence-qr-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    setQrScannerLoading(true);
    setQrScannerError('');

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
      decodedText => handleQrCode(decodedText),
      () => undefined,
    ).then(() => setQrScannerLoading(false)).catch(error => {
      console.error('Erro ao iniciar leitor de carteira:', error);
      setQrScannerLoading(false);
      setQrScannerError('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(error => console.error('Erro ao fechar leitor de carteira:', error));
      }
    };
  }, [isQrScannerOpen]);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('id, full_name, enrollment_id, grade, photo_url, qr_code_id, is_authorized').order('full_name');
    if (!error) setStudents(data || []);
  };

  const fetchOccurrences = async () => {
    setLoading(true);
    setLoadError('');
    if (startDate > endDate) {
      setOccurrences([]);
      setLoadError('A data inicial não pode ser posterior à data final.');
      setLoading(false);
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);
    const queryStart = new Date(start);
    const queryEnd = new Date(end);
    queryStart.setDate(queryStart.getDate() - 1);
    queryEnd.setDate(queryEnd.getDate() + 1);
    const { data, error } = await supabase
      .from('gate_occurrences')
      .select('*')
      .gte('occurred_at', queryStart.toISOString())
      .lte('occurred_at', queryEnd.toISOString())
      .order('occurred_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar ocorrências:', error);
      setLoadError(`Não foi possível carregar as ocorrências: ${error.message}`);
      setOccurrences([]);
      setLoading(false);
      return;
    }

    const occurrenceData = ((data || []) as Occurrence[]).filter(item => {
      const localDate = format(parseISO(item.occurred_at), 'yyyy-MM-dd');
      return localDate >= startDate && localDate <= endDate;
    });
    const studentIds = occurrenceData.map(item => item.student_id).filter((id): id is string => Boolean(id));
    if (studentIds.length > 0) {
      const { data: photoData, error: photoError } = await supabase
        .from('students')
        .select('id, photo_url')
        .in('id', studentIds);
      if (!photoError) {
        const photos = new Map((photoData || []).map(student => [student.id, student.photo_url]));
        occurrenceData.forEach(item => {
          item.students = item.student_id ? { photo_url: photos.get(item.student_id) || null } : null;
        });
      }
    }
    setOccurrences(occurrenceData);
    setLoading(false);
  };

  const studentResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || selectedStudent) return [];
    return students.filter(student =>
      student.full_name.toLowerCase().includes(query) || student.enrollment_id.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [search, students, selectedStudent]);

  const visibleOccurrences = useMemo(() => occurrences.filter(item => {
    if (filterCard === 'WITH' && !item.has_card) return false;
    if (filterCard === 'WITHOUT' && item.has_card) return false;
    if (filterReason !== 'ALL' && item.reason !== filterReason) return false;
    const query = reportSearch.trim().toLowerCase();
    if (query && !item.student_name.toLowerCase().includes(query) && !(item.enrollment_id || '').toLowerCase().includes(query)) return false;
    return true;
  }), [occurrences, filterCard, filterReason, reportSearch]);

  const chooseStudent = (student: Student, presented = false) => {
    setSelectedStudent(student);
    setSearch(student.full_name);
    setManualName('');
    setManualGrade('');
    setHasCard(presented);
  };

  const clearStudent = () => {
    setSelectedStudent(null);
    setSearch('');
    setHasCard(false);
  };

  const handleQrCode = async (decodedText: string) => {
    const qrId = decodedText.trim().split('/').filter(Boolean).pop();
    if (!qrId) return;

    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, enrollment_id, grade, photo_url, qr_code_id, is_authorized')
      .eq('qr_code_id', qrId)
      .maybeSingle();

    if (error || !data) {
      setQrScannerError('Carteirinha não encontrada no cadastro.');
      return;
    }

    chooseStudent(data, true);
    setQrScannerError('');
    setIsQrScannerOpen(false);
  };

  const saveOccurrence = async (event: React.FormEvent) => {
    event.preventDefault();
    const studentName = selectedStudent?.full_name || manualName.trim();
    if (!studentName) {
      setMessageType('error');
      setMessage('Informe o aluno ou selecione um cadastro.');
      return;
    }

    setSaving(true);
    setMessage('');
    setMessageType('success');
    const { error } = await supabase.from('gate_occurrences').insert({
      student_id: selectedStudent?.id || null,
      student_name: studentName,
      enrollment_id: selectedStudent?.enrollment_id || null,
      grade: selectedStudent?.grade || manualGrade.trim() || null,
      has_card: hasCard,
      reason,
      details: details.trim() || null,
      created_by: user?.id || null,
    });

    if (error) {
      console.error(error);
      const tableMissing = error.message.includes("Could not find the table 'public.gate_occurrences'") || error.code === '42P01';
      setMessageType('error');
      setMessage(tableMissing
        ? 'A tabela ainda não foi criada no Supabase. Execute supabase_occurrences_migration.sql no SQL Editor e recarregue a página.'
        : `Não foi possível salvar: ${error.message}`);
    } else {
      setMessage('Ocorrência registrada.');
      clearStudent();
      setManualName('');
      setManualGrade('');
      setHasCard(false);
      setReason(reasons[0]);
      setDetails('');
      await fetchOccurrences();
    }
    setSaving(false);
  };

  const deleteOccurrence = async (occurrence: Occurrence) => {
    if (!window.confirm(`Deseja apagar a ocorrência de ${occurrence.student_name}? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(occurrence.id);
    const { error } = await supabase
      .from('gate_occurrences')
      .delete()
      .eq('id', occurrence.id);

    if (error) {
      console.error(error);
      setMessageType('error');
      setMessage(`Não foi possível apagar: ${error.message}`);
    } else {
      setOccurrences(current => current.filter(item => item.id !== occurrence.id));
      setMessageType('success');
      setMessage('Ocorrência apagada.');
    }
    setDeletingId(null);
  };

  const canDelete = profile?.role === 'ADM' || profile?.role === 'DIRETOR';

  const withCardCount = visibleOccurrences.filter(item => item.has_card).length;
  const withoutCardCount = visibleOccurrences.length - withCardCount;

  return (
    <main className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Portaria e direção</p>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">Ocorrências</h1>
          <p className="text-on-surface-variant font-medium mt-1">Registre tentativas de saída e situações envolvendo a carteira estudantil.</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-base">print</span> Imprimir relatório
        </button>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.4fr)] gap-6 print:block">
        <form onSubmit={saveOccurrence} className="glass-card rounded-[2rem] p-6 border border-white/30 h-fit print:hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center"><span className="material-symbols-outlined">report</span></div>
            <div><h2 className="font-headline font-extrabold text-xl text-on-surface">Nova ocorrência</h2><p className="text-xs text-outline font-medium">Preenchimento da portaria</p></div>
          </div>

          <label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Aluno cadastrado</label>
          <div className="relative">
            <input value={search} onChange={event => { setSearch(event.target.value); setSelectedStudent(null); }} placeholder="Nome ou matrícula..." className="w-full px-4 py-3 pr-12 bg-white/70 border border-outline/20 rounded-xl font-bold outline-none focus:border-primary" />
            {selectedStudent && <button type="button" onClick={clearStudent} className="absolute right-3 top-3 text-outline hover:text-error"><span className="material-symbols-outlined text-lg">close</span></button>}
            {studentResults.length > 0 && <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-outline/10 rounded-xl shadow-xl z-20 overflow-hidden">{studentResults.map(student => <button type="button" key={student.id} onClick={() => chooseStudent(student)} className="w-full text-left px-4 py-3 hover:bg-primary/5 border-b border-outline/10 last:border-0"><span className="block font-bold text-sm text-on-surface">{student.full_name}</span><span className="text-xs text-outline">RM {student.enrollment_id} {student.grade ? `• ${student.grade}` : ''}</span></button>)}</div>}
          </div>
          <button type="button" onClick={() => setIsQrScannerOpen(open => !open)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-black text-primary hover:bg-primary/10">
            <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
            {isQrScannerOpen ? 'Fechar leitor' : 'Ler QR Code da carteirinha'}
          </button>
          {isQrScannerOpen && <div className="mt-3 overflow-hidden rounded-2xl border border-primary/20 bg-gray-950 p-3"><div id="occurrence-qr-reader" className="min-h-[220px] overflow-hidden rounded-xl" />{qrScannerLoading && <p className="mt-2 text-center text-xs font-bold text-white/70">Abrindo câmera...</p>}{qrScannerError && <p className="mt-2 text-center text-xs font-bold text-rose-300">{qrScannerError}</p>}</div>}
          {!selectedStudent && <div className="grid grid-cols-2 gap-3 mt-3"><input value={manualName} onChange={event => setManualName(event.target.value)} placeholder="Nome não cadastrado" className="px-3 py-2.5 bg-white/70 border border-outline/20 rounded-xl text-sm font-bold outline-none focus:border-primary" /><input value={manualGrade} onChange={event => setManualGrade(event.target.value)} placeholder="Turma (opcional)" className="px-3 py-2.5 bg-white/70 border border-outline/20 rounded-xl text-sm font-bold outline-none focus:border-primary" /></div>}
          {selectedStudent && <div className={`mt-3 rounded-xl border px-4 py-3 ${selectedStudent.is_authorized ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-on-surface">{selectedStudent.full_name}</p><p className="text-[11px] text-outline">RM {selectedStudent.enrollment_id} {selectedStudent.grade ? `• ${selectedStudent.grade}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${selectedStudent.is_authorized ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>{selectedStudent.is_authorized ? 'Carteira ativa' : 'Carteira bloqueada'}</span></div></div>}

          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Carteira apresentada?</label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setHasCard(true)} className={`py-3 rounded-xl font-black text-sm border ${hasCard ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white/60 text-outline border-outline/20'}`}>Sim</button><button type="button" onClick={() => setHasCard(false)} className={`py-3 rounded-xl font-black text-sm border ${!hasCard ? 'bg-rose-500 text-white border-rose-500' : 'bg-white/60 text-outline border-outline/20'}`}>Não</button></div></div>
          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Motivo</label><select value={reason} onChange={event => setReason(event.target.value)} className="w-full px-4 py-3 bg-white/70 border border-outline/20 rounded-xl font-bold outline-none focus:border-primary">{reasons.map(item => <option key={item}>{item}</option>)}</select></div>
          <div className="mt-5"><label className="block text-[10px] font-black uppercase tracking-widest text-outline mb-2">Observação</label><textarea value={details} onChange={event => setDetails(event.target.value)} rows={3} placeholder="Detalhes relevantes para a direção..." className="w-full px-4 py-3 bg-white/70 border border-outline/20 rounded-xl font-medium outline-none focus:border-primary resize-none" /></div>
          <button disabled={saving} className="w-full mt-5 py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-wide disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar ocorrência'}</button>
          {message && <p className={`mt-3 text-sm font-bold ${messageType === 'error' ? 'text-error' : 'text-emerald-600'}`}>{message}</p>}
        </form>

        <section className="glass-card rounded-[2rem] p-6 border border-white/30 h-fit print:rounded-none print:p-0 print:border-0 print:shadow-none">
          {loadError && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 print:hidden">{loadError}</div>}
          <div className="hidden print:flex items-center gap-5 border-b-2 border-gray-900 pb-5 mb-6">
            <img src="/ceti-logo.png" alt="Brasão do CETI" className="h-20 w-20 object-contain" />
            <div className="flex-1 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">Governo do Estado da Bahia</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700 mt-1">Secretaria da Educação</p>
              <h2 className="text-lg font-black uppercase leading-tight text-gray-950 mt-2">Colégio Estadual de Tempo Integral de Nova Itarana</h2>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-600 mt-2">Relatório de Ocorrências da Portaria</p>
            </div>
            <div className="w-20 text-right text-[9px] font-bold text-gray-600">
              <p>Emissão</p>
              <p>{format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5 print:mb-4"><div><h2 className="font-headline font-extrabold text-xl text-on-surface print:hidden">Relatório para a direção</h2><p className="text-xs text-outline font-medium print:text-gray-700">Período: {format(parseISO(startDate), 'dd/MM/yyyy')} a {format(parseISO(endDate), 'dd/MM/yyyy')} · {filterCard === 'ALL' ? 'Todas as situações' : filterCard === 'WITH' ? 'Somente com carteira' : 'Somente sem carteira'}{filterReason !== 'ALL' ? ` · ${filterReason}` : ''}</p></div><div className="flex flex-wrap gap-2 print:hidden"><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold" /><input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold" /><input value={reportSearch} onChange={event => setReportSearch(event.target.value)} placeholder="Buscar aluno ou RM" className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold min-w-44" /><select value={filterCard} onChange={event => setFilterCard(event.target.value as typeof filterCard)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold"><option value="ALL">Todas</option><option value="WITH">Com carteira</option><option value="WITHOUT">Sem carteira</option></select><select value={filterReason} onChange={event => setFilterReason(event.target.value)} className="px-3 py-2 bg-white/70 border border-outline/20 rounded-lg text-sm font-bold"><option value="ALL">Todos os motivos</option>{reasons.map(item => <option key={item} value={item}>{item}</option>)}</select></div></div>
          <div className="grid grid-cols-3 gap-3 mb-5"><div className="bg-primary/5 rounded-xl p-3"><p className="text-2xl font-black text-primary">{visibleOccurrences.length}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Total</p></div><div className="bg-emerald-500/10 rounded-xl p-3"><p className="text-2xl font-black text-emerald-600">{withCardCount}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Com carteira</p></div><div className="bg-rose-500/10 rounded-xl p-3"><p className="text-2xl font-black text-rose-600">{withoutCardCount}</p><p className="text-[10px] font-black uppercase tracking-widest text-outline">Sem carteira</p></div></div>
          <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-outline/10 print:border-gray-900"><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline print:text-gray-900">Foto</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline print:text-gray-900">Data/hora</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline print:text-gray-900">Aluno</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline print:text-gray-900">Carteira</th><th className="py-3 pr-3 text-[10px] font-black uppercase tracking-widest text-outline print:text-gray-900">Motivo</th>{canDelete && <th className="py-3 text-[10px] font-black uppercase tracking-widest text-outline text-right print:hidden">Ação</th>}</tr></thead><tbody>{loading ? <tr><td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-outline font-bold">Carregando...</td></tr> : visibleOccurrences.length === 0 ? <tr><td colSpan={canDelete ? 6 : 5} className="py-12 text-center text-outline font-bold">Nenhuma ocorrência no período.</td></tr> : visibleOccurrences.map(item => <tr key={item.id} className="border-b border-outline/10 print:border-gray-300"><td className="py-2 pr-3"><div className="h-10 w-10 overflow-hidden rounded-lg border border-outline/10 bg-gray-50 print:h-12 print:w-12">{(item.students?.photo_url) ? <img src={item.students.photo_url} alt="Foto do aluno" className="h-full w-full object-cover" /> : <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-lg text-outline/40">person</span>}</div></td><td className="py-3 pr-3 text-xs font-mono font-bold text-outline whitespace-nowrap print:text-gray-900">{format(parseISO(item.occurred_at), 'dd/MM/yyyy HH:mm')}</td><td className="py-3 pr-3"><p className="font-black text-sm text-on-surface uppercase print:text-gray-900">{item.student_name}</p><p className="text-[10px] text-outline print:text-gray-700">{item.enrollment_id ? `RM ${item.enrollment_id}` : 'Não cadastrado'} {item.grade ? `• ${item.grade}` : ''}</p></td><td className="py-3 pr-3"><span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase print:border print:border-gray-400 print:bg-white print:text-gray-900 ${item.has_card ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.has_card ? 'Sim' : 'Não'}</span></td><td className="py-3 pr-3 text-xs font-bold text-on-surface-variant print:text-gray-900">{item.reason}{item.details && <span className="block text-[10px] text-outline font-medium mt-1 print:text-gray-700">{item.details}</span>}</td>{canDelete && <td className="py-3 text-right print:hidden"><button type="button" onClick={() => deleteOccurrence(item)} disabled={deletingId === item.id} title="Apagar ocorrência" className="inline-flex w-9 h-9 items-center justify-center rounded-lg text-error hover:bg-error/10 disabled:opacity-50"><span className="material-symbols-outlined text-lg">{deletingId === item.id ? 'progress_activity' : 'delete'}</span></button></td>}</tr>)}</tbody></table></div>
          <div className="hidden print:block mt-16 pt-8 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-20">
              <div className="text-center"><div className="border-t border-gray-900 pt-2"><p className="text-[10px] font-black uppercase">Responsável pela Portaria</p><p className="text-[9px] text-gray-600">Assinatura</p></div></div>
              <div className="text-center"><div className="border-t border-gray-900 pt-2"><p className="text-[10px] font-black uppercase">Direção / Coordenação</p><p className="text-[9px] text-gray-600">Assinatura e carimbo</p></div></div>
            </div>
          </div>
        </section>
      </section>

      <style>{`@media print {
        @page { size: A4 portrait; margin: 15mm 14mm; }
        html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
        .print\\:hidden { display: none !important; }
        main { padding: 0 !important; min-height: 0 !important; }
        main > section { display: block !important; }
        main > section > form { display: none !important; }
        main > section > section { width: 100% !important; box-shadow: none !important; border: 0 !important; background: white !important; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }`}</style>
    </main>
  );
};
