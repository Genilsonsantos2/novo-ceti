import React from 'react';
import { Link } from 'react-router-dom';

interface StudentMobileListProps {
  loading: boolean;
  filteredData: any[];
  togglePrintStatus: (studentId: string, currentStatus: boolean) => void;
  toggleTermPhysical: (studentId: string, currentStatus: boolean) => void;
  toggleAuthorization: (studentId: string, currentStatus: boolean) => void;
  openEditModal: (student: any) => void;
  setDevolutivaStudent: (student: any) => void;
}

export const StudentMobileList: React.FC<StudentMobileListProps> = ({
  loading,
  filteredData,
  togglePrintStatus,
  toggleTermPhysical,
  toggleAuthorization,
  openEditModal,
  setDevolutivaStudent,
}) => {
  return (
    <div className="md:hidden divide-y divide-white/30">
      {loading ? (
        <div className="p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
          <span className="text-outline font-medium">Carregando...</span>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
          <span className="text-outline font-medium">Nenhum aluno encontrado.</span>
        </div>
      ) : (
        filteredData.map((s) => (
          <div key={s.id} className="p-5 flex flex-col gap-4 bg-white/20 active:bg-white/40 transition-all">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img src={s.photo_url} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-sm" alt="" />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${s.is_authorized ? 'bg-logo-green' : 'bg-logo-red'}`}></div>
                {s.term_attachments && s.term_attachments.length > 0 ? (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm border-2 border-white" title="Termo Digitalizado">
                    <span className="material-symbols-outlined text-[10px] font-bold">verified</span>
                  </div>
                ) : s.term_returned_physical ? (
                  <div 
                    onClick={(e) => { e.preventDefault(); toggleTermPhysical(s.id, s.term_returned_physical); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm border-2 border-white cursor-pointer" 
                    title="Termo Entregue (Físico)"
                  >
                    <span className="material-symbols-outlined text-[10px] font-bold">description</span>
                  </div>
                ) : (
                  <div 
                    onClick={(e) => { e.preventDefault(); toggleTermPhysical(s.id, s.term_returned_physical); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-300 text-white flex items-center justify-center shadow-sm border-2 border-white cursor-pointer" 
                    title="Termo Pendente"
                  >
                    <span className="material-symbols-outlined text-[10px] font-bold">history_edu</span>
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
              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  s.is_authorized ? 'bg-logo-green/10 text-logo-green' : 'bg-logo-red/10 text-logo-red'
                }`}>
                  {s.is_authorized ? 'Ativo' : 'Bloq'}
                </span>
                <button 
                  onClick={(e) => { e.preventDefault(); togglePrintStatus(s.id, s.is_printed); }}
                  className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
                    s.is_printed ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[10px]">{s.is_printed ? 'print' : 'print_disabled'}</span>
                  {s.is_printed ? 'Sim' : 'Não'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                className={`py-2 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  s.is_authorized ? 'bg-logo-red/10 text-logo-red' : 'bg-logo-green/10 text-logo-green'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{s.is_authorized ? 'lock' : 'lock_open'}</span>
                {s.is_authorized ? 'Bloquear' : 'Liberar'}
              </button>
              <button 
                onClick={() => openEditModal(s)}
                className="py-2 bg-gray-100 text-gray-600 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar
              </button>
              <button 
                onClick={() => setDevolutivaStudent(s)}
                className="py-2 bg-amber-50 text-amber-600 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">attach_file</span>
                Devolutiva
              </button>
              <Link 
                to={`/auth-term/${s.id}`}
                className="py-2 bg-primary/10 text-primary rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">assignment</span>
                Termo
              </Link>
              {((s.term_attachments && s.term_attachments.length > 0) || s.term_returned_physical) ? (
                <Link 
                  to={`/id/${s.id}`}
                  className="py-2 bg-secondary/10 text-secondary rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">id_card</span>
                  Cartão
                </Link>
              ) : (
                <button 
                  disabled
                  className="py-2 bg-gray-100 text-gray-400 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">id_card</span>
                  Cartão
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
