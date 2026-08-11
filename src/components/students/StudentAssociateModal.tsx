import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export const StudentAssociateModal: React.FC<any> = ({ open, onClose, absenceRecord, onAssociated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({ full_name: '', enrollment_id: '', grade: '' });

  useEffect(() => {
    setResults([]);
    setSearchTerm('');
    setNewStudent({ full_name: '', enrollment_id: '', grade: '' });
  }, [open]);

  const search = async () => {
    if (searchTerm.length < 2) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,enrollment_id.ilike.%${searchTerm}%`)
      .limit(10);
    if (error) console.error(error);
    else setResults(data || []);
    setLoading(false);
  };

  const associate = async (student: any) => {
    if (!absenceRecord) return;
    const payload: any = { student_id: student.id, cached_full_name: student.full_name, cached_enrollment_id: student.enrollment_id, cached_grade: student.grade };
    const { error } = await supabase.from('student_absences').update(payload).eq('id', absenceRecord.id);
    if (error) {
      alert('Erro ao associar: ' + error.message);
    } else {
      onAssociated && onAssociated();
      onClose();
    }
  };

  const createAndAssociate = async () => {
    if (!absenceRecord) return;
    if (!newStudent.full_name || !newStudent.enrollment_id) {
      alert('Preencha nome e matrícula');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.from('students').insert([newStudent]).select().single();
    if (error) {
      alert('Erro ao criar aluno: ' + error.message);
      setCreating(false);
      return;
    }
    const student = data;
    const payload: any = { student_id: student.id, cached_full_name: student.full_name, cached_enrollment_id: student.enrollment_id, cached_grade: student.grade };
    const { error: updateError } = await supabase.from('student_absences').update(payload).eq('id', absenceRecord.id);
    if (updateError) {
      alert('Aluno criado, mas erro ao associar ausência: ' + updateError.message);
      setCreating(false);
      return;
    }
    onAssociated && onAssociated();
    setCreating(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Associar / Cadastrar Aluno</h3>
          <button onClick={onClose} className="text-gray-500">Fechar</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">Procurar aluno</label>
            <div className="flex gap-2 mt-2">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 rounded-lg border px-3 py-2" placeholder="Nome ou matrícula" />
              <button onClick={search} className="px-3 py-2 bg-primary text-white rounded-lg">Pesquisar</button>
            </div>

            <div className="mt-3">
              {loading && <p className="text-sm text-gray-500">Buscando...</p>}
              {!loading && results.length === 0 && <p className="text-sm text-gray-400">Nenhum resultado</p>}
              <div className="space-y-2 mt-2">
                {results.map(r => (
                  <div key={r.id} className="p-2 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{r.full_name}</p>
                      <p className="text-xs text-gray-500">#{r.enrollment_id} • {r.grade}</p>
                    </div>
                    <div>
                      <button onClick={() => associate(r)} className="px-3 py-1 bg-emerald-500 text-white rounded">Associar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold">Cadastrar novo aluno</label>
            <div className="mt-2 space-y-2">
              <input placeholder="Nome completo" value={newStudent.full_name} onChange={e => setNewStudent({ ...newStudent, full_name: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="Matrícula" value={newStudent.enrollment_id} onChange={e => setNewStudent({ ...newStudent, enrollment_id: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <input placeholder="Série / Turma" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })} className="w-full rounded-lg border px-3 py-2" />
              <div className="flex justify-end">
                <button onClick={createAndAssociate} className="px-4 py-2 bg-primary text-white rounded-lg" disabled={creating}>{creating ? 'Criando...' : 'Criar e Associar'}</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
