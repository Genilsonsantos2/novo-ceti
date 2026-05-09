import React from 'react';

interface StudentFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedGrade: string;
  setSelectedGrade: (grade: string) => void;
  photoFilter: 'all' | 'withPhoto' | 'withoutPhoto';
  setPhotoFilter: (filter: 'all' | 'withPhoto' | 'withoutPhoto') => void;
  printFilter: 'all' | 'printed' | 'pending';
  setPrintFilter: (filter: 'all' | 'printed' | 'pending') => void;
  grades: string[];
  totalStudents: number;
  onSelectAllWithPhoto: () => void;
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedGrade,
  setSelectedGrade,
  photoFilter,
  setPhotoFilter,
  printFilter,
  setPrintFilter,
  grades,
  totalStudents,
  onSelectAllWithPhoto,
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-4 rounded-[2rem] border border-white/20">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="glass-card px-4 py-2 rounded-xl inline-flex items-center gap-2 border-none bg-primary/5">
          <span className="material-symbols-outlined text-primary text-base">group</span>
          <span className="text-xs font-bold text-on-surface-variant">{totalStudents} Total</span>
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
            {grades.map(grade => (
              <option key={grade} value={grade}>{grade}</option>
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

        <div className="flex p-1 bg-white/60 rounded-xl border border-gray-200">
          <button 
            onClick={() => setPrintFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${printFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            title="Todos os alunos"
          >
            Impr: Tudo
          </button>
          <button 
            onClick={() => setPrintFilter('printed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${printFilter === 'printed' ? 'bg-green-600 text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            title="Apenas carteirinhas já impressas"
          >
            Impressas
          </button>
          <button 
            onClick={() => setPrintFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${printFilter === 'pending' ? 'bg-orange-600 text-white shadow-sm' : 'text-on-surface-variant hover:bg-white/50'}`}
            title="Carteirinhas pendentes de impressão"
          >
            Pendentes
          </button>
        </div>

        <button 
          onClick={onSelectAllWithPhoto}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 transition-all active:scale-95 border border-secondary/20"
        >
          <span className="material-symbols-outlined text-sm">photo_library</span>
          Selecionar todos com foto
        </button>
      </div>
    </div>
  );
};
