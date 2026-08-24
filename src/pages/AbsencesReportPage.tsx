import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AbsenceRecord {
  id: string;
  student_id: string;
  type: 'FALTA_JUSTIFICADA' | 'ABONO';
  date: string;
  reason: string | null;
  sigeduc_synced: boolean;
  created_at: string;
  created_by: string | null;
  students: {
    full_name: string;
    enrollment_id: string;
    grade: string;
    photo_url: string;
  } | null;
}

interface StudentResult {
  id: string;
  full_name: string;
  enrollment_id: string;
  grade: string;
  photo_url: string;
}

interface DraftRecord {
  type: 'FALTA_JUSTIFICADA' | 'ABONO';
  reason: string;
  authorizedBy: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const AbsencesReportPage: React.FC = () => {
  // ── Tab State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'historico' | 'planilha'>('historico');

  // ── Data States ─────────────────────────────────────────────────────────────
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentResult[]>([]);

  // ── Period Filter ───────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return format(d, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState<'ALL' | 'FALTA_JUSTIFICADA' | 'ABONO'>('ALL');
  const [filterSigeduc, setFilterSigeduc] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // ── Planilha State ──────────────────────────────────────────────────────────
  const [planilhaDate, setPlanilhaDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planilhaGrade, setPlanilhaGrade] = useState('');
  const [planilhaSearch, setPlanilhaSearch] = useState('');
  const [draftRecords, setDraftRecords] = useState<Record<string, DraftRecord>>({});
  const [isSavingPlanilha, setIsSavingPlanilha] = useState(false);

  // ── Registration Form ───────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [recordType, setRecordType] = useState<'FALTA_JUSTIFICADA' | 'ABONO'>('FALTA_JUSTIFICADA');
  const [recordDate, setRecordDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recordReason, setRecordReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Quick Register Student ──────────────────────────────────────────────────
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRM, setNewStudentRM] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);

  // ── Edit Modal ──────────────────────────────────────────────────────────────
  const [editingRecord, setEditingRecord] = useState<AbsenceRecord | null>(null);
  const [editType, setEditType] = useState<'FALTA_JUSTIFICADA' | 'ABONO'>('FALTA_JUSTIFICADA');
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ── Batch Actions ───────────────────────────────────────────────────────────
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAbsences();

    const subscription = supabase
      .channel('public:student_absences_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_absences' }, () => {
        fetchAbsences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchStudents();
    } else if (searchTerm.length === 0) {
      setStudents([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchAllStudents();
  }, []);

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchAllStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, enrollment_id, grade, photo_url')
      .order('full_name');
    if (!error && data) {
      setAllStudents(data as StudentResult[]);
    }
  };

  const fetchAbsences = async () => {
    setLoadingAbsences(true);
    const { data, error } = await supabase
      .from('student_absences')
      .select('*, students(full_name, enrollment_id, grade, photo_url)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar faltas:', error);
    } else {
      setAbsences((data as AbsenceRecord[]) || []);
    }
    setLoadingAbsences(false);
  };

  const searchStudents = async () => {
    setLoadingSearch(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, enrollment_id, grade, photo_url')
      .or(`full_name.ilike.%${searchTerm}%,enrollment_id.ilike.%${searchTerm}%`)
      .order('full_name')
      .limit(8);

    if (error) {
      console.error('Erro ao pesquisar alunos:', error);
    } else {
      setStudents((data as StudentResult[]) || []);
    }
    setLoadingSearch(false);
  };

  // ── Filtered Data (Historico) ────────────────────────────────────────────────
  const filteredAbsences = useMemo(() => {
    return absences.filter(a => {
      if (filterType !== 'ALL' && a.type !== filterType) return false;
      if (filterSigeduc === 'PENDING' && a.sigeduc_synced) return false;
      if (filterSigeduc === 'SYNCED' && !a.sigeduc_synced) return false;
      if (filterGrade && a.students?.grade !== filterGrade) return false;
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        const name = a.students?.full_name?.toLowerCase() || '';
        const rm = a.students?.enrollment_id?.toLowerCase() || '';
        if (!name.includes(term) && !rm.includes(term)) return false;
      }
      return true;
    });
  }, [absences, filterType, filterSigeduc, filterGrade, filterSearch]);

  const historicoGrades = useMemo(() => {
    const set = new Set(absences.map(a => a.students?.grade).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [absences]);

  const pendentesCount = filteredAbsences.filter(a => !a.sigeduc_synced).length;
  const faltasCount = filteredAbsences.filter(a => a.type === 'FALTA_JUSTIFICADA').length;
  const abonosCount = filteredAbsences.filter(a => a.type === 'ABONO').length;

  // ── Filtered Data (Planilha) ─────────────────────────────────────────────────
  const allGrades = useMemo(() => {
    const set = new Set(allStudents.map(s => s.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [allStudents]);

  const planilhaStudents = useMemo(() => {
    if (!planilhaGrade) return [];
    let studentsInGrade = allStudents.filter(s => s.grade === planilhaGrade);
    if (planilhaSearch) {
      const term = planilhaSearch.toLowerCase();
      studentsInGrade = studentsInGrade.filter(s => 
        s.full_name.toLowerCase().includes(term) || 
        s.enrollment_id.toLowerCase().includes(term)
      );
    }
    return studentsInGrade;
  }, [allStudents, planilhaGrade, planilhaSearch]);

  // Set default grade if none is selected
  useEffect(() => {
    if (allGrades.length > 0 && !planilhaGrade) {
      setPlanilhaGrade(allGrades[0]);
    }
  }, [allGrades, planilhaGrade]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('student_absences')
      .insert([{
        student_id: selectedStudent.id,
        type: recordType,
        date: recordDate,
        reason: recordReason || null,
        created_by: userData.user?.id
      }]);

    if (error) {
      alert('Erro ao registrar: ' + error.message);
    } else {
      setSelectedStudent(null);
      setSearchTerm('');
      setRecordReason('');
      setRecordDate(format(new Date(), 'yyyy-MM-dd'));
      setRecordType('FALTA_JUSTIFICADA');
    }
    setIsSubmitting(false);
  };

  const handleToggleSigeduc = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('student_absences')
      .update({ sigeduc_synced: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const handleBatchSync = async () => {
    const pendingIds = filteredAbsences.filter(a => !a.sigeduc_synced).map(a => a.id);
    if (pendingIds.length === 0) return;
    if (!window.confirm(`Marcar ${pendingIds.length} registro(s) como baixados no Sigeduc?`)) return;

    setIsBatchSyncing(true);
    const { error } = await supabase
      .from('student_absences')
      .update({ sigeduc_synced: true })
      .in('id', pendingIds);

    if (error) {
      alert('Erro: ' + error.message);
    }
    setIsBatchSyncing(false);
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (!window.confirm(`Excluir registro de "${studentName}"? Esta ação não pode ser desfeita.`)) return;

    const { error } = await supabase
      .from('student_absences')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const openEditModal = (record: AbsenceRecord) => {
    setEditingRecord(record);
    setEditType(record.type);
    setEditDate(record.date);
    setEditReason(record.reason || '');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSavingEdit(true);

    const { error } = await supabase
      .from('student_absences')
      .update({
        type: editType,
        date: editDate,
        reason: editReason || null,
      })
      .eq('id', editingRecord.id);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setEditingRecord(null);
    }
    setIsSavingEdit(false);
  };

  const handleQuickRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName || !newStudentRM) return;
    setIsCreatingStudent(true);

    const qrCodeId = `QR-${newStudentRM}-${Date.now().toString().slice(-4)}`;
    const photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newStudentName)}&backgroundColor=random`;

    const { data, error } = await supabase
      .from('students')
      .insert([{
        full_name: newStudentName,
        enrollment_id: newStudentRM,
        grade: newStudentGrade || null,
        qr_code_id: qrCodeId,
        is_authorized: true,
        photo_url: photoUrl,
      }])
      .select('id, full_name, enrollment_id, grade, photo_url')
      .single();

    if (error) {
      alert('Erro ao cadastrar: ' + error.message);
    } else if (data) {
      setSelectedStudent(data as StudentResult);
      setShowQuickRegister(false);
      setNewStudentName('');
      setNewStudentRM('');
      setNewStudentGrade('');
      
      // Update local cache
      setAllStudents(prev => [...prev, data as StudentResult].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    }
    setIsCreatingStudent(false);
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Aluno', 'Matrícula', 'Turma', 'Tipo', 'Motivo', 'Status Sigeduc'];
    const rows = filteredAbsences.map(a => [
      `"${format(parseISO(a.date), 'dd/MM/yyyy')}"`,
      `"${a.students?.full_name || ''}"`,
      `"${a.students?.enrollment_id || ''}"`,
      `"${a.students?.grade || ''}"`,
      `"${a.type === 'FALTA_JUSTIFICADA' ? 'Falta Justificada' : 'Abono'}"`,
      `"${a.reason || ''}"`,
      `"${a.sigeduc_synced ? 'Baixado' : 'Pendente'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Faltas_Abonos_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickFilter = (type: 'pendentes' | 'faltas' | 'abonos') => {
    if (activeTab !== 'historico') setActiveTab('historico');
    if (type === 'pendentes') {
      setFilterSigeduc(filterSigeduc === 'PENDING' ? 'ALL' : 'PENDING');
      setFilterType('ALL');
    } else if (type === 'faltas') {
      setFilterType(filterType === 'FALTA_JUSTIFICADA' ? 'ALL' : 'FALTA_JUSTIFICADA');
      setFilterSigeduc('ALL');
    } else {
      setFilterType(filterType === 'ABONO' ? 'ALL' : 'ABONO');
      setFilterSigeduc('ALL');
    }
  };

  // ── Planilha Actions ────────────────────────────────────────────────────────
  const getDraft = (id: string): DraftRecord | undefined => draftRecords[id];

  const handleDraftTypeToggle = (studentId: string, type: 'FALTA_JUSTIFICADA' | 'ABONO') => {
    setDraftRecords(prev => {
      const current = prev[studentId];
      if (current && current.type === type) {
        // Toggle off: remove from drafts
        const newDrafts = { ...prev };
        delete newDrafts[studentId];
        return newDrafts;
      }
      // Toggle on
      return {
        ...prev,
        [studentId]: { 
          type, 
          reason: current?.reason || '', 
          authorizedBy: current?.authorizedBy || '' 
        }
      };
    });
  };

  const handleDraftReasonChange = (studentId: string, reason: string) => {
    setDraftRecords(prev => {
      if (!prev[studentId]) return prev;
      return {
        ...prev,
        [studentId]: { ...prev[studentId], reason }
      };
    });
  };

  const handleDraftAuthorizedByChange = (studentId: string, authorizedBy: string) => {
    setDraftRecords(prev => {
      if (!prev[studentId]) return prev;
      return {
        ...prev,
        [studentId]: { ...prev[studentId], authorizedBy }
      };
    });
  };

  const handleBatchSavePlanilha = async () => {
    const keys = Object.keys(draftRecords);
    if (keys.length === 0) {
      alert('Nenhuma falta ou abono marcado para salvar.');
      return;
    }

    setIsSavingPlanilha(true);
    const { data: userData } = await supabase.auth.getUser();

    const recordsToInsert = keys.map(studentId => {
      const data = draftRecords[studentId];
      
      // Format the reason with authorizedBy if it's an Abono
      let finalReason = data.reason;
      if (data.type === 'ABONO' && data.authorizedBy.trim()) {
        finalReason = `[Autorizado por: ${data.authorizedBy.trim()}] ${data.reason}`.trim();
      }

      return {
        student_id: studentId,
        type: data.type,
        date: planilhaDate,
        reason: finalReason || null,
        created_by: userData.user?.id
      };
    });

    const { error } = await supabase.from('student_absences').insert(recordsToInsert);
    if (error) {
      alert('Erro ao salvar lançamentos em lote: ' + error.message);
    } else {
      alert(`${recordsToInsert.length} lançamentos salvos com sucesso!`);
      setDraftRecords({});
      fetchAbsences(); // refresh historico data
    }
    
    setIsSavingPlanilha(false);
  };

  // Planilha Summary Counters
  const draftFaltasCount = Object.values(draftRecords).filter(r => r.type === 'FALTA_JUSTIFICADA').length;
  const draftAbonosCount = Object.values(draftRecords).filter(r => r.type === 'ABONO').length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen pb-40 relative">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Controle Operacional</p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight">Gestão de Faltas e Abonos</h2>
            <p className="text-on-surface-variant font-medium mt-1 text-sm">Monitore e garanta a sincronização com o Sigeduc</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex bg-white/40 p-1.5 rounded-2xl border border-white/60 shadow-sm backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'historico' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-600 hover:bg-white/60'}`}
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('planilha')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'planilha' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-600 hover:bg-white/60'}`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_on</span>
              Planilha de Lançamento
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'historico' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
            <button
              onClick={() => handleQuickFilter('pendentes')}
              className={`glass-card rounded-2xl md:rounded-[2rem] p-4 md:p-6 border-l-4 border-l-rose-500 relative overflow-hidden group text-left transition-all ${filterSigeduc === 'PENDING' ? 'ring-2 ring-rose-500 shadow-lg shadow-rose-500/10' : ''}`}
            >
              <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-rose-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-rose-500 text-lg md:text-2xl">sync_problem</span>
                  </div>
                  {pendentesCount > 0 && (
                    <span className="hidden md:inline text-rose-500 text-[8px] font-bold uppercase tracking-widest animate-pulse bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      Atenção
                    </span>
                  )}
                </div>
                <p className="text-2xl md:text-4xl font-headline font-extrabold text-rose-500">{pendentesCount}</p>
                <p className="text-on-surface-variant text-[10px] md:text-xs font-medium mt-0.5">Pendentes Sigeduc</p>
              </div>
            </button>

            <button
              onClick={() => handleQuickFilter('faltas')}
              className={`glass-card rounded-2xl md:rounded-[2rem] p-4 md:p-6 border-l-4 border-l-blue-500 text-left transition-all ${filterType === 'FALTA_JUSTIFICADA' ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-lg md:text-2xl">person_off</span>
                </div>
              </div>
              <p className="text-2xl md:text-4xl font-headline font-extrabold text-blue-500">{faltasCount}</p>
              <p className="text-on-surface-variant text-[10px] md:text-xs font-medium mt-0.5">Faltas Justificadas</p>
            </button>

            <button
              onClick={() => handleQuickFilter('abonos')}
              className={`glass-card rounded-2xl md:rounded-[2rem] p-4 md:p-6 border-l-4 border-l-emerald-500 text-left transition-all ${filterType === 'ABONO' ? 'ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/10' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-500 text-lg md:text-2xl">event_available</span>
                </div>
              </div>
              <p className="text-2xl md:text-4xl font-headline font-extrabold text-emerald-500">{abonosCount}</p>
              <p className="text-on-surface-variant text-[10px] md:text-xs font-medium mt-0.5">Abonos</p>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

            {/* ── Registration Panel ──────────────────────────────────────────── */}
            <div className="lg:col-span-1 space-y-4">
              <div className="glass-card p-5 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/20 shadow-xl">
                <h3 className="font-bold text-base md:text-lg text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                  Novo Registro
                </h3>

                {!selectedStudent ? (
                  <div>
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 bg-white/60 rounded-xl border border-gray-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all mb-3">
                      <span className="material-symbols-outlined text-primary text-lg">search</span>
                      <input
                        type="text"
                        placeholder="Pesquisar aluno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 w-full outline-none placeholder:text-gray-400"
                      />
                      {searchTerm && (
                        <button onClick={() => { setSearchTerm(''); setStudents([]); }} className="text-gray-400 hover:text-gray-600">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      )}
                    </div>

                    {loadingSearch && <p className="text-xs text-center text-gray-500 my-3">Buscando...</p>}

                    {/* Student Results */}
                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                      {students.map(student => (
                        <div
                          key={student.id}
                          onClick={() => { setSelectedStudent(student); setShowQuickRegister(false); }}
                          className="p-2.5 bg-white/40 rounded-xl border border-gray-100 hover:border-primary/40 hover:bg-primary/5 cursor-pointer flex items-center gap-3 transition-all"
                        >
                          <img src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{student.full_name}</p>
                            <p className="text-[10px] text-gray-500">#{student.enrollment_id} • {student.grade}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* No Results + Quick Register */}
                    {searchTerm.length >= 2 && !loadingSearch && students.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-xs text-gray-500 mb-3">Nenhum aluno encontrado</p>
                        <button
                          onClick={() => { setShowQuickRegister(true); setNewStudentName(searchTerm); }}
                          className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20"
                        >
                          <span className="material-symbols-outlined text-base">person_add</span>
                          Cadastrar Novo Aluno
                        </button>
                      </div>
                    )}

                    {/* Quick Register Form */}
                    {showQuickRegister && (
                      <form onSubmit={handleQuickRegisterStudent} className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                        <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">badge</span>
                          Cadastro Rápido
                        </h4>
                        <input
                          type="text"
                          placeholder="Nome completo *"
                          value={newStudentName}
                          onChange={e => setNewStudentName(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-lg border border-emerald-200 text-sm font-medium text-gray-700 outline-none focus:border-emerald-400"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Matrícula (RM) *"
                          value={newStudentRM}
                          onChange={e => setNewStudentRM(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-lg border border-emerald-200 text-sm font-medium text-gray-700 outline-none focus:border-emerald-400"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Série/Turma (ex: 3º Ano A)"
                          value={newStudentGrade}
                          onChange={e => setNewStudentGrade(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white rounded-lg border border-emerald-200 text-sm font-medium text-gray-700 outline-none focus:border-emerald-400"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowQuickRegister(false)}
                            className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isCreatingStudent}
                            className="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all disabled:opacity-50"
                          >
                            {isCreatingStudent ? 'Salvando...' : 'Cadastrar'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  /* Registration Form */
                  <form onSubmit={handleRegister} className="space-y-3 md:space-y-4">
                    {/* Selected Student Card */}
                    <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={selectedStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent.full_name}`} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-primary truncate">{selectedStudent.full_name}</p>
                          <p className="text-[10px] text-primary/70">#{selectedStudent.enrollment_id} • {selectedStudent.grade}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 ml-1">Tipo de Registro</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRecordType('FALTA_JUSTIFICADA')}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${recordType === 'FALTA_JUSTIFICADA' ? 'bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-500/20' : 'bg-white/60 text-gray-600 border-gray-200 hover:border-blue-300'}`}
                        >
                          <span className="material-symbols-outlined text-sm">person_off</span>
                          Falta Just.
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordType('ABONO')}
                          className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${recordType === 'ABONO' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-white/60 text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                        >
                          <span className="material-symbols-outlined text-sm">event_available</span>
                          Abono
                        </button>
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 ml-1">Data</label>
                      <input
                        type="date"
                        value={recordDate}
                        onChange={e => setRecordDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white/60 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm font-bold text-gray-700"
                        required
                      />
                    </div>

                    {/* Reason */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 ml-1">Motivo / Justificativa</label>
                      <textarea
                        value={recordReason}
                        onChange={e => setRecordReason(e.target.value)}
                        placeholder="Ex: Atestado médico, consulta..."
                        className="w-full px-3 py-2.5 bg-white/60 rounded-xl border border-gray-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-sm text-gray-700 resize-none h-20"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Salvando...</>
                      ) : (
                        <><span className="material-symbols-outlined text-base">save</span> Registrar</>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* ── Records Panel ───────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/20 shadow-xl">

                {/* Records Header */}
                <div className="flex flex-col gap-4 mb-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <h3 className="font-bold text-base md:text-lg text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined text-xl">fact_check</span>
                      Controle de Registros
                      <span className="text-xs font-medium text-gray-400 ml-1">({filteredAbsences.length})</span>
                    </h3>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="px-2.5 py-1.5 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-primary"
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="px-2.5 py-1.5 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Filters Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search in table */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200 focus-within:border-primary transition-all flex-1 min-w-[150px] max-w-xs">
                      <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                      <input
                        type="text"
                        placeholder="Filtrar por nome..."
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-gray-700 w-full outline-none placeholder:text-gray-400"
                      />
                    </div>

                    {/* Type filter */}
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value as any)}
                      className="px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-primary"
                    >
                      <option value="ALL">Todos os tipos</option>
                      <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                      <option value="ABONO">Abono</option>
                    </select>

                    {/* Sigeduc filter */}
                    <select
                      value={filterSigeduc}
                      onChange={e => setFilterSigeduc(e.target.value as any)}
                      className="px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-primary"
                    >
                      <option value="ALL">Todos status</option>
                      <option value="PENDING">Pendentes</option>
                      <option value="SYNCED">Baixados</option>
                    </select>

                    {/* Grade filter */}
                    {historicoGrades.length > 0 && (
                      <select
                        value={filterGrade}
                        onChange={e => setFilterGrade(e.target.value)}
                        className="px-3 py-1.5 bg-white/60 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 outline-none focus:border-primary"
                      >
                        <option value="">Todas turmas</option>
                        {historicoGrades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {pendentesCount > 0 && (
                      <button
                        onClick={handleBatchSync}
                        disabled={isBatchSyncing}
                        className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-600 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm">{isBatchSyncing ? 'progress_activity' : 'done_all'}</span>
                        {isBatchSyncing ? 'Processando...' : `Baixar Todos (${pendentesCount})`}
                      </button>
                    )}
                    {filteredAbsences.length > 0 && (
                      <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Exportar CSV
                      </button>
                    )}
                    {(filterType !== 'ALL' || filterSigeduc !== 'ALL' || filterGrade || filterSearch) && (
                      <button
                        onClick={() => { setFilterType('ALL'); setFilterSigeduc('ALL'); setFilterGrade(''); setFilterSearch(''); }}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-200 transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Table (Desktop) ────────────────────────────────────────── */}
                {loadingAbsences ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                    <p className="text-sm font-bold text-outline mt-3">Carregando registros...</p>
                  </div>
                ) : filteredAbsences.length === 0 ? (
                  <div className="text-center py-16 opacity-40">
                    <span className="material-symbols-outlined text-6xl mb-2">event_available</span>
                    <p className="font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
                    <p className="text-xs mt-1 opacity-60">Ajuste os filtros ou o período de busca</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200/50">
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Data</th>
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Aluno</th>
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Tipo</th>
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Motivo</th>
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Sigeduc</th>
                            <th className="py-3 px-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAbsences.map((record) => (
                            <tr key={record.id} className="border-b border-gray-100/50 hover:bg-white/40 transition-colors group">
                              {/* Date */}
                              <td className="py-3 px-3">
                                <p className="text-sm font-bold text-gray-800">{format(parseISO(record.date), 'dd/MM')}</p>
                                <p className="text-[10px] text-gray-400">{format(parseISO(record.date), 'yyyy')}</p>
                              </td>

                              {/* Student */}
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2.5">
                                  <img
                                    src={record.students?.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${record.students?.full_name}`}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate max-w-[180px]">{record.students?.full_name || 'Aluno removido'}</p>
                                    <p className="text-[10px] text-gray-500">{record.students?.grade} • #{record.students?.enrollment_id}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Type */}
                              <td className="py-3 px-3">
                                {record.type === 'FALTA_JUSTIFICADA' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                                    <span className="material-symbols-outlined text-[11px]">person_off</span>
                                    Falta Just.
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                                    <span className="material-symbols-outlined text-[11px]">event_available</span>
                                    Abono
                                  </span>
                                )}
                              </td>

                              {/* Reason */}
                              <td className="py-3 px-3">
                                <p className="text-xs text-gray-600 max-w-[200px] truncate" title={record.reason || ''}>
                                  {record.reason || <span className="text-gray-300 italic">—</span>}
                                </p>
                              </td>

                              {/* Sigeduc Status */}
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => handleToggleSigeduc(record.id, record.sigeduc_synced)}
                                  className="cursor-pointer transition-all hover:scale-105"
                                  title={record.sigeduc_synced ? 'Clique para marcar como pendente' : 'Clique para marcar como baixado'}
                                >
                                  {record.sigeduc_synced ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                      Baixado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest border border-rose-200 animate-pulse">
                                      <span className="material-symbols-outlined text-[12px]">warning</span>
                                      Pendente
                                    </span>
                                  )}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEditModal(record)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-all"
                                    title="Editar"
                                  >
                                    <span className="material-symbols-outlined text-sm">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(record.id, record.students?.full_name || '')}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                                    title="Excluir"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── Mobile Cards ──────────────────────────────────────────── */}
                    <div className="md:hidden space-y-3">
                      {filteredAbsences.map((record) => (
                        <div key={record.id} className="bg-white/50 rounded-2xl border border-gray-100 p-4 space-y-3">
                          {/* Top row: Student + Date */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <img
                                src={record.students?.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${record.students?.full_name}`}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-800 truncate">{record.students?.full_name || 'Aluno removido'}</p>
                                <p className="text-[10px] text-gray-500">{record.students?.grade} • #{record.students?.enrollment_id}</p>
                              </div>
                            </div>
                            <p className="text-sm font-bold text-gray-600 flex-shrink-0 ml-2">{format(parseISO(record.date), 'dd/MM')}</p>
                          </div>

                          {/* Info row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {record.type === 'FALTA_JUSTIFICADA' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black uppercase border border-blue-200">
                                <span className="material-symbols-outlined text-[10px]">person_off</span>
                                Falta Justificada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                                <span className="material-symbols-outlined text-[10px]">event_available</span>
                                Abono
                              </span>
                            )}

                            <button onClick={() => handleToggleSigeduc(record.id, record.sigeduc_synced)}>
                              {record.sigeduc_synced ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase border border-emerald-200">
                                  <span className="material-symbols-outlined text-[10px]">check_circle</span>
                                  Baixado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-black uppercase border border-rose-200 animate-pulse">
                                  <span className="material-symbols-outlined text-[10px]">warning</span>
                                  Pendente
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Reason */}
                          {record.reason && (
                            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                              {record.reason}
                            </p>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => openEditModal(record)}
                              className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(record.id, record.students?.full_name || '')}
                              className="flex-1 py-2 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ── PLANILHA (LANCAMENTO EM LOTE) VIEW ─────────────────────────── */
        <div className="bg-white/80 backdrop-blur-xl p-4 md:p-8 rounded-[2rem] border border-white shadow-2xl relative overflow-hidden">
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          
          {/* Planilha Header */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-8 relative z-10">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3">
                <span className="material-symbols-outlined text-2xl">grid_on</span>
              </div>
              <h3 className="font-extrabold text-2xl text-gray-800 tracking-tight">Planilha de Chamada</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">Registre de forma rápida múltiplos alunos. Clique nas opções para alternar e preencha os detalhes.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto p-2 bg-gray-50/80 rounded-2xl border border-gray-100 shadow-inner">
              <div className="flex items-center gap-2 px-3 bg-white rounded-xl border border-gray-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm flex-1 md:w-48">
                <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Buscar aluno..."
                  value={planilhaSearch}
                  onChange={e => setPlanilhaSearch(e.target.value)}
                  className="w-full py-2.5 bg-transparent border-none text-sm font-bold text-gray-700 outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
              <input
                type="date"
                value={planilhaDate}
                onChange={e => setPlanilhaDate(e.target.value)}
                className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-bold text-gray-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
              <select
                value={planilhaGrade}
                onChange={e => setPlanilhaGrade(e.target.value)}
                className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm font-bold text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm min-w-[140px] appearance-none cursor-pointer"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23001e40%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
              >
                {allGrades.length === 0 && <option value="">Carregando...</option>}
                {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Planilha Grid */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8 relative z-10">
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-20 bg-white/90 backdrop-blur-md shadow-sm">
                  <tr className="border-b border-gray-200">
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-[25%]">Aluno</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-[25%]">Registro</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-[25%]">Autorizado por</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-[25%]">Motivo / Justificativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {planilhaStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-3">
                          <span className="material-symbols-outlined text-3xl text-gray-300">search_off</span>
                        </div>
                        <p className="text-gray-500 font-bold text-sm">Nenhum aluno encontrado.</p>
                      </td>
                    </tr>
                  ) : (
                    planilhaStudents.map(student => {
                      const draft = getDraft(student.id);
                      const isActiveFalta = draft?.type === 'FALTA_JUSTIFICADA';
                      const isActiveAbono = draft?.type === 'ABONO';
                      
                      return (
                        <tr 
                          key={student.id} 
                          className={`group transition-all duration-300 ${isActiveFalta ? 'bg-blue-50/50 hover:bg-blue-50' : isActiveAbono ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-gray-50/50'}`}
                        >
                          <td className="py-4 px-6 align-middle">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img
                                  src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`}
                                  alt=""
                                  className={`w-10 h-10 rounded-[10px] object-cover transition-all duration-300 ${isActiveFalta ? 'ring-2 ring-blue-500 ring-offset-2' : isActiveAbono ? 'ring-2 ring-emerald-500 ring-offset-2' : 'border border-gray-200 group-hover:border-gray-300'}`}
                                />
                                {(isActiveFalta || isActiveAbono) && (
                                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white border-2 border-white ${isActiveFalta ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                                    <span className="material-symbols-outlined text-[10px]">check</span>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-bold truncate transition-colors ${isActiveFalta ? 'text-blue-900' : isActiveAbono ? 'text-emerald-900' : 'text-gray-800'}`}>
                                  {student.full_name}
                                </p>
                                <p className={`text-[10px] font-medium tracking-wide transition-colors ${isActiveFalta ? 'text-blue-600/70' : isActiveAbono ? 'text-emerald-600/70' : 'text-gray-400'}`}>
                                  #{student.enrollment_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 align-middle">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDraftTypeToggle(student.id, 'FALTA_JUSTIFICADA')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${isActiveFalta ? 'bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/30 scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50'}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">person_off</span>
                                Falta Just.
                              </button>
                              <button
                                onClick={() => handleDraftTypeToggle(student.id, 'ABONO')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${isActiveAbono ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/30 scale-105' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50'}`}
                              >
                                <span className="material-symbols-outlined text-[14px]">event_available</span>
                                Abono
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-6 align-middle">
                            <div className={`transition-all duration-500 origin-left ${isActiveAbono ? 'opacity-100 scale-100' : 'opacity-30 scale-95 pointer-events-none'}`}>
                              <input
                                type="text"
                                value={draft?.authorizedBy || ''}
                                onChange={e => handleDraftAuthorizedByChange(student.id, e.target.value)}
                                placeholder={isActiveAbono ? 'Nome do autorizador...' : ''}
                                className={`w-full px-3 py-2 bg-white rounded-xl border text-xs font-medium outline-none transition-all ${isActiveAbono ? 'border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                              />
                            </div>
                          </td>
                          <td className="py-4 px-6 align-middle">
                            <div className={`transition-all duration-500 origin-left ${draft ? 'opacity-100 scale-100' : 'opacity-30 scale-95 pointer-events-none'}`}>
                              <input
                                type="text"
                                value={draft?.reason || ''}
                                onChange={e => handleDraftReasonChange(student.id, e.target.value)}
                                placeholder={draft ? 'Motivo...' : ''}
                                className={`w-full px-3 py-2 bg-white rounded-xl border text-xs font-medium outline-none transition-all ${isActiveFalta ? 'border-blue-200 text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner' : isActiveAbono ? 'border-emerald-200 text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-inner' : 'border-gray-100 text-gray-400 bg-gray-50'}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Floating Summary Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 relative z-20">
              <div className="flex items-center gap-6">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400">summarize</span>
                  Resumo
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-bold text-gray-700">{draftFaltasCount} <span className="font-medium text-gray-500 text-xs">Faltas</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-bold text-gray-700">{draftAbonosCount} <span className="font-medium text-gray-500 text-xs">Abonos</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(draftFaltasCount > 0 || draftAbonosCount > 0) && (
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja limpar todas as marcações não salvas?')) {
                        setDraftRecords({});
                      }
                    }}
                    className="px-4 py-2.5 bg-white text-gray-500 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-gray-100 hover:text-gray-800 transition-all border border-gray-200"
                  >
                    Limpar
                  </button>
                )}
                
                <button
                  onClick={handleBatchSavePlanilha}
                  disabled={isSavingPlanilha || (draftFaltasCount === 0 && draftAbonosCount === 0)}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 min-w-[200px]"
                >
                  {isSavingPlanilha ? (
                    <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span> Salvando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-lg">save_as</span> Gravar Registros</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (Shared) ────────────────────────────────────────────────── */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditingRecord(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">edit_note</span>
                Editar Registro
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Student Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <img
                src={editingRecord.students?.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${editingRecord.students?.full_name}`}
                alt=""
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <p className="text-sm font-bold text-gray-800">{editingRecord.students?.full_name}</p>
                <p className="text-[10px] text-gray-500">{editingRecord.students?.grade} • #{editingRecord.students?.enrollment_id}</p>
              </div>
            </div>

            {/* Type Toggle */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditType('FALTA_JUSTIFICADA')}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${editType === 'FALTA_JUSTIFICADA' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  Falta Just.
                </button>
                <button
                  type="button"
                  onClick={() => setEditType('ABONO')}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${editType === 'ABONO' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  Abono
                </button>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Data</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 outline-none focus:border-primary"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Motivo</label>
              <textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="Motivo / justificativa..."
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-primary resize-none h-20"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isSavingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
