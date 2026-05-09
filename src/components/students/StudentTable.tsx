import React from 'react';
import { Link } from 'react-router-dom';

interface StudentTableProps {
  loading: boolean;
  filteredData: any[];
  selectedStudents: string[];
  setSelectedStudents: React.Dispatch<React.SetStateAction<string[]>>;
  rowVirtualizer: any;
  parentRef: React.RefObject<HTMLDivElement>;
  togglePrintStatus: (studentId: string, currentStatus: boolean) => void;
  toggleTermPhysical: (studentId: string, currentStatus: boolean) => void;
  toggleAuthorization: (studentId: string, currentStatus: boolean) => void;
  openEditModal: (student: any) => void;
  setDevolutivaStudent: (student: any) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  loading,
  filteredData,
  selectedStudents,
  setSelectedStudents,
  rowVirtualizer,
  parentRef,
  togglePrintStatus,
  toggleTermPhysical,
  toggleAuthorization,
  openEditModal,
  setDevolutivaStudent,
}) => {
  return (
    <div className="hidden md:block overflow-x-auto">
      <div ref={parentRef} className="max-h-[60vh] overflow-auto relative">
        <table className="w-full text-left">
          <thead className="bg-white/50 border-b border-white/30 sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline w-10">
                <input 
                  type="checkbox" 
                  onChange={(e) => setSelectedStudents(e.target.checked ? filteredData.map(s => s.id) : [])}
                  checked={selectedStudents.length === filteredData.length && filteredData.length > 0}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Aluno</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Matrícula</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Status</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Impresso</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Termo</th>
              <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-outline">Ações</th>
            </tr>
          </thead>
          
          {loading ? (
            <tbody><tr><td colSpan={7} className="px-8 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-outline animate-spin block mb-3">progress_activity</span>
              <span className="text-outline font-medium">Carregando alunos...</span>
            </td></tr></tbody>
          ) : filteredData.length === 0 ? (
            <tbody><tr><td colSpan={7} className="px-8 py-16 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">school</span>
              <span className="text-outline font-medium">Nenhum aluno encontrado.</span>
            </td></tr></tbody>
          ) : (
            <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }} className="divide-y divide-white/30">
              {rowVirtualizer.getVirtualItems().map((virtualRow: any) => {
                const s = filteredData[virtualRow.index];
                if (!s) return null;
                return (
                  <tr 
                    key={s.id} 
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                    className={`hover:bg-white/40 transition-all duration-200 group ${selectedStudents.includes(s.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-8 py-5">
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
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
                      <button 
                        onClick={() => togglePrintStatus(s.id, s.is_printed)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105
                        ${s.is_printed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 opacity-60'}`}
                        title={s.is_printed ? 'Carteirinha impressa' : 'Clique para marcar como impressa'}
                      >
                        <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: s.is_printed ? "'FILL' 1" : ""}}>
                          {s.is_printed ? 'print' : 'print_disabled'}
                        </span>
                        {s.is_printed ? 'Sim' : 'Não'}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      {s.term_attachments && s.term_attachments.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                          <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                          Digitalizado
                        </span>
                      ) : s.term_returned_physical ? (
                        <button 
                          onClick={() => toggleTermPhysical(s.id, s.term_returned_physical)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 transition-all hover:scale-105"
                        >
                          <span className="material-symbols-outlined text-xs" style={{fontVariationSettings: "'FILL' 1"}}>description</span>
                          Entregue
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleTermPhysical(s.id, s.term_returned_physical)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all hover:scale-105"
                        >
                          <span className="material-symbols-outlined text-xs">history_edu</span>
                          Pendente
                        </button>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => toggleAuthorization(s.id, s.is_authorized)}
                          className={`p-2 rounded-xl transition-all hover:scale-110 flex items-center justify-center ${
                            s.is_authorized 
                              ? 'bg-logo-red/10 text-logo-red hover:bg-logo-red/20' 
                              : 'bg-logo-green/10 text-logo-green hover:bg-logo-green/20'
                          }`}
                          title={s.is_authorized ? 'Bloquear' : 'Liberar'}
                        >
                          <span className="material-symbols-outlined text-sm">{s.is_authorized ? 'lock' : 'lock_open'}</span>
                        </button>

                        <div className="group/menu relative">
                          <button className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
                            <span className="material-symbols-outlined text-sm">more_vert</span>
                          </button>
                          
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 hidden group-hover/menu:block">
                            <button 
                              onClick={() => openEditModal(s)}
                              className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                              Editar Dados
                            </button>
                            <Link 
                              to={`/auth-term/${s.id}`} 
                              className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">assignment</span>
                              Imprimir Termo
                            </Link>
                            <button 
                              onClick={() => setDevolutivaStudent(s)}
                              className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">attach_file</span>
                              Anexar Devolutiva
                            </button>
                            {((s.term_attachments && s.term_attachments.length > 0) || s.term_returned_physical) ? (
                              <Link 
                                to={`/id/${s.id}`} 
                                className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-600 hover:bg-primary/5 hover:text-primary flex items-center gap-3 transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">id_card</span>
                                Ver Cartão
                              </Link>
                            ) : (
                              <div className="w-full px-4 py-2 text-left text-[10px] font-bold uppercase text-gray-300 flex items-center gap-3 cursor-not-allowed">
                                <span className="material-symbols-outlined text-sm">id_card</span>
                                Cartão (Pendente)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
};
