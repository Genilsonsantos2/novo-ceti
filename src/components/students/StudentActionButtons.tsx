import React from 'react';
import { Link } from 'react-router-dom';

interface StudentActionButtonsProps {
  onExportMigration: () => void;
  onShowImport: () => void;
  onNewStudent: () => void;
  selectedStudents: string[];
  isMigrating: boolean;
  onMigratePhotos: () => void;
}

export const StudentActionButtons: React.FC<StudentActionButtonsProps> = ({
  onExportMigration,
  onShowImport,
  onNewStudent,
  selectedStudents,
  isMigrating,
  onMigratePhotos,
}) => {
  return (
    <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2 opacity-70" onDoubleClick={onMigratePhotos}>
          Administração {isMigrating && '(Migrando fotos...)'}
        </p>
        <h2 className="font-headline font-extrabold text-3xl text-primary tracking-tight">Gestão de Alunos</h2>
        <p className="text-on-surface-variant font-medium mt-1">Controle de autorizações e matrículas</p>
      </div>
      <div className="flex flex-wrap gap-3 w-full lg:w-auto">
        <button 
          onClick={onExportMigration}
          className="flex-1 lg:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-green-700 border border-green-200"
          title="Exportar alunos autorizados para migração"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Exportar Migração
        </button>
        <button 
          onClick={onShowImport}
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
          to="/daily-access-report"
          className="flex-1 md:flex-none justify-center glass-card px-5 py-3 rounded-2xl font-bold hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm text-primary"
        >
          <span className="material-symbols-outlined text-base">description</span>
          Relatórios
        </Link>
        <button 
          onClick={onNewStudent}
          className="flex-1 md:flex-none justify-center bg-gradient-to-r from-primary to-primary-container text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-300 active:scale-95 flex items-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          Novo Aluno
        </button>
      </div>
    </header>
  );
};
