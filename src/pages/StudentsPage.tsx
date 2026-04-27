import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ 
    full_name: '', 
    enrollment_id: '', 
    grade: '', 
    photo_url: '',
    cpf: '',
    birth_date: '',
    guardian_name: '',
    guardian_cpf: ''
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, student_authorizations(*)');

    if (error) console.error(error);
    else setStudents(data || []);
    setLoading(false);
  };

  const toggleAuthorization = async (studentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('students')
      .update({ is_authorized: !currentStatus })
      .eq('id', studentId);

    if (error) console.error(error);
    else fetchStudents();
  };

  const handleExportMigrationCSV = () => {
    const authorizedStudents = students.filter(s => s.is_authorized);
    
    // Sort by grade, then by name
    const sortedStudents = [...authorizedStudents].sort((a, b) => {
      const gradeCompare = (a.grade || '').localeCompare(b.grade || '');
      if (gradeCompare !== 0) return gradeCompare;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    const headers = ['Nome Completo', 'Matrícula (RM)', 'Série/Turma', 'CPF', 'Data de Nascimento', 'Nome do Responsável', 'CPF do Responsável', 'Status Autorização'];
    const rows = sortedStudents.map(s => [
      `"${s.full_name || ''}"`,
      `"${s.enrollment_id || ''}"`,
      `"${s.grade || ''}"`,
      `"${s.cpf || ''}"`,
      `"${s.birth_date || ''}"`,
      `"${s.guardian_name || ''}"`,
      `"${s.guardian_cpf || ''}"`,
      s.is_authorized ? 'AUTORIZADO' : 'BLOQUEADO'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Migracao_Alunos_Autorizados_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setNewStudent({ ...newStudent, photo_url: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Generate a simple unique QR Code ID (could be better UUID in prod)
    const qrCodeId = `QR-${newStudent.enrollment_id}-${Date.now().toString().slice(-4)}`;

    // Use uploaded photo or generate placeholder
    const photoUrl = newStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${newStudent.full_name}&backgroundColor=random`;

    const { error } = await supabase.from('students').insert({
      full_name: newStudent.full_name,
      enrollment_id: newStudent.enrollment_id,
      grade: newStudent.grade,
      cpf: newStudent.cpf,
      birth_date: newStudent.birth_date,
      guardian_name: newStudent.guardian_name,
      guardian_cpf: newStudent.guardian_cpf,
      qr_code_id: qrCodeId,
      is_authorized: true,
      photo_url: photoUrl,
    });

    if (error) {
      console.error(error);
      alert('Erro ao cadastrar aluno: ' + error.message);
    } else {
      setShowModal(false);
      setNewStudent({ 
        full_name: '', enrollment_id: '', grade: '', photo_url: '',
        cpf: '', birth_date: '', guardian_name: '', guardian_cpf: ''
      });
      setPhotoPreview(null);
      fetchStudents();
    }
    setSaving(false);
  };

  const handleDownloadTemplate = () => {
    const headers = ['Nome Completo', 'Matrícula (RM)', 'Série/Turma', 'CPF', 'Data de Nascimento', 'Nome do Responsável', 'CPF do Responsável'];
    const example = ['Exemplo Nome', '123456', '3º Ano A', '000.000.000-00', '2005-05-15', 'Responsável Exemplo', '111.111.111-11'];
    
    const csvContent = [headers.join(','), example.map(v => `"${v}"`).join(',')].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Modelo_Importacao_Alunos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array of arrays
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        if (rows.length < 2) {
          alert('O arquivo parece estar vazio ou não possui dados suficientes.');
          setImporting(false);
          return;
        }

        const normalize = (str: any) => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        // Find the header row (scan first 10 rows for keywords)
        let headerRowIndex = 0;
        let maxScore = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowText = rows[i].map(normalize).join(' ');
          let score = 0;
          if (rowText.includes('nome') || rowText.includes('aluno')) score++;
          if (rowText.includes('rm') || rowText.includes('matri')) score++;
          if (rowText.includes('serie') || rowText.includes('turma')) score++;
          if (rowText.includes('cpf')) score++;
          
          if (score > maxScore) {
            maxScore = score;
            headerRowIndex = i;
          }
        }

        if (maxScore === 0) {
           alert('Não foi possível identificar as colunas no arquivo. Certifique-se de ter colunas de "Nome" e "Matrícula/RM".');
           setImporting(false);
           return;
        }

        // Parse headers to strings and normalize
        let headers = rows[headerRowIndex].map(normalize);
        
        // Fallback for CSVs with semicolons that XLSX might parse as a single column
        if (headers.length === 1 && headers[0].includes(';')) {
          headers = headers[0].split(';').map(h => h.trim());
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
             const rowString = String(rows[i][0] || '');
             rows[i] = rowString.split(';').map(v => v.trim());
          }
        } else if (headers.length === 1 && headers[0].includes(',')) {
          headers = headers[0].split(',').map(h => h.trim());
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
             const rowString = String(rows[i][0] || '');
             rows[i] = rowString.split(',').map(v => v.trim());
          }
        }

        const nameIdx = headers.findIndex(h => (h.includes('nome') || h.includes('aluno')) && !h.includes('respons') && !h.includes('pai') && !h.includes('mae'));
        const rmIdx = headers.findIndex(h => h === 'rm' || h.includes('matri') || h.includes('matricula') || h.includes('cod'));
        const gradeIdx = headers.findIndex(h => h.includes('serie') || h.includes('turma') || h.includes('ano') || h.includes('curso'));
        const cpfIdx = headers.findIndex(h => h === 'cpf' || (h.includes('cpf') && !h.includes('respons') && !h.includes('pai') && !h.includes('mae')));
        const birthIdx = headers.findIndex(h => h.includes('nasc') || h.includes('data'));
        let respCpfIdx = headers.findIndex(h => h.includes('cpf') && (h.includes('respons') || h.includes('pai') || h.includes('mae')));
        let respNameIdx = headers.findIndex((h, idx) => (h.includes('respons') || h.includes('pai') || h.includes('mae')) && idx !== respCpfIdx);
        // Fallback if the strict condition didn't match respNameIdx
        if (respNameIdx === -1) {
            respNameIdx = headers.findIndex((h, idx) => (h.includes('respons') || h.includes('pai') || h.includes('mae')) && idx !== respCpfIdx);
        }

        if (nameIdx === -1 || rmIdx === -1) {
           alert(`Colunas obrigatórias ("Nome" e "Matrícula") não encontradas.\nCabeçalhos lidos pelo sistema:\n${headers.join(' | ')}`);
           setImporting(false);
           return;
        }

        const newStudents = [];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const values = rows[i].map((v: any) => String(v).trim());
          if (!values.join('').trim()) continue; // Skip empty rows
          
          const student: any = {};
          
          const name = values[nameIdx];
          const rm = values[rmIdx];
          
          if (!name || !rm) continue; // Both name and rm are strictly required for a valid row

          student.full_name = name;
          student.enrollment_id = rm;
          
          if (gradeIdx !== -1) student.grade = values[gradeIdx];
          if (cpfIdx !== -1) student.cpf = values[cpfIdx];
          if (birthIdx !== -1) student.birth_date = values[birthIdx];
          if (respNameIdx !== -1) student.guardian_name = values[respNameIdx];
          if (respCpfIdx !== -1) student.guardian_cpf = values[respCpfIdx];

          student.qr_code_id = `QR-${student.enrollment_id}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          student.is_authorized = true;
          student.photo_url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.full_name)}&backgroundColor=random`;
          
          newStudents.push(student);
        }

        if (newStudents.length > 0) {
          const { error } = await supabase.from('students').insert(newStudents);
          if (error) {
            console.error(error);
            alert('Erro ao salvar no banco de dados: ' + error.message);
          } else {
            alert(`${newStudents.length} alunos importados com sucesso!`);
            fetchStudents();
            setShowImportModal(false);
          }
        } else {
          alert('Nenhum aluno foi importado. Verifique se as colunas estão corretas e se as linhas contêm "Nome" e "Matrícula" preenchidos.');
        }
      } catch (error) {
        console.error('File parsing error', error);
        alert('Erro ao ler o arquivo. Verifique se é um arquivo Excel (.xlsx/.xls) ou CSV válido.');
      }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen relative">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70">Administração</p>
          <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Alunos</h2>
          <p className="text-on-surface-variant font-medium mt-1">Controle de autorizações e matrículas</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={handleExportMigrationCSV}
            className="flex-1 lg:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-green-700 border border-green-200"
            title="Exportar alunos autorizados para migração"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Exportar Migração
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex-1 lg:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-secondary"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Importar Dados
          </button>
          <Link 
            to="/exit-report"
            className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-primary"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Relatórios
          </Link>
          <button 
            onClick={() => setShowModal(true)}
            className="flex-1 md:flex-none justify-center bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Novo Aluno
          </button>
        </div>
      </header>

      {/* Student count badge */}
      <div className="mb-6 flex items-center gap-3">
        <div className="glass-card px-4 py-2 rounded-xl inline-flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">group</span>
          <span className="text-xs font-bold text-on-surface-variant">{students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Students List - Responsive: Table for Desktop, Cards for Mobile */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-white/20">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/50 border-b border-white/30">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Aluno</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Matrícula</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30">
              {loading ? (
                <tr><td colSpan={4} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
                  <span className="text-outline font-medium">Carregando alunos...</span>
                </td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
                  <span className="text-outline font-medium">Nenhum aluno cadastrado.</span>
                </td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="hover:bg-white/40 transition-all duration-200 group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={s.photo_url} className="w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm group-hover:shadow-md transition-all" alt="" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${s.is_authorized ? 'bg-tertiary-fixed' : 'bg-error'}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-on-surface text-sm">{s.full_name}</div>
                        <div className="text-[11px] text-outline font-medium">{s.grade}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 font-mono text-xs font-bold text-on-surface-variant">{s.enrollment_id}</td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      s.is_authorized ? 'bg-logo-green/10 text-logo-green' : 'bg-logo-red/10 text-logo-red'
                    }`}>
                      <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>{s.is_authorized ? 'check_circle' : 'block'}</span>
                      {s.is_authorized ? 'Ativo' : 'Bloqueado'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                        className={`text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-all hover:scale-105 flex items-center gap-1.5 ${
                          s.is_authorized 
                            ? 'bg-logo-red/10 text-logo-red hover:bg-logo-red/20' 
                            : 'bg-logo-green/10 text-logo-green hover:bg-logo-green/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{s.is_authorized ? 'lock' : 'lock_open'}</span>
                        {s.is_authorized ? 'Bloquear' : 'Liberar'}
                      </button>
                      <Link 
                        to={`/auth-term/${s.id}`} 
                        className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all hover:scale-105 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">assignment</span>
                        Termo
                      </Link>
                      <Link 
                        to={`/id/${s.id}`} 
                        className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all hover:scale-105 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">id_card</span>
                        Cartão
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-white/30">
          {loading ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
              <span className="text-outline font-medium">Carregando...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
              <span className="text-outline font-medium">Nenhum aluno.</span>
            </div>
          ) : students.map((s) => (
            <div key={s.id} className="p-5 flex flex-col gap-4 bg-white/20 active:bg-white/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={s.photo_url} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.is_authorized ? 'bg-logo-green' : 'bg-logo-red'}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface text-base truncate">{s.full_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-outline font-medium">{s.grade}</span>
                    <span className="w-1 h-1 rounded-full bg-outline/30"></span>
                    <span className="text-xs font-mono font-bold text-outline">#{s.enrollment_id}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  s.is_authorized ? 'bg-logo-green/10 text-logo-green' : 'bg-logo-red/10 text-logo-red'
                }`}>
                  {s.is_authorized ? 'Ativo' : 'Bloq'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    s.is_authorized ? 'bg-logo-red/10 text-logo-red' : 'bg-logo-green/10 text-logo-green'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{s.is_authorized ? 'lock' : 'lock_open'}</span>
                  {s.is_authorized ? 'Bloquear' : 'Liberar'}
                </button>
                <Link 
                  to={`/auth-term/${s.id}`}
                  className="flex-1 py-3 bg-primary/10 text-primary rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">assignment</span>
                  Termo
                </Link>
                <Link 
                  to={`/id/${s.id}`}
                  className="flex-1 py-3 bg-secondary/10 text-secondary rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">id_card</span>
                  Cartão
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL NOVO ALUNO */}
      {showModal && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-4 mb-6 shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-white text-xl">person_add</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Novo Aluno</h3>
                <p className="text-xs text-outline font-medium">Preencha os dados abaixo</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateStudent} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar pb-4 flex-1">
              {/* Photo Upload */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Foto do Aluno</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden" 
                    id="photo-input"
                  />
                  <label htmlFor="photo-input" className="flex items-center justify-center gap-2 w-full py-8 bg-white/30 hover:bg-white/50 border-2 border-dashed border-primary/40 rounded-xl cursor-pointer transition-all hover:border-primary/60">
                    {photoPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                        <span className="text-[10px] font-bold text-primary">Clique para alterar</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-outline/50">camera_alt</span>
                        <span className="text-[10px] font-bold text-outline">Clique ou arraste uma foto</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome Completo</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">person</span>
                  <input 
                    type="text" required
                    value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                    placeholder="Nome do Aluno"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Matrícula (RM)</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">tag</span>
                    <input 
                      type="text" required
                      value={newStudent.enrollment_id} onChange={e => setNewStudent({...newStudent, enrollment_id: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                      placeholder="123456"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Série / Turma</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">class</span>
                    <input 
                      type="text" required
                      value={newStudent.grade} onChange={e => setNewStudent({...newStudent, grade: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                      placeholder="3º Ano A"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">CPF do Aluno</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">badge</span>
                    <input 
                      type="text"
                      value={newStudent.cpf} onChange={e => setNewStudent({...newStudent, cpf: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Data de Nascimento</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">calendar_today</span>
                    <input 
                      type="date"
                      value={newStudent.birth_date} onChange={e => setNewStudent({...newStudent, birth_date: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest px-1">Dados do Responsável</p>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">Nome do Responsável</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">supervisor_account</span>
                    <input 
                      type="text"
                      value={newStudent.guardian_name} onChange={e => setNewStudent({...newStudent, guardian_name: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                      placeholder="Nome do Pai/Mãe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-outline tracking-wider mb-2 ml-3">CPF do Responsável</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 text-lg">fingerprint</span>
                    <input 
                      type="text"
                      value={newStudent.guardian_cpf} onChange={e => setNewStudent({...newStudent, guardian_cpf: e.target.value})}
                      className="w-full pl-12 pr-4 py-3.5 bg-white/50 rounded-xl border border-white/80 focus:ring-2 focus:ring-primary focus:bg-white outline-none transition-all text-on-surface font-medium"
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 glass-card rounded-xl font-bold hover:scale-[1.02] transition-all text-on-surface-variant"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span> Salvando...</>
                  ) : (
                    <><span className="material-symbols-outlined text-base">save</span> Cadastrar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL IMPORTAÇÃO */}
      {showImportModal && (
        <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-secondary to-primary-container rounded-2xl flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">upload_file</span>
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">Importar Alunos</h3>
                <p className="text-xs text-outline font-medium">Use um arquivo Excel (.xlsx, .xls) ou CSV</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Instruções:</p>
                <ul className="text-[10px] text-on-surface-variant space-y-1 font-medium">
                  <li>• O arquivo deve conter cabeçalhos (Nome, RM, Turma, etc)</li>
                  <li>• Formatos aceitos: .xlsx, .xls, .csv</li>
                  <li>• Novos alunos serão autorizados automaticamente</li>
                </ul>
              </div>

              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleImportFile}
                  className="hidden" 
                  id="csv-input"
                />
                <label htmlFor="csv-input" className="flex flex-col items-center justify-center gap-3 w-full py-12 bg-white/30 hover:bg-white/50 border-2 border-dashed border-secondary/40 rounded-3xl cursor-pointer transition-all hover:border-secondary">
                  {importing ? (
                    <span className="material-symbols-outlined text-4xl text-secondary animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-secondary">cloud_upload</span>
                  )}
                  <span className="text-xs font-bold text-secondary">
                    {importing ? 'Importando dados...' : 'Selecionar arquivo Excel ou CSV'}
                  </span>
                </label>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleDownloadTemplate}
                  className="flex-1 py-4 bg-secondary/10 text-secondary rounded-2xl font-bold hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Baixar Modelo CSV
                </button>
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-4 glass-card rounded-2xl font-bold hover:scale-[1.02] transition-all text-on-surface-variant text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
