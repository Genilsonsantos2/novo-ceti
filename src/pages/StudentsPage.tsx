import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { TermDevolutivaModal } from '../components/TermDevolutivaModal';

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [devolutivaStudent, setDevolutivaStudent] = useState<any | null>(null);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'withPhoto' | 'withoutPhoto'>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newStudent, setNewStudent] = useState({ 
    full_name: '', 
    enrollment_id: '', 
    grade: '', 
    photo_url: '',
    cpf: '',
    birth_date: '',
    guardian_name: '',
    guardian_cpf: '',
    exit_type: 'none'
  });
  const [importing, setImporting] = useState(false);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*, student_authorizations(*), term_attachments(id)');

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

    const headers = ['Nome Completo', 'Matrícula (RM)', 'Série/Turma', 'CPF', 'Data de Nascimento', 'Nome do Responsável', 'CPF do Responsável', 'Status AutorizaÃ§Ã£o'];
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

  const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for raw file
        alert('Arquivo muito grande. Por favor, escolha uma imagem menor que 10MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setPhotoPreview(compressed);
        setNewStudent(prev => ({ ...prev, photo_url: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditModal = (student: any) => {
    setEditingStudentId(student.id);
    setNewStudent({
      full_name: student.full_name || '',
      enrollment_id: student.enrollment_id || '',
      grade: student.grade || '',
      cpf: student.cpf || '',
      birth_date: student.birth_date || '',
      guardian_name: student.guardian_name || '',
      guardian_cpf: student.guardian_cpf || '',
      photo_url: student.photo_url || '',
      exit_type: student.exit_type || 'none'
    });
    setPhotoPreview(student.photo_url || null);
    setShowModal(true);
  };

  const closeEditModal = () => {
    setShowModal(false);
    setEditingStudentId(null);
    setNewStudent({
      full_name: '', enrollment_id: '', grade: '', photo_url: '',
      cpf: '', birth_date: '', guardian_name: '', guardian_cpf: '', exit_type: 'none'
    });
    setPhotoPreview(null);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Use uploaded photo or generate placeholder
      const photoUrl = newStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newStudent.full_name)}&backgroundColor=random`;

      if (editingStudentId) {
        const { error } = await supabase.from('students').update({
          full_name: newStudent.full_name,
          enrollment_id: newStudent.enrollment_id,
          grade: newStudent.grade,
          cpf: newStudent.cpf,
          birth_date: newStudent.birth_date,
          guardian_name: newStudent.guardian_name,
          guardian_cpf: newStudent.guardian_cpf,
          photo_url: photoUrl,
          exit_type: newStudent.exit_type
        }).eq('id', editingStudentId);

        if (error) throw error;
        
        alert('Aluno atualizado com sucesso!');
        closeEditModal();
        fetchStudents();
      } else {
        // Generate a simple unique QR Code ID
        const qrCodeId = `QR-${newStudent.enrollment_id}-${Date.now().toString().slice(-4)}`;

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
          exit_type: newStudent.exit_type
        });

        if (error) throw error;
        
        alert('Aluno cadastrado com sucesso!');
        closeEditModal();
        fetchStudents();
      }
    } catch (error: any) {
      console.error('Erro ao salvar aluno:', error);
      alert('Erro ao salvar aluno: ' + (error.message || 'Erro desconhecido. Verifique o console.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['Nome Completo', 'Matrícula (RM)', 'Série/Turma', 'CPF', 'Data de Nascimento', 'Nome do Responsável', 'CPF do Responsável'];
    const example = ['Exemplo Nome', '123456', '3Âº Ano A', '000.000.000-00', '2005-05-15', 'Responsável Exemplo', '111.111.111-11'];
    
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
           alert(`Colunas obrigatÃ³rias ("Nome" e "Matrícula") não encontradas.\nCabeÃ§alhos lidos pelo sistema:\n${headers.join(' | ')}`);
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
          
          if (birthIdx !== -1) {
            let dateStr = values[birthIdx];
            // Format DD/MM/YYYY or D/M/YY to YYYY-MM-DD for PostgreSQL
            if (dateStr.includes('/')) {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                let year = parts[2];
                if (year.length === 2) {
                  // Assume 1900s for 30-99 and 2000s for 00-29
                  year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                }
                dateStr = `${year}-${month}-${day}`;
              }
            }
            // Check if it's a valid date string before sending to DB
            if (!isNaN(Date.parse(dateStr))) {
               student.birth_date = dateStr;
            }
          }

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
          alert('Nenhum aluno foi importado. Verifique se as colunas estÃ£o corretas e se as linhas contÃªm "Nome" e "Matrícula" preenchidos.');
        }
      } catch (error) {
        console.error('File parsing error', error);
        alert('Erro ao ler o arquivo. Verifique se Ã© um arquivo Excel (.xlsx/.xls) ou CSV vÃ¡lido.');
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
            title="Exportar alunos autorizados para migraÃ§Ã£o"
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
            to={`/print-cards${selectedStudents.length > 0 ? `?ids=${selectedStudents.join(',')}` : ''}`}
            className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-primary"
          >
            <span className="material-symbols-outlined text-base">print</span>
            Imprimir Cartões
          </Link>
          <Link 
            to="/print-terms"
            className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-primary"
          >
            <span className="material-symbols-outlined text-base">assignment</span>
            Imprimir Termos
          </Link>
          <Link 
            to="/exit-report"
            className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-primary"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Relatórios
          </Link>
          <button 
            onClick={() => { closeEditModal(); setShowModal(true); }}
            className="flex-1 md:flex-none justify-center bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Novo Aluno
          </button>
        </div>
      </header>

      {/* Toolbar: Filters and Batch Actions */}
      <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-4 rounded-[2rem] border border-white/20">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="glass-card px-4 py-2 rounded-xl inline-flex items-center gap-2 border-none bg-primary/5">
            <span className="material-symbols-outlined text-primary text-base">group</span>
            <span className="text-xs font-bold text-on-surface-variant">{students.length} Total</span>
          </div>

          <div className="flex items-center gap-2 px-3 bg-white/60 rounded-xl border border-gray-200 focus-within:border-primary transition-colors flex-1 md:flex-none min-w-[200px]">
            <span className="material-symbols-outlined text-gray-500 text-sm">search</span>
            <input
              type="text"
              placeholder="Pesquisar aluno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 py-2 w-full outline-none"
            />
          </div>

          <div className="flex items-center gap-2 px-3 bg-white/60 rounded-xl border border-gray-200 focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-gray-500 text-sm">filter_list</span>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 py-2 w-full md:w-auto outline-none cursor-pointer"
            >
              <option value="">Todas as Turmas</option>
              {Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort().map(grade => (
                <option key={grade as string} value={grade as string}>{grade}</option>
              ))}
            </select>
          </div>

          <div className="flex p-1 bg-white/60 rounded-xl border border-gray-200">
            <button 
              onClick={() => setPhotoFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${photoFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setPhotoFilter('withPhoto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${photoFilter === 'withPhoto' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            >
              Com Foto
            </button>
            <button 
              onClick={() => setPhotoFilter('withoutPhoto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${photoFilter === 'withoutPhoto' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            >
              Sem Foto
            </button>
          </div>

          <button 
            onClick={() => {
              const withPhotos = students
                .filter(s => s.photo_url && !s.photo_url.includes('dicebear.com'))
                .map(s => s.id);
              setSelectedStudents(prev => {
                const allSelected = withPhotos.every(id => prev.includes(id));
                if (allSelected) return prev.filter(id => !withPhotos.includes(id));
                return Array.from(new Set([...prev, ...withPhotos]));
              });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all active:scale-95 border border-secondary/20"
          >
            <span className="material-symbols-outlined text-sm">photo_library</span>
            Selecionar todos com foto
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {selectedGrade && (
            <Link 
              to={`/print-terms?grade=${encodeURIComponent(selectedGrade)}`}
              className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl font-bold hover:bg-primary/10 text-primary transition-all active:scale-95 flex items-center gap-2 text-xs border border-primary/20 bg-white/50"
            >
              <span className="material-symbols-outlined text-sm">assignment</span>
              Imprimir Termos ({selectedGrade})
            </Link>
          )}
          <Link 
            to={`/print-cards${selectedStudents.length > 0 ? `?ids=${selectedStudents.join(',')}` : ''}`}
            className="flex-1 md:flex-none justify-center px-4 py-2 rounded-xl font-bold hover:bg-secondary/10 text-secondary transition-all active:scale-95 flex items-center gap-2 text-xs border border-secondary/20 bg-white/50"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            Imprimir Cartões
          </Link>
        </div>
      </div>

      {/* Students List - Responsive: Table for Desktop, Cards for Mobile */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-white/20">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/50 border-b border-white/30">
              <tr>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(students.map(s => s.id));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                    checked={selectedStudents.length === students.length && students.length > 0}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Aluno</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Matrícula</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Termo</th>
                <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/30">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
                  <span className="text-outline font-medium">Carregando alunos...</span>
                </td></tr>
              ) : students.filter(s => {
                const matchesGrade = !selectedGrade || s.grade === selectedGrade;
                const matchesSearch = !searchTerm || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.enrollment_id.includes(searchTerm);
                const hasPhoto = s.photo_url && !s.photo_url.includes('dicebear.com');
                const matchesPhoto = photoFilter === 'all' || (photoFilter === 'withPhoto' ? hasPhoto : !hasPhoto);
                return matchesGrade && matchesSearch && matchesPhoto;
              }).length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
                  <span className="text-outline font-medium">Nenhum aluno encontrado.</span>
                </td></tr>
              ) : students.filter(s => {
                const matchesGrade = !selectedGrade || s.grade === selectedGrade;
                const matchesSearch = !searchTerm || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.enrollment_id.includes(searchTerm);
                const hasPhoto = s.photo_url && !s.photo_url.includes('dicebear.com');
                const matchesPhoto = photoFilter === 'all' || (photoFilter === 'withPhoto' ? hasPhoto : !hasPhoto);
                return matchesGrade && matchesSearch && matchesPhoto;
              }).map((s) => (
                <tr key={s.id} className={`hover:bg-white/40 transition-all duration-200 group ${selectedStudents.includes(s.id) ? 'bg-primary/5' : ''}`}>
                  <td className="px-8 py-5">
                    <input 
                      type="checkbox" 
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => {
                        setSelectedStudents(prev => 
                          prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        );
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img src={s.photo_url} className={`w-11 h-11 rounded-xl object-cover ring-2 ring-white shadow-sm group-hover:shadow-md transition-all ${(!s.photo_url || s.photo_url.includes('dicebear.com')) ? 'opacity-40 grayscale' : ''}`} alt="" />
                        {(!s.photo_url || s.photo_url.includes('dicebear.com')) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-lg" title="Foto Pendente">add_a_photo</span>
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${s.is_authorized ? 'bg-tertiary-fixed' : 'bg-error'}`}></div>
                      </div>
                      <div>
                        <div className="font-bold text-on-surface text-sm notranslate" translate="no">{s.full_name}</div>
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
                    {s.term_attachments && s.term_attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                        <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                        Devolvido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500">
                        <span className="material-symbols-outlined text-xs">history_edu</span>
                        Pendente
                      </span>
                    )}
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
                      {s.term_attachments && s.term_attachments.length > 0 ? (
                        <Link 
                          to={`/id/${s.id}`} 
                          className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all hover:scale-105 flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">id_card</span>
                          Cartão
                        </Link>
                      ) : (
                        <button 
                          disabled
                          className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-1.5 opacity-60"
                          title="Termo Pendente"
                        >
                          <span className="material-symbols-outlined text-sm">id_card</span>
                          Cartão
                        </button>
                      )}
                      <button 
                        onClick={() => openEditModal(s)}
                        className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all hover:scale-105 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Editar
                      </button>
                      <button 
                        onClick={() => setDevolutivaStudent(s)}
                        className="text-[10px] font-black uppercase px-3 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all hover:scale-105 flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        Devolutiva
                      </button>
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
          ) : students.filter(s => {
            const matchesGrade = !selectedGrade || s.grade === selectedGrade;
            const matchesSearch = !searchTerm || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.enrollment_id.includes(searchTerm);
            const hasPhoto = s.photo_url && !s.photo_url.includes('dicebear.com');
            const matchesPhoto = photoFilter === 'all' || (photoFilter === 'withPhoto' ? hasPhoto : !hasPhoto);
            return matchesGrade && matchesSearch && matchesPhoto;
          }).length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
              <span className="text-outline font-medium">Nenhum aluno.</span>
            </div>
          ) : students.filter(s => {
            const matchesGrade = !selectedGrade || s.grade === selectedGrade;
            const matchesSearch = !searchTerm || s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.enrollment_id.includes(searchTerm);
            const hasPhoto = s.photo_url && !s.photo_url.includes('dicebear.com');
            const matchesPhoto = photoFilter === 'all' || (photoFilter === 'withPhoto' ? hasPhoto : !hasPhoto);
            return matchesGrade && matchesSearch && matchesPhoto;
          }).map((s) => (
            <div key={s.id} className="p-5 flex flex-col gap-4 bg-white/20 active:bg-white/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={s.photo_url} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm" alt="" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.is_authorized ? 'bg-logo-green' : 'bg-logo-red'}`}></div>
                  {s.term_attachments && s.term_attachments.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm border-2 border-white">
                      <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface text-base truncate notranslate" translate="no">{s.full_name}</div>
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
                {s.term_attachments && s.term_attachments.length > 0 ? (
                  <Link 
                    to={`/id/${s.id}`}
                    className="flex-1 py-3 bg-secondary/10 text-secondary rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">id_card</span>
                    Cartão
                  </Link>
                ) : (
                  <button 
                    disabled
                    className="flex-1 py-3 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                    title="Termo Pendente"
                  >
                    <span className="material-symbols-outlined text-base">id_card</span>
                    Cartão
                  </button>
                )}
                <button 
                  onClick={() => openEditModal(s)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  Editar
                </button>
                <button 
                  onClick={() => setDevolutivaStudent(s)}
                  className="flex-1 py-3 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  Devolutiva
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEVOLUTIVA MODAL */}
      {devolutivaStudent && (
        <TermDevolutivaModal
          student={devolutivaStudent}
          onClose={() => setDevolutivaStudent(null)}
        />
      )}

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
