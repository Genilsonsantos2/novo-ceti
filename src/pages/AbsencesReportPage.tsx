// @ts-nocheck
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

  // ── Planilha State ──────────────────────────────────────────────────────────
  const [planilhaDate, setPlanilhaDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planilhaGrade, setPlanilhaGrade] = useState('');
  const [draftRecords, setDraftRecords] = useState<Record<string, DraftRecord>>({});
  const [isSavingPlanilha, setIsSavingPlanilha] = useState(false);

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
  };

  // ── Filtered Data (Historico) ────────────────────────────────────────────────
  const filteredAbsences = useMemo(() => {
    return absences.filter(a => {
      if (filterType !== 'ALL' && a.type !== filterType) return false;
      if (filterSigeduc === 'PENDING' && a.sigeduc_synced) return false;
      if (filterSigeduc === 'SYNCED' && !a.sigeduc_synced) return false;
      return true;
    });
  }, [absences, filterType, filterSigeduc]);

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
    return allStudents.filter(s => s.grade === planilhaGrade);
  }, [allStudents, planilhaGrade]);

  // Set default grade if none is selected
  useEffect(() => {
    if (allGrades.length > 0 && !planilhaGrade) {
      setPlanilhaGrade(allGrades[0]);
    }
  }, [allGrades, planilhaGrade]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleToggleSigeduc = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('student_absences')
      .update({ sigeduc_synced: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status: ' + error.message);
    }
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

  const handleDraftTypeChange = (studentId: string, typeStr: string) => {
    if (!typeStr) {
      // Clear
      setDraftRecords(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[studentId];
        return newDrafts;
      });
      return;
    }

    const type = typeStr as 'FALTA_JUSTIFICADA' | 'ABONO';
    setDraftRecords(prev => {
      const current = prev[studentId];
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
  const draftTotalCount = draftFaltasCount + draftAbonosCount;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen pb-40 relative bg-[#F3F4F6]">
      {/* Header (App) */}
      <header className="mb-6 md:mb-8">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Controle Operacional</p>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight">Gestão de Faltas e Abonos</h2>
            <p className="text-on-surface-variant font-medium mt-1 text-sm">Monitore e garanta a sincronização com o Sigeduc</p>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex bg-white border border-gray-300 shadow-sm overflow-hidden rounded-md">
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold transition-all border-r border-gray-300 ${activeTab === 'historico' ? 'bg-[#1F4E79] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              Histórico
            </button>
            <button
              onClick={() => setActiveTab('planilha')}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-bold transition-all ${activeTab === 'planilha' ? 'bg-[#00A859] text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_on</span>
              Planilha de Lançamento
            </button>
          </div>
        </div>
      </header>

      {activeTab === 'historico' ? (
        <>
          {/* Historico View */}
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

          <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/20 shadow-xl overflow-x-auto">
             <div className="flex gap-2 mb-4">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-2 rounded text-xs"/>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-2 rounded text-xs"/>
                <button onClick={handleExportCSV} className="text-xs bg-gray-200 px-3 rounded">Exportar</button>
             </div>
             <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b"><th className="pb-2">Data</th><th className="pb-2">Aluno</th><th className="pb-2">Status</th><th className="pb-2">Sigeduc</th><th className="pb-2">Ações</th></tr>
                </thead>
                <tbody>
                  {filteredAbsences.map(r => (
                    <tr key={r.id} className="border-b border-gray-100">
                      <td className="py-2">{format(parseISO(r.date), 'dd/MM/yyyy')}</td>
                      <td>{r.students?.full_name}</td>
                      <td>{r.type === 'ABONO' ? 'Abono' : 'Falta'}</td>
                      <td>
                        <button onClick={() => handleToggleSigeduc(r.id, r.sigeduc_synced)} className={`px-2 py-1 rounded text-white ${r.sigeduc_synced ? 'bg-green-500' : 'bg-red-500'}`}>
                          {r.sigeduc_synced ? 'Baixado' : 'Pendente'}
                        </button>
                      </td>
                      <td>
                         <button onClick={() => handleDelete(r.id, r.students?.full_name||'')} className="text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </>
      ) : (
        /* ── PLANILHA EXCEL VIEW ─────────────────────────────────────────────────── */
        <div className="w-full">
          
          {/* EXCEL STYLE DASHBOARD PANEL */}
          <div className="flex flex-col md:flex-row bg-[#00A859] p-1 border-b-4 border-[#00703C] mb-4 shadow-md rounded-t-md">
            <div className="bg-white/10 p-2 md:p-4 text-white flex-1 flex flex-col md:flex-row items-center justify-between border-r border-white/20">
               <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider">Status dos Lançamentos</h3>
                  <p className="text-xs text-white/80">Controle Diário de Turma</p>
               </div>
               
               {/* Controls in Dashboard Header */}
               <div className="flex gap-2 mt-2 md:mt-0">
                  <div className="bg-white px-2 py-1 rounded text-gray-800 text-xs font-bold flex items-center">
                    Data:
                    <input 
                      type="date" 
                      value={planilhaDate} 
                      onChange={e => setPlanilhaDate(e.target.value)}
                      className="ml-2 border-none outline-none font-normal"
                    />
                  </div>
                  <div className="bg-white px-2 py-1 rounded text-gray-800 text-xs font-bold flex items-center">
                    Turma:
                    <select 
                      value={planilhaGrade} 
                      onChange={e => setPlanilhaGrade(e.target.value)}
                      className="ml-2 border-none outline-none font-normal"
                    >
                      {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
               </div>
            </div>
            
            {/* KPI Cards (Like the Excel Dashboard) */}
            <div className="flex bg-[#E6F4EA] divide-x divide-gray-300">
               <div className="px-6 py-2 text-center flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Alunos</p>
                  <p className="text-2xl font-black text-[#00A859]">{planilhaStudents.length}</p>
               </div>
               <div className="px-6 py-2 text-center flex flex-col justify-center bg-blue-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Faltas Marcadas</p>
                  <p className="text-2xl font-black text-blue-600">{draftFaltasCount}</p>
               </div>
               <div className="px-6 py-2 text-center flex flex-col justify-center bg-emerald-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Abonos Marcados</p>
                  <p className="text-2xl font-black text-emerald-600">{draftAbonosCount}</p>
               </div>
               <div className="px-4 py-2 flex flex-col gap-1 justify-center bg-gray-100">
                  <button 
                    onClick={handleBatchSavePlanilha}
                    disabled={draftTotalCount === 0 || isSavingPlanilha}
                    className="bg-[#00A859] text-white text-xs font-bold px-4 py-1.5 rounded disabled:opacity-50 hover:bg-[#00703C] transition-colors"
                  >
                    {isSavingPlanilha ? 'Gravando...' : 'Gravar Dados'}
                  </button>
                  <button 
                    onClick={() => setDraftRecords({})}
                    disabled={draftTotalCount === 0}
                    className="bg-white text-red-600 border border-red-200 text-[10px] font-bold px-4 py-1 rounded disabled:opacity-50 hover:bg-red-50"
                  >
                    Limpar
                  </button>
               </div>
            </div>
          </div>

          {/* EXCEL GRID */}
          <div className="bg-white border border-gray-400 overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs font-sans">
              <thead>
                <tr className="bg-[#00A859] text-white">
                  <th className="border border-gray-400 px-2 py-1 font-bold text-center w-8">Nº</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold w-20">RM</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold w-[30%]">ALUNO</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold w-40 text-center">STATUS</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold w-48">AUTORIZADO POR</th>
                  <th className="border border-gray-400 px-2 py-1 font-bold">MOTIVO / OBSERVAÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {planilhaStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500 border border-gray-400">
                      Nenhum aluno encontrado para esta turma.
                    </td>
                  </tr>
                ) : (
                  planilhaStudents.map((student, index) => {
                    const draft = getDraft(student.id);
                    const isActiveAbono = draft?.type === 'ABONO';
                    const hasStatus = !!draft;

                    return (
                      <tr 
                        key={student.id} 
                        className={`hover:bg-[#E6F4EA] transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="border border-gray-300 px-2 py-0.5 text-center text-gray-500">{index + 1}</td>
                        <td className="border border-gray-300 px-2 py-0.5 text-gray-600">{student.enrollment_id}</td>
                        <td className={`border border-gray-300 px-2 py-0.5 font-bold ${hasStatus ? 'text-[#00A859]' : 'text-gray-800'}`}>
                          {student.full_name}
                        </td>
                        <td className="border border-gray-300 p-0 relative">
                          <select
                            value={draft?.type || ''}
                            onChange={(e) => handleDraftTypeChange(student.id, e.target.value)}
                            className={`w-full h-full min-h-[28px] px-2 py-0.5 border-none outline-none text-xs font-bold cursor-pointer transition-colors
                              ${draft?.type === 'FALTA_JUSTIFICADA' ? 'bg-blue-100 text-blue-800' : 
                                draft?.type === 'ABONO' ? 'bg-emerald-100 text-emerald-800' : 
                                'bg-transparent text-gray-600'
                              } focus:ring-1 focus:ring-inset focus:ring-[#00A859]`}
                          >
                            <option value="">-- Selecione --</option>
                            <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                            <option value="ABONO">Abono</option>
                          </select>
                        </td>
                        <td className={`border border-gray-300 p-0 transition-colors ${!isActiveAbono ? 'bg-gray-100' : 'bg-white'}`}>
                          <input
                            type="text"
                            value={draft?.authorizedBy || ''}
                            onChange={e => handleDraftAuthorizedByChange(student.id, e.target.value)}
                            disabled={!isActiveAbono}
                            placeholder={isActiveAbono ? 'Nome (Obrigatório para Abono)' : ''}
                            className="w-full h-full min-h-[28px] px-2 py-0.5 border-none outline-none text-xs bg-transparent disabled:opacity-50 disabled:cursor-not-allowed focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#00A859]"
                          />
                        </td>
                        <td className={`border border-gray-300 p-0 transition-colors ${!hasStatus ? 'bg-gray-100' : 'bg-white'}`}>
                          <input
                            type="text"
                            value={draft?.reason || ''}
                            onChange={e => handleDraftReasonChange(student.id, e.target.value)}
                            disabled={!hasStatus}
                            placeholder={hasStatus ? 'Observações...' : ''}
                            className="w-full h-full min-h-[28px] px-2 py-0.5 border-none outline-none text-xs bg-transparent disabled:opacity-50 disabled:cursor-not-allowed focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#00A859]"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
