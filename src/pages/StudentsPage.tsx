import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { TermDevolutivaModal } from '../components/TermDevolutivaModal';
import { useDebounce } from '../hooks/useDebounce';
import { useVirtualizer } from '@tanstack/react-virtual';

// New Components
import { StudentFilters } from '../components/students/StudentFilters';
import { StudentActionButtons } from '../components/students/StudentActionButtons';
import { StudentFormModal } from '../components/students/StudentFormModal';
import { ImportStudentsModal } from '../components/students/ImportStudentsModal';
import { StudentTable } from '../components/students/StudentTable';
import { StudentMobileList } from '../components/students/StudentMobileList';

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
  const [printFilter, setPrintFilter] = useState<'all' | 'printed' | 'pending'>('all');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  
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
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredData = useMemo(() => {
    return students.filter(s => {
      const matchesGrade = !selectedGrade || s.grade === selectedGrade;
      const matchesSearch = !debouncedSearchTerm || 
        s.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        s.enrollment_id.includes(debouncedSearchTerm);
      
      const hasPhoto = s.photo_url && !s.photo_url.includes('dicebear.com');
      const matchesPhoto = photoFilter === 'all' || (photoFilter === 'withPhoto' ? hasPhoto : !hasPhoto);
      const matchesPrint = printFilter === 'all' || (printFilter === 'printed' ? s.is_printed : !s.is_printed);
      
      return matchesGrade && matchesSearch && matchesPhoto && matchesPrint;
    });
  }, [students, selectedGrade, debouncedSearchTerm, photoFilter, printFilter]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 85,
    overscan: 5,
  });

  const fetchStudents = async () => {
    setLoading(true);
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

  const toggleTermPhysical = async (studentId: string, currentStatus: boolean) => {
    const updates: any = { term_returned_physical: !currentStatus };
    if (!currentStatus) updates.is_authorized = true;

    const { error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', studentId);

    if (error) console.error(error);
    else fetchStudents();
  };

  const togglePrintStatus = async (studentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('students')
      .update({ is_printed: !currentStatus })
      .eq('id', studentId);

    if (error) console.error(error);
    else fetchStudents();
  };

  const handleExportMigrationCSV = () => {
    const authorizedStudents = students.filter(s => s.is_authorized);
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

  const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        } else {
          if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
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
      if (file.size > 10 * 1024 * 1024) { alert('Arquivo muito grande.'); return; }
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

  const handleMigratePhotos = async () => {
    if (!window.confirm('Deseja migrar fotos?')) return;
    setIsMigrating(true);
    try {
      const { data: studentsWithBase64 } = await supabase.from('students').select('id, photo_url').like('photo_url', 'data:image%');
      if (!studentsWithBase64 || studentsWithBase64.length === 0) { alert('Nada para migrar.'); setIsMigrating(false); return; }
      for (const st of studentsWithBase64) {
        try {
          const res = await fetch(st.photo_url);
          const blob = await res.blob();
          const fileName = `student_${st.id}_${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
            await supabase.from('students').update({ photo_url: publicUrlData.publicUrl }).eq('id', st.id);
          }
        } catch (e) { console.error(e); }
      }
      alert('Migração concluída!');
      fetchStudents();
    } catch (err) { console.error(err); }
    setIsMigrating(false);
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
      let photoUrl = newStudent.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newStudent.full_name)}&backgroundColor=random`;

      if (photoUrl.startsWith('data:image')) {
        const res = await fetch(photoUrl);
        const blob = await res.blob();
        const fileName = `student_${editingStudentId || Date.now()}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
          photoUrl = publicUrlData.publicUrl;
        }
      }

      const studentData = {
        full_name: newStudent.full_name,
        enrollment_id: newStudent.enrollment_id,
        grade: newStudent.grade,
        cpf: newStudent.cpf,
        birth_date: newStudent.birth_date,
        guardian_name: newStudent.guardian_name,
        guardian_cpf: newStudent.guardian_cpf,
        photo_url: photoUrl,
      };

      if (editingStudentId) {
        const { error } = await supabase.from('students').update(studentData).eq('id', editingStudentId);
        if (error) throw error;
        alert('Aluno atualizado!');
      } else {
        const qrCodeId = `QR-${newStudent.enrollment_id}-${Date.now().toString().slice(-4)}`;
        const { error } = await supabase.from('students').insert({ ...studentData, qr_code_id: qrCodeId, is_authorized: true });
        if (error) throw error;
        alert('Aluno cadastrado!');
      }
      closeEditModal();
      fetchStudents();
    } catch (error: any) {
      alert('Erro: ' + error.message);
    } finally {
      setSaving(false);
    }
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
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (rows.length < 2) { alert('Arquivo vazio.'); setImporting(false); return; }

        const normalize = (str: any) => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        let headerRowIndex = 0;
        let maxScore = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowText = rows[i].map(normalize).join(' ');
          let score = 0;
          if (rowText.includes('nome') || rowText.includes('aluno')) score++;
          if (rowText.includes('rm') || rowText.includes('matri')) score++;
          if (score > maxScore) { maxScore = score; headerRowIndex = i; }
        }

        let headers = rows[headerRowIndex].map(normalize);
        const nameIdx = headers.findIndex(h => (h.includes('nome') || h.includes('aluno')) && !h.includes('respons'));
        const rmIdx = headers.findIndex(h => h === 'rm' || h.includes('matri'));
        const gradeIdx = headers.findIndex(h => h.includes('serie') || h.includes('turma'));
        const cpfIdx = headers.findIndex(h => h === 'cpf');
        const birthIdx = headers.findIndex(h => h.includes('nasc'));
        const respNameIdx = headers.findIndex(h => h.includes('respons') || h.includes('pai') || h.includes('mae'));

        if (nameIdx === -1 || rmIdx === -1) { alert('Colunas obrigatórias não encontradas.'); setImporting(false); return; }

        const newStudents = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const values = rows[i].map((v: any) => String(v).trim());
          if (!values.join('').trim()) continue;
          const student: any = {
            full_name: values[nameIdx],
            enrollment_id: values[rmIdx],
            grade: gradeIdx !== -1 ? values[gradeIdx] : '',
            cpf: cpfIdx !== -1 ? values[cpfIdx] : '',
            birth_date: birthIdx !== -1 ? values[birthIdx] : null,
            guardian_name: respNameIdx !== -1 ? values[respNameIdx] : '',
            qr_code_id: `QR-${values[rmIdx]}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            is_authorized: true,
            photo_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(values[nameIdx])}&backgroundColor=random`
          };
          newStudents.push(student);
        }

        if (newStudents.length > 0) {
          const { error } = await supabase.from('students').insert(newStudents);
          if (error) alert('Erro ao salvar: ' + error.message);
          else { alert(`${newStudents.length} alunos importados!`); fetchStudents(); setShowImportModal(false); }
        }
      } catch (error) { console.error(error); alert('Erro ao ler arquivo.'); }
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const grades = useMemo(() => {
    return Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort() as string[];
  }, [students]);

  const handleSelectAllWithPhoto = () => {
    const withPhotos = filteredData
      .filter(s => s.photo_url && !s.photo_url.includes('dicebear.com'))
      .map(s => s.id);
    setSelectedStudents(prev => {
      const allSelected = withPhotos.every(id => prev.includes(id));
      if (allSelected) return prev.filter(id => !withPhotos.includes(id));
      return Array.from(new Set([...prev, ...withPhotos]));
    });
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8 min-h-screen relative">
      <StudentActionButtons 
        onExportMigration={handleExportMigrationCSV}
        onShowImport={() => setShowImportModal(true)}
        onNewStudent={() => { closeEditModal(); setShowModal(true); }}
        selectedStudents={selectedStudents}
        isMigrating={isMigrating}
        onMigratePhotos={handleMigratePhotos}
      />

      <StudentFilters 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        photoFilter={photoFilter}
        setPhotoFilter={setPhotoFilter}
        printFilter={printFilter}
        setPrintFilter={setPrintFilter}
        grades={grades}
        totalStudents={students.length}
        onSelectAllWithPhoto={handleSelectAllWithPhoto}
      />

      <div className="glass-card rounded-[2rem] overflow-hidden border border-white/20">
        <StudentTable 
          loading={loading}
          filteredData={filteredData}
          selectedStudents={selectedStudents}
          setSelectedStudents={setSelectedStudents}
          rowVirtualizer={rowVirtualizer}
          parentRef={parentRef}
          togglePrintStatus={togglePrintStatus}
          toggleTermPhysical={toggleTermPhysical}
          toggleAuthorization={toggleAuthorization}
          openEditModal={openEditModal}
          setDevolutivaStudent={setDevolutivaStudent}
        />
        
        <StudentMobileList 
          loading={loading}
          filteredData={filteredData}
          togglePrintStatus={togglePrintStatus}
          toggleTermPhysical={toggleTermPhysical}
          toggleAuthorization={toggleAuthorization}
          openEditModal={openEditModal}
          setDevolutivaStudent={setDevolutivaStudent}
        />
      </div>

      <TermDevolutivaModal 
        student={devolutivaStudent} 
        onClose={() => setDevolutivaStudent(null)} 
      />

      <StudentFormModal 
        show={showModal}
        onClose={closeEditModal}
        onSubmit={handleCreateStudent}
        newStudent={newStudent}
        setNewStudent={setNewStudent}
        editingStudentId={editingStudentId}
        photoPreview={photoPreview}
        handlePhotoChange={handlePhotoChange}
        saving={saving}
      />

      <ImportStudentsModal 
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportFile={handleImportFile}
        onDownloadTemplate={handleDownloadTemplate}
        importing={importing}
      />
    </div>
  );
};
