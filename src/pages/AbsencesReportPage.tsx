// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

interface ImportRow {
  Data: string;
  Aluno: string;
  Matrícula: string;
  Turma: string;
  Tipo: string;
  Motivo: string;
  'Status Sigeduc': string;
}

interface ImportValidationResult {
  row: ImportRow;
  studentId: string | null;
  status: 'VALID' | 'ERROR';
  errorReason?: string;
  parsedDate: string;
  parsedType: 'FALTA_JUSTIFICADA' | 'ABONO';
  parsedSynced: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
// Amber for Faltas, Teal for Abonos
const COLORS = ['#f59e0b', '#14b8a6']; 

// ─── Main Component ───────────────────────────────────────────────────────────
export const AbsencesReportPage: React.FC = () => {
  // ── Tab State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'importacao' | 'historico' | 'diario' | 'relatorios' | 'planilha'>('dashboard');

  // ── Data States ─────────────────────────────────────────────────────────────
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<StudentResult[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

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
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDENTE' | 'EM_ANALISE' | 'VALIDADA'>('ALL');
  const [filterGrade, setFilterGrade] = useState<'ALL' | string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Planilha State ──────────────────────────────────────────────────────────
  const [planilhaDate, setPlanilhaDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [planilhaGrade, setPlanilhaGrade] = useState('');
  const [draftRecords, setDraftRecords] = useState<Record<string, DraftRecord>>({});
  const [isSavingPlanilha, setIsSavingPlanilha] = useState(false);

  // ── Import State ────────────────────────────────────────────────────────────
  const [importValidation, setImportValidation] = useState<ImportValidationResult[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // ── Modals & Inline Edit State ──────────────────────────────────────────────
  const [selectedTimelineStudent, setSelectedTimelineStudent] = useState<{id: string, name: string} | null>(null);
  const [quickAddStudent, setQuickAddStudent] = useState<{id: string, name: string, grade?: string} | null>(null);
  const [quickAddDraft, setQuickAddDraft] = useState<{date: string, type: 'FALTA_JUSTIFICADA' | 'ABONO', reason: string, authorizedBy: string}>({
    date: format(new Date(), 'yyyy-MM-dd'),
    type: 'FALTA_JUSTIFICADA',
    reason: '',
    authorizedBy: '',
  });
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{type: 'FALTA_JUSTIFICADA' | 'ABONO', reason: string}>({ type: 'FALTA_JUSTIFICADA', reason: '' });

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
  const getAbsenceStatus = (record: AbsenceRecord): 'PENDENTE' | 'EM_ANALISE' | 'VALIDADA' => {
    const hasReason = !!record.reason && record.reason.trim().length > 0;
    if (record.sigeduc_synced && hasReason) return 'VALIDADA';
    if (hasReason && !record.sigeduc_synced) return 'EM_ANALISE';
    return 'PENDENTE';
  };

  const filteredAbsences = useMemo(() => {
    return absences.filter(a => {
      if (filterType !== 'ALL' && a.type !== filterType) return false;
      if (filterSigeduc === 'PENDING' && a.sigeduc_synced) return false;
      if (filterSigeduc === 'SYNCED' && !a.sigeduc_synced) return false;
      if (filterStatus !== 'ALL' && getAbsenceStatus(a) !== filterStatus) return false;
      if (filterGrade !== 'ALL' && a.students?.grade !== filterGrade) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !a.students?.full_name.toLowerCase().includes(query) &&
          !a.students?.enrollment_id.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [absences, filterType, filterSigeduc, filterStatus, filterGrade, searchQuery]);

  const pendentesCount = filteredAbsences.filter(a => !a.sigeduc_synced).length;
  const faltasCount = filteredAbsences.filter(a => a.type === 'FALTA_JUSTIFICADA').length;
  const abonosCount = filteredAbsences.filter(a => a.type === 'ABONO').length;

  // ── Recurrence Logic (Alerta de Reincidência) ────────────────────────────────
  const recurrentStudents = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const counts = absences.reduce((acc, a) => {
      if (isAfter(parseISO(a.date), thirtyDaysAgo)) {
        acc[a.student_id] = (acc[a.student_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const recurrent = new Set<string>();
    Object.entries(counts).forEach(([id, count]) => {
      if (count >= 3) recurrent.add(id);
    });
    return recurrent;
  }, [absences]);

  // ── Dashboard Data (Gráficos) ───────────────────────────────────────────────
  const chartDataPie = [
    { name: 'Faltas Justificadas', value: faltasCount },
    { name: 'Abonos', value: abonosCount }
  ];

  const chartDataBar = useMemo(() => {
    const gradesCounts = absences.reduce((acc, a) => {
      const grade = a.students?.grade || 'Sem Turma';
      if (!acc[grade]) acc[grade] = { name: grade, Faltas: 0, Abonos: 0 };
      if (a.type === 'FALTA_JUSTIFICADA') acc[grade].Faltas += 1;
      else acc[grade].Abonos += 1;
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(gradesCounts).sort((a: any, b: any) => (b.Faltas + b.Abonos) - (a.Faltas + a.Abonos)).slice(0, 5);
  }, [absences]);

  const topStudentsData = useMemo(() => {
    const counts = absences.reduce((acc, record) => {
      const key = record.student_id;
      const studentName = record.students?.full_name || 'Aluno sem nome';
      if (!acc[key]) acc[key] = { name: studentName, total: 0, faltas: 0, abonos: 0 };
      acc[key].total += 1;
      if (record.type === 'FALTA_JUSTIFICADA') acc[key].faltas += 1;
      else acc[key].abonos += 1;
      return acc;
    }, {} as Record<string, { name: string; total: number; faltas: number; abonos: number }>);

    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [absences]);

  const reportByGrade = useMemo(() => {
    const grouped = absences.reduce((acc, record) => {
      const grade = record.students?.grade || 'Sem turma';
      if (!acc[grade]) {
        acc[grade] = { grade, faltas: 0, abonos: 0, total: 0 };
      }
      acc[grade].total += 1;
      if (record.type === 'FALTA_JUSTIFICADA') acc[grade].faltas += 1;
      else acc[grade].abonos += 1;
      return acc;
    }, {} as Record<string, { grade: string; faltas: number; abonos: number; total: number }>);

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  }, [absences]);

  const reportByStudent = useMemo(() => {
    const grouped = absences.reduce((acc, record) => {
      const studentName = record.students?.full_name || 'Aluno sem nome';
      const key = record.student_id || studentName;
      if (!acc[key]) {
        acc[key] = { student: studentName, grade: record.students?.grade || '-', faltas: 0, abonos: 0, total: 0 };
      }
      acc[key].total += 1;
      if (record.type === 'FALTA_JUSTIFICADA') acc[key].faltas += 1;
      else acc[key].abonos += 1;
      return acc;
    }, {} as Record<string, { student: string; grade: string; faltas: number; abonos: number; total: number }>);

    return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [absences]);

  // ── Filtered Data (Planilha) ─────────────────────────────────────────────────
  const allGrades = useMemo(() => {
    const set = new Set(allStudents.map(s => s.grade).filter(Boolean));
    return Array.from(set).sort();
  }, [allStudents]);

  const planilhaStudents = useMemo(() => {
    if (!planilhaGrade) return [];
    return allStudents.filter(s => s.grade === planilhaGrade);
  }, [allStudents, planilhaGrade]);

  useEffect(() => {
    if (allGrades.length > 0 && !planilhaGrade) {
      setPlanilhaGrade(allGrades[0]);
    }
  }, [allGrades, planilhaGrade]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const getStudentInitials = (fullName?: string) => {
    if (!fullName) return '?';

    const names = fullName.trim().split(/\s+/).filter(Boolean);
    if (names.length === 1) return names[0].slice(0, 2).toUpperCase();

    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  };

  const handleToggleSigeduc = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('student_absences')
      .update({ sigeduc_synced: !currentStatus })
      .eq('id', id);
    if (error) alert('Erro ao atualizar status: ' + error.message);
  };

  const handleBatchSyncSigeduc = async () => {
    const pendentes = filteredAbsences.filter(a => !a.sigeduc_synced).map(a => a.id);
    if (pendentes.length === 0) return alert('Nenhum pendente selecionado.');
    if (!window.confirm(`Deseja marcar ${pendentes.length} registros como baixados no Sigeduc?`)) return;
    const { error } = await supabase.from('student_absences').update({ sigeduc_synced: true }).in('id', pendentes);
    if (error) alert('Erro ao atualizar em lote: ' + error.message);
    else alert('Registros sincronizados com sucesso!');
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (!window.confirm(`Excluir registro de "${studentName}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('student_absences').delete().eq('id', id);
    if (error) alert('Erro ao excluir: ' + error.message);
    else {
      setAbsences(prev => prev.filter(a => a.id !== id));
      alert('Registro excluído com sucesso.');
    }
  };

  const handleQuickAddSave = async () => {
    if (!quickAddStudent) return;

    const { data: userData } = await supabase.auth.getUser();
    const finalReason = quickAddDraft.authorizedBy && quickAddDraft.authorizedBy.trim()
      ? `[Autorizado por: ${quickAddDraft.authorizedBy.trim()}] ${quickAddDraft.reason}`.trim()
      : quickAddDraft.reason.trim();

    const { error } = await supabase.from('student_absences').insert({
      student_id: quickAddStudent.id,
      type: quickAddDraft.type,
      date: quickAddDraft.date,
      reason: finalReason || null,
      created_by: userData.user?.id
    });

    if (error) {
      alert('Erro ao registrar: ' + error.message);
      return;
    }

    setQuickAddStudent(null);
    setQuickAddDraft({
      date: format(new Date(), 'yyyy-MM-dd'),
      type: 'FALTA_JUSTIFICADA',
      reason: '',
      authorizedBy: '',
    });
    fetchAbsences();
    alert('Registro salvo com sucesso.');
  };

  // ── Inline Editing ──────────────────────────────────────────────────────────
  const startEditing = (record: AbsenceRecord) => {
    setEditingRowId(record.id);
    setEditDraft({ type: record.type, reason: record.reason || '' });
  };

  const saveEditing = async (id: string) => {
    const { error } = await supabase
      .from('student_absences')
      .update({ type: editDraft.type, reason: editDraft.reason || null })
      .eq('id', id);
    
    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setEditingRowId(null);
      // Update local state to avoid refetch wait
      setAbsences(prev => prev.map(a => a.id === id ? { ...a, type: editDraft.type, reason: editDraft.reason || null } : a));
    }
  };

  // ── WhatsApp Notificator ────────────────────────────────────────────────────
  const generateWhatsAppMessage = (studentName: string) => {
    const text = `Olá, somos a coordenação da escola. Notamos ausências recentes do(a) aluno(a) *${studentName}* e gostaríamos de alinhar com os responsáveis para garantir o acompanhamento pedagógico. Por favor, entre em contato conosco.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.setFontSize(16);
      pdf.text('Relatório Gerencial de Faltas e Abonos', 10, 10);
      pdf.addImage(imgData, 'PNG', 0, 15, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Faltas_${startDate}_a_${endDate}.pdf`);
    } catch (e) {
      alert('Erro ao gerar PDF.');
    }
  };

  const handleExportReportPDF = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(16);
      pdf.text('Relatório de Faltas e Abonos', 10, 10);
      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Detalhado_${startDate}_a_${endDate}.pdf`);
    } catch (e) {
      alert('Erro ao gerar relatório em PDF.');
    }
  };

  // ── Planilha Actions ────────────────────────────────────────────────────────
  const getDraft = (id: string): DraftRecord | undefined => draftRecords[id];

  const handleDraftTypeChange = (studentId: string, typeStr: string) => {
    if (!typeStr) {
      setDraftRecords(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[studentId];
        return newDrafts;
      });
      return;
    }
    const type = typeStr as 'FALTA_JUSTIFICADA' | 'ABONO';
    setDraftRecords(prev => ({
      ...prev,
      [studentId]: { type, reason: prev[studentId]?.reason || '', authorizedBy: prev[studentId]?.authorizedBy || '' }
    }));
  };

  const handleDraftReasonChange = (studentId: string, reason: string) => {
    setDraftRecords(prev => prev[studentId] ? { ...prev, [studentId]: { ...prev[studentId], reason } } : prev);
  };

  const handleDraftAuthorizedByChange = (studentId: string, authorizedBy: string) => {
    setDraftRecords(prev => prev[studentId] ? { ...prev, [studentId]: { ...prev[studentId], authorizedBy } } : prev);
  };

  const handleBatchSavePlanilha = async () => {
    const keys = Object.keys(draftRecords);
    if (keys.length === 0) return alert('Nenhuma falta ou abono marcado para salvar.');

    setIsSavingPlanilha(true);
    const { data: userData } = await supabase.auth.getUser();

    const recordsToInsert = keys.map(studentId => {
      const data = draftRecords[studentId];
      let finalReason = data.reason;
      if (data.authorizedBy && data.authorizedBy.trim()) {
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
      alert('Erro ao salvar lançamentos: ' + error.message);
    } else {
      alert(`${recordsToInsert.length} lançamentos salvos com sucesso!`);
      setDraftRecords({});
      fetchAbsences();
    }
    setIsSavingPlanilha(false);
  };

  const draftFaltasCount = Object.values(draftRecords).filter(r => r.type === 'FALTA_JUSTIFICADA').length;
  const draftAbonosCount = Object.values(draftRecords).filter(r => r.type === 'ABONO').length;
  const draftTotalCount = Object.keys(draftRecords).length;

  // ── Import Actions (PapaParse) ─────────────────────────────────────────────
  const getRowValue = (row: any, keys: string[]) => {
    const normalizedKeys = keys.map(k => normalizeText(k));
    const entries = Object.entries(row || {});

    for (const [key, value] of entries) {
      const normalizedKey = normalizeText(key);
      if (normalizedKeys.some(k => normalizedKey === k || normalizedKey.includes(k) || k.includes(normalizedKey))) {
        const trimmed = String(value ?? '').trim();
        if (trimmed !== '') return trimmed;
      }
    }

    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
  };

  const getDisplayRowValue = (row: any, keys: string[]) => {
    const value = getRowValue(row, keys);
    return value || '—';
  };

  const normalizeText = (value: string | null | undefined) => {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  const parseImportDate = (row: any) => {
    const rawDate = getRowValue(row, ['Data', 'Dia', 'Data da Falta', 'Data do Registro', 'DATA', 'Data do Lançamento', 'Data da Ausência']);
    if (!rawDate) return '';

    const cleaned = String(rawDate).trim();
    const directDate = cleaned.replace(/\s+/g, '');
    const parts = directDate.split(/[\/\-]/);

    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const [year, month, day] = parts;
        const iso = `${year}-${month}-${day}`;
        return isNaN(Date.parse(iso)) ? '' : iso;
      }

      if (parts[0].length === 2 && parts[1].length === 2) {
        const [day, month, year] = parts;
        const iso = `${year}-${month}-${day}`;
        return isNaN(Date.parse(iso)) ? '' : iso;
      }
    }

    const parsed = new Date(cleaned);
    return Number.isNaN(parsed.getTime()) ? '' : format(parsed, 'yyyy-MM-dd');
  };

  const parseImportType = (row: any): 'FALTA_JUSTIFICADA' | 'ABONO' => {
    const rawType = getRowValue(row, ['Tipo', 'Tipo de Registro', 'Status', 'Motivo', 'ABONO', 'Abono', 'Falta', 'FALTA', 'Tipo de Falta', 'Status do Registro']);
    const normalizedType = normalizeText(rawType);

    if (normalizedType.includes('abono') || ['sim', 's', 'x', '1', 'yes', 'true'].includes(normalizedType)) {
      return 'ABONO';
    }

    if (normalizedType.includes('falta') || normalizedType.includes('justificada') || normalizedType.includes('nao') || normalizedType.includes('não')) {
      return 'FALTA_JUSTIFICADA';
    }

    return 'FALTA_JUSTIFICADA';
  };

  const getImportReason = (row: any) => {
    const reasonParts = [
      getRowValue(row, ['Motivo', 'Justificativa', 'Justificativa da Falta', 'Mensagem da Direção', 'Mensagem da direcao', 'Mensagem', 'Observação', 'Observacao', 'Descrição', 'Descricao']),
      getRowValue(row, ['MENSAGEM DA DIREÇÃO', 'Mensagem da Dirección', 'Mensagem da direção']),
      getRowValue(row, ['Autorizado por', 'AUTORIZADO POR', 'Autorizado Por', 'Autoriza', 'Responsável']),
    ].filter(Boolean);

    if (reasonParts.length === 0) return null;
    return reasonParts.join(' | ');
  };

  const handleCreateMissingStudent = async (row: ImportRow) => {
    const rawName = getRowValue(row, ['Aluno', 'Nome', 'Nome Completo', 'Nome do Aluno', 'NOME']);
    const rawMatricula = getRowValue(row, ['Matrícula', 'Matricula', 'RM', 'Matrícula (RM)', 'RM Aluno', 'MATRICULA', 'RM ALUNO']);
    const rawGrade = getRowValue(row, ['Turma', 'Série/Turma', 'Serie/Turma', 'Grade', 'Curso', 'CURSO']);

    const fullName = rawName || window.prompt('Digite o nome completo do aluno para cadastrar:')?.trim();
    if (!fullName) return;

    let enrollmentId = rawMatricula || window.prompt('Digite a matrícula do aluno:', rawMatricula || '')?.trim();
    if (!enrollmentId) return alert('A matrícula é obrigatória para cadastrar o aluno.');

    const grade = rawGrade || window.prompt('Digite a turma/série do aluno:', rawGrade || '')?.trim() || '';

    try {
      const photoUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}&backgroundColor=random`;
      const { error } = await supabase.from('students').insert({
        full_name: fullName,
        enrollment_id: enrollmentId,
        grade,
        photo_url: photoUrl,
        is_authorized: true,
        qr_code_id: `QR-${enrollmentId}-${Date.now().toString().slice(-4)}`
      });

      if (error) throw error;

      await fetchAllStudents();
      alert('Aluno cadastrado com sucesso e agora pode ser importado.');
      const nextRows = importValidation.map(item => item.row === row ? { ...item, status: 'VALID', errorReason: '', studentId: null } : item);
      setImportValidation(nextRows);
      validateImportData(nextRows.map(item => item.row));
    } catch (error: any) {
      alert('Erro ao cadastrar aluno: ' + error.message);
    }
  };

  const parseImportFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    const cleanRows = (rows: Record<string, any>[]) => {
      return rows.filter(row => {
        const values = Object.values(row || {}).map(v => String(v ?? '').trim());
        return values.some(v => v !== '');
      });
    };

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = cleanRows(results.data as Record<string, any>[]);
          validateImportData(rows as ImportRow[]);
        },
        error: (err: any) => alert('Erro ao ler CSV: ' + err.message)
      });
      return;
    }

    if (extension === 'xlsx' || extension === 'xls') {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows.length) {
          alert('Arquivo Excel vazio.');
          return;
        }

        const headerIndex = rows.findIndex(row => row.some((cell: any) => {
          const normalized = normalizeText(cell);
          return normalized.includes('aluno') || normalized.includes('nome') || normalized.includes('matri') || normalized.includes('data');
        }));

        const baseIndex = headerIndex === -1 ? 0 : headerIndex;
        const headers = (rows[baseIndex] || []).map((header: any) => String(header ?? '').trim());
        const dataRows = rows.slice(baseIndex + 1).filter(row => row.some(cell => String(cell ?? '').trim() !== ''));

        const mappedRows = dataRows.map((row) => {
          const rowObject: Record<string, string> = {};
          headers.forEach((header, idx) => {
            rowObject[header] = row[idx] ?? '';
          });
          return rowObject as ImportRow;
        }).filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''));

        validateImportData(mappedRows);
      } catch (error: any) {
        alert('Erro ao ler Excel: ' + error.message);
      }
      return;
    }

    alert('Formato de arquivo não suportado. Envie CSV, XLS ou XLSX.');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseImportFile(e.dataTransfer.files[0]);
    }
  };

  const validateImportData = (rows: ImportRow[]) => {
    const validations: ImportValidationResult[] = rows.map(row => {
      const matricula = getRowValue(row, ['Matrícula', 'Matricula', 'RM', 'Matrícula (RM)', 'RM Aluno', 'MATRICULA', 'RM ALUNO']);
      const studentName = getRowValue(row, ['Aluno', 'Nome', 'Nome Completo', 'Nome do Aluno', 'NOME']);

      const matchStudent = (value: string) => {
        const normalizedValue = normalizeText(value).replace(/[^a-z0-9]/g, '');
        return allStudents.find(s => {
          const normalizedEnrollment = normalizeText(s.enrollment_id).replace(/[^a-z0-9]/g, '');
          const normalizedName = normalizeText(s.full_name).replace(/[^a-z0-9]/g, '');
          return normalizedEnrollment === normalizedValue || normalizedName === normalizedValue;
        });
      };

      const studentByMatricula = matricula ? matchStudent(matricula) : null;
      const studentByName = !studentByMatricula && studentName ? matchStudent(studentName) : null;
      const student = studentByMatricula || studentByName;

      let status: 'VALID' | 'ERROR' = 'VALID';
      let errorReason = '';

      if (!student) {
        const hasStudentIdentifier = !!(studentName || matricula);
        status = 'ERROR';
        errorReason = hasStudentIdentifier
          ? 'Aluno não cadastrado. Cadastre antes ou use o cadastro rápido.'
          : 'Dados incompletos: informe nome ou matrícula do aluno.';
      }

      const parsedDate = parseImportDate(row);
      if (!parsedDate) {
        status = 'ERROR';
        errorReason = errorReason ? `${errorReason}; Data inválida` : 'Data inválida';
      }

      const parsedType = parseImportType(row);
      const parsedSynced = getRowValue(row, ['Status Sigeduc', 'Sigeduc', 'Status do Sigeduc', 'LANÇAMENTO NO SIGEDUC', 'Lançamento no Sigeduc', 'Status do Sigeduc']).toLowerCase().includes('baixado') ||
        ['sim', 's', '1', 'yes', 'baixado', 'enviado', 'sincronizado', 'ok'].includes(normalizeText(getRowValue(row, ['Status Sigeduc', 'Sigeduc', 'Status do Sigeduc', 'LANÇAMENTO NO SIGEDUC', 'Lançamento no Sigeduc', 'Status do Sigeduc'])));

      return {
        row,
        studentId: student?.id || null,
        status,
        errorReason,
        parsedDate,
        parsedType,
        parsedSynced
      };
    });

    setImportValidation(validations);
  };

  const confirmImport = async () => {
    const validRows = importValidation.filter(v => v.status === 'VALID' && v.studentId);
    if (validRows.length === 0) return alert('Não há registros válidos para importar.');

    setIsImporting(true);
    const { data: userData } = await supabase.auth.getUser();

    const recordsToInsert = validRows.map(v => ({
      student_id: v.studentId,
      type: v.parsedType,
      date: v.parsedDate,
      reason: getImportReason(v.row),
      sigeduc_synced: v.parsedSynced,
      created_by: userData.user?.id
    }));

    const { error } = await supabase.from('student_absences').insert(recordsToInsert);
    if (error) {
      alert('Erro ao importar: ' + error.message);
    } else {
      alert(`${recordsToInsert.length} registros importados com sucesso!`);
      setImportValidation([]);
      setActiveTab('historico');
      fetchAbsences();
    }
    setIsImporting(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 px-4 md:px-10 py-6 md:py-8 min-h-screen pb-40 relative bg-gray-50 dark:bg-zinc-900 transition-colors">
      
      {/* ── TIMELINE MODAL ── */}
      {selectedTimelineStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-700 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-700 flex items-center justify-center">
                  {absences.find(a => a.student_id === selectedTimelineStudent.id)?.students?.photo_url ? (
                    <img
                      src={absences.find(a => a.student_id === selectedTimelineStudent.id)?.students?.photo_url}
                      alt={selectedTimelineStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-200">
                      {getStudentInitials(selectedTimelineStudent.name)}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Linha do Tempo</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedTimelineStudent.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTimelineStudent(null)} className="p-2 bg-gray-200 dark:bg-zinc-700 rounded-full hover:bg-gray-300 transition-colors">
                <span className="material-symbols-outlined text-sm dark:text-white">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {absences.filter(a => a.student_id === selectedTimelineStudent.id).length === 0 ? (
                <p className="text-center text-gray-500">Nenhum registro encontrado no período filtrado.</p>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {absences
                    .filter(a => a.student_id === selectedTimelineStudent.id)
                    .map((a, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${a.type === 'ABONO' ? 'bg-teal-500' : 'bg-amber-500'}`}>
                           <span className="material-symbols-outlined text-white text-sm">{a.type === 'ABONO' ? 'medical_services' : 'event_busy'}</span>
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <time className="text-xs font-bold text-gray-500 dark:text-gray-400">{format(parseISO(a.date), 'dd/MM/yyyy')}</time>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.type === 'ABONO' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>{a.type === 'ABONO' ? 'Abono' : 'Falta'}</span>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{a.reason || 'Sem justificativa detalhada.'}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {quickAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 bg-white/20 flex items-center justify-center shrink-0">
                  {allStudents.find(s => s.id === quickAddStudent.id)?.photo_url ? (
                    <img src={allStudents.find(s => s.id === quickAddStudent.id)?.photo_url} alt={quickAddStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{getStudentInitials(quickAddStudent.name)}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">Registrar rápido</h3>
                  <p className="text-sm text-emerald-50">{quickAddStudent.name}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Data
                  <input type="date" value={quickAddDraft.date} onChange={e => setQuickAddDraft(prev => ({ ...prev, date: e.target.value }))} className="mt-1 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
                </label>

                <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                  Tipo
                  <select value={quickAddDraft.type} onChange={e => setQuickAddDraft(prev => ({ ...prev, type: e.target.value as 'FALTA_JUSTIFICADA' | 'ABONO' }))} className="mt-1 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200">
                    <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                    <option value="ABONO">Abono</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Autorizado por
                <input type="text" value={quickAddDraft.authorizedBy} onChange={e => setQuickAddDraft(prev => ({ ...prev, authorizedBy: e.target.value }))} placeholder="Nome da pessoa responsável" className="mt-1 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
              </label>

              <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">
                Motivo / Observação
                <textarea value={quickAddDraft.reason} onChange={e => setQuickAddDraft(prev => ({ ...prev, reason: e.target.value }))} rows={4} placeholder="Descreva o motivo do registro..." className="mt-1 w-full border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white rounded-xl px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-emerald-200" />
              </label>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/60">
              <button onClick={() => setQuickAddStudent(null)} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleQuickAddSave} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm">
                Salvar registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 md:mb-8">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-amber-500 p-[1px] shadow-lg shadow-emerald-500/10">
          <div className="rounded-[15px] bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.2em] mb-2">Controle Operacional</p>
                <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-gray-900 dark:text-white tracking-tight">Faltas Justificadas e Abonos</h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium mt-1 text-sm">Painel rápido para acompanhamento, validação e registro diário.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">event_busy</span>
                  {faltasCount} faltas
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">medical_services</span>
                  {abonosCount} abonos
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 text-xs font-bold">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {pendentesCount} pendentes
                </span>
              </div>
            </div>

            <div className="mt-4 flex bg-slate-100/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('importacao')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'importacao' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                Importar
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'historico' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">history</span>
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('diario')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'diario' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">summarize</span>
                Resumo
              </button>
              <button
                onClick={() => setActiveTab('relatorios')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'relatorios' ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">analytics</span>
                Relatórios
              </button>
              <button
                onClick={() => setActiveTab('planilha')}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold transition-all flex-1 ${activeTab === 'planilha' ? 'bg-teal-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-zinc-700'}`}
              >
                <span className="material-symbols-outlined text-[18px]">today</span>
                Diário
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── DASHBOARD VIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div ref={dashboardRef} className="space-y-6">
          <div className="flex justify-between items-center bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700">
             <div className="flex gap-4 items-center">
               <span className="font-bold text-gray-700 dark:text-gray-300">Período:</span>
               <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 dark:border-zinc-600 p-2 rounded-lg text-sm outline-none bg-white dark:bg-zinc-900 dark:text-white"/>
               <span className="text-gray-400">até</span>
               <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 dark:border-zinc-600 p-2 rounded-lg text-sm outline-none bg-white dark:bg-zinc-900 dark:text-white"/>
             </div>
             <button onClick={handleExportPDF} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span> Gerar Relatório (PDF)
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-gradient-to-br from-white to-yellow-50 dark:from-zinc-800 dark:to-zinc-800 p-5 rounded-2xl shadow-sm border border-yellow-100 dark:border-zinc-700 flex items-center justify-between relative overflow-hidden">
                <div>
                  <p className="text-xs font-bold text-yellow-700 dark:text-yellow-300 uppercase tracking-[0.18em]">Pendentes</p>
                  <p className="text-4xl font-black text-yellow-600 mt-2">{pendentesCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sigeduc</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                  <span className="material-symbols-outlined text-3xl">schedule</span>
                </div>
             </div>
             <div className="bg-gradient-to-br from-white to-amber-50 dark:from-zinc-800 dark:to-zinc-800 p-5 rounded-2xl shadow-sm border border-amber-100 dark:border-zinc-700 flex items-center justify-between relative overflow-hidden">
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-[0.18em]">Faltas</p>
                  <p className="text-4xl font-black text-amber-600 mt-2">{faltasCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Justificadas</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <span className="material-symbols-outlined text-3xl">event_busy</span>
                </div>
             </div>
             <div className="bg-gradient-to-br from-white to-emerald-50 dark:from-zinc-800 dark:to-zinc-800 p-5 rounded-2xl shadow-sm border border-emerald-100 dark:border-zinc-700 flex items-center justify-between relative overflow-hidden">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-[0.18em]">Abonos</p>
                  <p className="text-4xl font-black text-emerald-600 mt-2">{abonosCount}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registrados</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <span className="material-symbols-outlined text-3xl">medical_services</span>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 h-80 flex flex-col">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">Proporção: Faltas vs Abonos</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartDataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {chartDataPie.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 h-80 flex flex-col">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-4">Top 5 Turmas com Ausências</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataBar} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" fontSize={10} stroke="#888"/>
                      <YAxis allowDecimals={false} fontSize={10} stroke="#888" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="Faltas" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="Abonos" stackId="a" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Top 5 Alunos com mais registros</h3>
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Recorrência</span>
            </div>

            <div className="space-y-3">
              {topStudentsData.map((student, index) => (
                <div key={`${student.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/60 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-black text-xs">#{index + 1}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{student.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{student.faltas} faltas · {student.abonos} abonos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900 dark:text-white">{student.total}</p>
                    <p className="text-[10px] uppercase text-gray-500">registros</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORTACAO VIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'importacao' && (
        <div className="bg-white dark:bg-zinc-800 p-6 md:p-10 rounded-2xl shadow-lg border border-gray-100 dark:border-zinc-700 min-h-[500px]">
           <div className="mb-6">
             <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
               <span className="material-symbols-outlined">upload_file</span>
               Importação Inteligente (CSV)
             </h3>
             <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Arraste seu arquivo CSV, XLS ou XLSX exportado para cá. Nós faremos a validação por nome ou matrícula antes de salvar.</p>
           </div>

           {importValidation.length === 0 ? (
             <div 
               className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-700'}`}
               onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
             >
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 rounded-full shadow-sm flex items-center justify-center mb-4">
                   <span className="material-symbols-outlined text-indigo-500 text-3xl">cloud_upload</span>
                </div>
                <p className="font-bold text-gray-700 dark:text-gray-200 text-lg mb-2">Arraste e solte o arquivo Excel ou CSV</p>
                <p className="text-gray-400 text-sm mb-6">ou clique para selecionar manualmente</p>
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors shadow-sm">
                   Procurar Arquivo
                   <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => e.target.files && parseImportFile(e.target.files[0])} />
                </label>
             </div>
           ) : (
             <div>
                <div className="flex justify-between items-center mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
                   <div>
                     <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Preview da Importação</h4>
                     <p className="text-sm text-indigo-700 dark:text-indigo-400">{importValidation.filter(v => v.status === 'VALID').length} de {importValidation.length} registros válidos.</p>
                   </div>
                   <div className="flex gap-3">
                     <button onClick={() => setImportValidation([])} className="px-4 py-2 bg-white dark:bg-zinc-700 text-gray-600 dark:text-gray-200 rounded-lg font-bold border border-gray-200 dark:border-zinc-600 hover:bg-gray-50">Cancelar</button>
                     <button onClick={confirmImport} disabled={isImporting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                       {isImporting ? 'Salvando...' : 'Confirmar e Salvar'}
                       {!isImporting && <span className="material-symbols-outlined text-sm">save</span>}
                     </button>
                   </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-zinc-700 rounded-xl shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Status</th>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Data</th>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Aluno (CSV)</th>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Matrícula</th>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Tipo</th>
                        <th className="px-4 py-3 font-bold border-b dark:border-zinc-700">Problema</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                      {importValidation.map((row, i) => (
                        <tr key={i} className={row.status === 'ERROR' ? 'bg-red-50/50 dark:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800'}>
                          <td className="px-4 py-2 text-center">
                            {row.status === 'VALID' ? (
                              <span className="material-symbols-outlined text-emerald-500 font-bold">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-red-500 font-bold" title={row.errorReason}>error</span>
                            )}
                          </td>
                          <td className="px-4 py-2 dark:text-gray-300">{row.parsedDate || getDisplayRowValue(row.row, ['Data', 'Dia', 'Data da Falta', 'Data do Registro', 'DATA', 'Data do Lançamento', 'Data da Ausência'])}</td>
                          <td className="px-4 py-2 dark:text-gray-300">{getDisplayRowValue(row.row, ['Aluno', 'Nome', 'Nome Completo', 'Nome do Aluno', 'NOME', 'ALUNO'])}</td>
                          <td className="px-4 py-2 font-mono text-xs dark:text-gray-400">{getDisplayRowValue(row.row, ['Matrícula', 'Matricula', 'RM', 'Matrícula (RM)', 'RM Aluno', 'MATRICULA', 'RM ALUNO'])}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.parsedType === 'ABONO' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                               {row.parsedType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-red-600 text-xs font-bold">
                            {row.errorReason && row.errorReason.includes('Aluno não cadastrado') ? (
                              <div className="flex flex-col items-start gap-2">
                                <span>{row.errorReason}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCreateMissingStudent(row.row)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                                >
                                  Cadastrar aluno
                                </button>
                              </div>
                            ) : (
                              row.errorReason
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
           )}
        </div>
      )}

      {/* ── HISTORICO VIEW ─────────────────────────────────────────────────── */}
      {activeTab === 'historico' && (
        <>
          <div className="mb-4 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou matrícula..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none shadow-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white px-3 py-2.5 rounded-xl text-sm outline-none shadow-sm"/>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 dark:text-white px-3 py-2.5 rounded-xl text-sm outline-none shadow-sm"/>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                {pendentesCount > 0 && filterSigeduc === 'PENDING' && (
                  <button onClick={handleBatchSyncSigeduc} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-sm">done_all</span> Sincronizar
                  </button>
                )}
                <button onClick={handleExportCSV} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-sm">download</span> CSV
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-slate-50/80 dark:bg-zinc-800/80 p-3 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterType('ALL')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterType === 'ALL' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Todos</button>
                <button onClick={() => setFilterType('FALTA_JUSTIFICADA')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterType === 'FALTA_JUSTIFICADA' ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Faltas</button>
                <button onClick={() => setFilterType('ABONO')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterType === 'ABONO' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Abonos</button>

                <div className="w-px h-8 bg-gray-300 dark:bg-zinc-600 mx-1 hidden md:block"></div>

                <button onClick={() => setFilterSigeduc('ALL')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterSigeduc === 'ALL' ? 'bg-gray-100 dark:bg-zinc-700 text-gray-800 dark:text-white border-gray-300 dark:border-zinc-600 shadow-inner' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Todos</button>
                <button onClick={() => setFilterSigeduc('PENDING')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterSigeduc === 'PENDING' ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Pendentes</button>
                <button onClick={() => setFilterSigeduc('SYNCED')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterSigeduc === 'SYNCED' ? 'bg-green-600 text-white border-green-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Baixados</button>

                <div className="w-px h-8 bg-gray-300 dark:bg-zinc-600 mx-1 hidden md:block"></div>

                <button onClick={() => setFilterStatus('ALL')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterStatus === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Todos</button>
                <button onClick={() => setFilterStatus('PENDENTE')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterStatus === 'PENDENTE' ? 'bg-yellow-500 text-white border-yellow-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Pendentes</button>
                <button onClick={() => setFilterStatus('EM_ANALISE')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterStatus === 'EM_ANALISE' ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Em análise</button>
                <button onClick={() => setFilterStatus('VALIDADA')} className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors ${filterStatus === 'VALIDADA' ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-zinc-700 hover:bg-gray-50'}`}>Validadas</button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Turma</label>
                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 rounded-xl px-3 py-2 text-sm outline-none shadow-sm">
                  <option value="ALL">Todas</option>
                  {allGrades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-700 px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                {filteredAbsences.filter(a => a.type === 'FALTA_JUSTIFICADA').length} faltas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-zinc-700 px-2.5 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                {filteredAbsences.filter(a => a.type === 'ABONO').length} abonos
              </span>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-x-auto">
             <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Data</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Aluno</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-center">Tipo</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-center">Sigeduc</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300">Motivo / Auditoria</th>
                    <th className="px-4 py-3 font-bold text-gray-600 dark:text-gray-300 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                  {filteredAbsences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Nenhum registro encontrado.</td>
                    </tr>
                  ) : filteredAbsences.map(r => {
                    const isEditing = editingRowId === r.id;

                    return (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                          {format(parseISO(r.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-100 dark:border-zinc-700 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                               {r.students?.photo_url ? (
                                 <img src={r.students.photo_url} alt={r.students.full_name || 'Aluno'} className="w-full h-full object-cover" />
                               ) : (
                                 <span className="text-[10px] font-bold text-gray-600 dark:text-gray-200">
                                   {getStudentInitials(r.students?.full_name)}
                                 </span>
                               )}
                             </div>
                             <div>
                               <button 
                                 onClick={() => setSelectedTimelineStudent({ id: r.student_id, name: r.students?.full_name || '' })} 
                                 className="font-bold text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-indigo-300 underline-offset-2 transition-colors text-left"
                                 title="Ver Linha do Tempo"
                               >
                                 {r.students?.full_name}
                               </button>
                               <div className="text-xs text-gray-500 dark:text-gray-400">{r.students?.grade} - {r.students?.enrollment_id}</div>
                             </div>
                           </div>
                           {recurrentStudents.has(r.student_id) && (
                             <div className="flex gap-1 mt-2">
                               <span className="flex items-center text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded border border-red-200" title="Mais de 3 registros nos últimos 30 dias">
                                 <span className="material-symbols-outlined text-[12px] mr-0.5">warning</span> Reincidente
                               </span>
                               <button onClick={() => generateWhatsAppMessage(r.students?.full_name || '')} className="flex items-center text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200 hover:bg-green-200 transition-colors" title="Notificar via WhatsApp">
                                 <span className="material-symbols-outlined text-[12px] mr-0.5">chat</span> Notificar
                               </button>
                             </div>
                           )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <select 
                              value={editDraft.type} 
                              onChange={e => setEditDraft({...editDraft, type: e.target.value as any})}
                              className="w-full min-w-[100px] border border-gray-300 rounded px-2 py-1 text-xs dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none"
                            >
                              <option value="FALTA_JUSTIFICADA">Falta</option>
                              <option value="ABONO">Abono</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${r.type === 'ABONO' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.type === 'ABONO' ? 'Abono' : 'Falta'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button 
                              onClick={() => handleToggleSigeduc(r.id, r.sigeduc_synced)} 
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${r.sigeduc_synced ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                            >
                              {r.sigeduc_synced ? 'Baixado' : 'Pendente'}
                            </button>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getAbsenceStatus(r) === 'VALIDADA' ? 'bg-emerald-100 text-emerald-700' : getAbsenceStatus(r) === 'EM_ANALISE' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {getAbsenceStatus(r)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input 
                              type="text" 
                              value={editDraft.reason} 
                              onChange={e => setEditDraft({...editDraft, reason: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-xs dark:bg-zinc-700 dark:border-zinc-600 dark:text-white outline-none"
                              placeholder="Motivo..."
                            />
                          ) : (
                            <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={r.reason || 'Sem motivo'}>{r.reason || '-'}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                           {isEditing ? (
                             <div className="flex gap-1 justify-center">
                               <button onClick={() => saveEditing(r.id)} className="text-green-600 hover:text-green-800 transition-colors p-1 bg-green-50 rounded shadow-sm" title="Salvar">
                                 <span className="material-symbols-outlined text-[18px]">check</span>
                               </button>
                               <button onClick={() => setEditingRowId(null)} className="text-gray-600 hover:text-gray-800 transition-colors p-1 bg-gray-100 rounded shadow-sm" title="Cancelar">
                                 <span className="material-symbols-outlined text-[18px]">close</span>
                               </button>
                             </div>
                           ) : (
                             <div className="flex gap-1 justify-center">
                               <button onClick={() => setQuickAddStudent({ id: r.student_id, name: r.students?.full_name || '', grade: r.students?.grade || undefined })} className="text-emerald-500 hover:text-emerald-700 transition-colors p-1 bg-emerald-50 rounded shadow-sm" title="Registrar rápido">
                                 <span className="material-symbols-outlined text-[18px]">add_circle</span>
                               </button>
                               <button onClick={() => startEditing(r)} className="text-blue-500 hover:text-blue-700 transition-colors p-1 bg-blue-50 rounded shadow-sm" title="Editar">
                                 <span className="material-symbols-outlined text-[18px]">edit</span>
                               </button>
                               <button onClick={() => handleDelete(r.id, r.students?.full_name||'')} className="text-red-400 hover:text-red-600 transition-colors p-1 bg-red-50 rounded shadow-sm" title="Excluir">
                                 <span className="material-symbols-outlined text-[18px]">delete</span>
                               </button>
                             </div>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
             </table>
          </div>
        </>
      )}

      {/* ── RESUMO (DIARIO) ─────────────────────────────────────────────────── */}
      {activeTab === 'diario' && (
        <div className="bg-white/80 dark:bg-zinc-800/80 backdrop-blur p-6 rounded-2xl border border-gray-200 dark:border-zinc-700 shadow-sm overflow-x-auto">
          <h3 className="text-lg font-bold mb-4 text-primary dark:text-indigo-400">Resumo Diário de Registros</h3>
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-[#1F4E79] dark:bg-indigo-900 text-white">
              <tr>
                <th className="px-4 py-2 border border-gray-300 dark:border-zinc-700">Data</th>
                <th className="px-4 py-2 border border-gray-300 dark:border-zinc-700 text-center">Faltas</th>
                <th className="px-4 py-2 border border-gray-300 dark:border-zinc-700 text-center">Abonos</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(filteredAbsences.reduce((acc, rec) => {
                const d = format(parseISO(rec.date), 'yyyy-MM-dd');
                if (!acc[d]) acc[d] = { faltas: 0, abonos: 0 };
                if (rec.type === 'FALTA_JUSTIFICADA') acc[d].faltas += 1;
                else if (rec.type === 'ABONO') acc[d].abonos += 1;
                return acc;
              }, {} as Record<string, { faltas: number; abonos: number }>)).map(([date, counts]) => (
                <tr key={date} className="border-b border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800">
                  <td className="px-4 py-2 border border-gray-300 dark:border-zinc-700 font-medium dark:text-gray-300">{format(parseISO(date), 'dd/MM/yyyy')}</td>
                  <td className="px-4 py-2 border border-gray-300 dark:border-zinc-700 text-center text-amber-600 font-bold">{counts.faltas}</td>
                  <td className="px-4 py-2 border border-gray-300 dark:border-zinc-700 text-center text-teal-600 font-bold">{counts.abonos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── RELATÓRIOS ───────────────────────────────────────────────────── */}
      {activeTab === 'relatorios' && (
        <div ref={reportRef} className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">Relatórios</p>
                <h3 className="mt-2 text-xl font-extrabold text-gray-900 dark:text-white">Resumo executivo</h3>
              </div>
              <button onClick={handleExportReportPDF} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm">
                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Faltas</p>
              <p className="mt-3 text-3xl font-black text-amber-700">{faltasCount}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Abonos</p>
              <p className="mt-3 text-3xl font-black text-emerald-700">{abonosCount}</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-700">Pendentes</p>
              <p className="mt-3 text-3xl font-black text-yellow-700">{pendentesCount}</p>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Reincidentes</p>
              <p className="mt-3 text-3xl font-black text-violet-700">{recurrentStudents.size}</p>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 p-5 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Distribuição por turma</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300">Turma</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Faltas</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Abonos</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportByGrade.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">Sem registros no período.</td></tr>
                    ) : (
                      reportByGrade.map(item => (
                        <tr key={item.grade} className="border-b border-gray-100 dark:border-zinc-700">
                          <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-200">{item.grade}</td>
                          <td className="px-3 py-2 text-center text-amber-600 font-bold">{item.faltas}</td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-bold">{item.abonos}</td>
                          <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-gray-200">{item.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 p-5 shadow-sm">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top alunos</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50">
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300">Aluno</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Faltas</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Abonos</th>
                      <th className="px-3 py-2 font-bold text-gray-600 dark:text-gray-300 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportByStudent.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">Sem registros no período.</td></tr>
                    ) : (
                      reportByStudent.map(item => (
                        <tr key={item.student} className="border-b border-gray-100 dark:border-zinc-700">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-700 dark:text-gray-200">{item.student}</div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.grade}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-amber-600 font-bold">{item.faltas}</td>
                          <td className="px-3 py-2 text-center text-emerald-600 font-bold">{item.abonos}</td>
                          <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-gray-200">{item.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLANILHA ─────────────────────────────────────────────────── */}
      {activeTab === 'planilha' && (
        <div className="w-full">
          <div className="flex flex-col md:flex-row bg-[#00A859] p-1 border-b-4 border-[#00703C] mb-4 shadow-md rounded-t-xl">
            <div className="bg-white/10 p-2 md:p-4 text-white flex-1 flex flex-col md:flex-row items-center justify-between border-r border-white/20">
               <div>
                  <h3 className="font-bold text-lg uppercase tracking-wider">Status dos Lançamentos</h3>
                  <p className="text-xs text-white/80">Controle Diário de Turma</p>
               </div>
               
               <div className="flex gap-2 mt-2 md:mt-0">
                  <div className="bg-white px-2 py-1 rounded text-gray-700 text-xs font-bold flex items-center shadow-sm border border-emerald-100">
                    Data:
                    <input type="date" value={planilhaDate} onChange={e => setPlanilhaDate(e.target.value)} className="ml-2 border border-gray-200 rounded-md bg-white px-2 py-1 text-gray-700 text-xs font-medium outline-none focus:border-emerald-400"/>
                  </div>
                  <div className="bg-white px-2 py-1 rounded text-gray-700 text-xs font-bold flex items-center shadow-sm border border-emerald-100">
                    Turma:
                    <select value={planilhaGrade} onChange={e => setPlanilhaGrade(e.target.value)} className="ml-2 border border-gray-200 rounded-md bg-white px-2 py-1 text-gray-700 text-xs font-medium outline-none focus:border-emerald-400 cursor-pointer">
                      {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
               </div>
            </div>
            
            <div className="flex bg-[#E6F4EA] divide-x divide-gray-300 rounded-tr-lg">
               <div className="px-6 py-2 text-center flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Total Alunos</p>
                  <p className="text-2xl font-black text-[#00A859]">{planilhaStudents.length}</p>
               </div>
               <div className="px-6 py-2 text-center flex flex-col justify-center bg-amber-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Faltas Marcadas</p>
                  <p className="text-2xl font-black text-amber-600">{draftFaltasCount}</p>
               </div>
               <div className="px-6 py-2 text-center flex flex-col justify-center bg-teal-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Abonos Marcados</p>
                  <p className="text-2xl font-black text-teal-600">{draftAbonosCount}</p>
               </div>
               <div className="px-4 py-2 flex flex-col gap-1 justify-center bg-gray-100 rounded-tr-lg">
                  <button onClick={handleBatchSavePlanilha} disabled={draftTotalCount === 0 || isSavingPlanilha} className="bg-[#00A859] text-white text-xs font-bold px-4 py-1.5 rounded disabled:opacity-50 hover:bg-[#00703C] transition-colors shadow-sm">
                    {isSavingPlanilha ? 'Gravando...' : 'Gravar Dados'}
                  </button>
                  <button onClick={() => setDraftRecords({})} disabled={draftTotalCount === 0} className="bg-white text-red-600 border border-red-200 text-[10px] font-bold px-4 py-1 rounded disabled:opacity-50 hover:bg-red-50">
                    Limpar
                  </button>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 overflow-x-auto shadow-sm rounded-b-xl">
            <table className="w-full text-left border-collapse min-w-[800px] text-xs font-sans">
              <thead>
                <tr className="bg-[#00A859] text-white">
                  <th className="border border-gray-400 px-2 py-2 font-bold text-center w-8">Nº</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold w-20">RM</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold w-[30%]">ALUNO</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold w-40 text-center">STATUS</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold w-48">AUTORIZADO POR</th>
                  <th className="border border-gray-400 px-2 py-2 font-bold">MOTIVO / OBSERVAÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {planilhaStudents.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-zinc-700">Nenhum aluno encontrado para esta turma.</td></tr>
                ) : (
                  planilhaStudents.map((student, index) => {
                    const draft = getDraft(student.id);
                    const hasStatus = !!draft;
                    return (
                      <tr key={student.id} className={`hover:bg-[#E6F4EA] dark:hover:bg-zinc-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-zinc-800' : 'bg-gray-50 dark:bg-zinc-900'}`}>
                        <td className="border border-gray-300 dark:border-zinc-700 px-2 py-1.5 text-center text-gray-500 dark:text-gray-400 font-medium">{index + 1}</td>
                        <td className="border border-gray-300 dark:border-zinc-700 px-2 py-1.5 text-gray-600 dark:text-gray-400 font-mono text-[10px]">{student.enrollment_id}</td>
                        <td className={`border border-gray-300 dark:border-zinc-700 px-2 py-1.5 font-bold ${hasStatus ? 'text-[#00A859]' : 'text-gray-800 dark:text-gray-200'}`}>
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 dark:border-zinc-600 dark:bg-zinc-700 shrink-0 flex items-center justify-center">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] font-bold text-gray-600 dark:text-gray-200">{getStudentInitials(student.full_name)}</span>
                              )}
                            </div>
                            <span className="truncate">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="border border-gray-300 dark:border-zinc-700 p-0 relative bg-white dark:bg-zinc-800">
                          <select value={draft?.type || ''} onChange={(e) => handleDraftTypeChange(student.id, e.target.value)} className={`w-full h-full min-h-[32px] px-2 py-1 border-none outline-none text-xs font-bold cursor-pointer transition-colors ${draft?.type === 'FALTA_JUSTIFICADA' ? 'bg-amber-100 text-amber-800' : draft?.type === 'ABONO' ? 'bg-teal-100 text-teal-800' : 'bg-transparent text-gray-600 dark:text-gray-300'} focus:ring-2 focus:ring-inset focus:ring-[#00A859]`}>
                            <option value="">-- Selecione --</option>
                            <option value="FALTA_JUSTIFICADA">Falta Justificada</option>
                            <option value="ABONO">Abono</option>
                          </select>
                        </td>
                        <td className={`border border-gray-300 dark:border-zinc-700 p-0 transition-colors ${!hasStatus ? 'bg-gray-100 dark:bg-zinc-900' : 'bg-white dark:bg-zinc-800'}`}>
                          <input type="text" value={draft?.authorizedBy || ''} onChange={e => handleDraftAuthorizedByChange(student.id, e.target.value)} disabled={!hasStatus} placeholder={hasStatus ? 'Nome de quem autorizou' : ''} className="w-full h-full min-h-[32px] px-2 py-1 border-none outline-none text-xs bg-transparent dark:text-white disabled:opacity-50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-inset focus:ring-[#00A859]"/>
                        </td>
                        <td className={`border border-gray-300 dark:border-zinc-700 p-0 transition-colors ${!hasStatus ? 'bg-gray-100 dark:bg-zinc-900' : 'bg-white dark:bg-zinc-800'}`}>
                          <input type="text" value={draft?.reason || ''} onChange={e => handleDraftReasonChange(student.id, e.target.value)} disabled={!hasStatus} placeholder={hasStatus ? 'Observações...' : ''} className="w-full h-full min-h-[32px] px-2 py-1 border-none outline-none text-xs bg-transparent dark:text-white disabled:opacity-50 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-inset focus:ring-[#00A859]"/>
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
