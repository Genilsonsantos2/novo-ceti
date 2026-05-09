import React from 'react';

interface StudentFormModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newStudent: any;
  setNewStudent: (student: any) => void;
  editingStudentId: string | null;
  photoPreview: string | null;
  handlePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saving: boolean;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  show,
  onClose,
  onSubmit,
  newStudent,
  setNewStudent,
  editingStudentId,
  photoPreview,
  handlePhotoChange,
  saving,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-on-surface/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-[2.5rem] p-8 md:p-10 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-xl">{editingStudentId ? 'edit' : 'person_add'}</span>
          </div>
          <div>
            <h3 className="font-headline font-extrabold text-xl text-primary tracking-tight">
              {editingStudentId ? 'Editar Aluno' : 'Novo Aluno'}
            </h3>
            <p className="text-xs text-outline font-medium">Preencha os dados abaixo</p>
          </div>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar pb-4 flex-1">
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
              onClick={onClose}
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
                <><span className="material-symbols-outlined text-base">save</span> {editingStudentId ? 'Atualizar' : 'Cadastrar'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
