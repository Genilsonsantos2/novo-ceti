import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TermDevolutivaModalProps {
  student: any;
  onClose: () => void;
}

const generateVerificationCode = (studentId: string) => {
  const ts = Date.now().toString(36).toUpperCase();
  const idPart = studentId.replace(/-/g, '').substring(0, 6).toUpperCase();
  return `CETI-${idPart}-${ts}`;
};

export const TermDevolutivaModal: React.FC<TermDevolutivaModalProps> = ({ student, onClose }) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [termType, setTermType] = useState<'lunch' | 'gym'>('lunch');
  const [viewingAttachment, setViewingAttachment] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, []);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('term_attachments')
      .select('*')
      .eq('student_id', student.id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar devolutivas:', error);
    } else {
      setAttachments(data || []);
    }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    try {
      // Convert to base64 for storage (avoids Storage bucket setup)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const verificationCode = generateVerificationCode(student.id);

        const { error } = await supabase.from('term_attachments').insert({
          student_id: student.id,
          term_type: termType,
          file_url: base64,
          file_name: selectedFile.name,
          verification_code: verificationCode,
          director_name: 'Direção CETI - Nova Itarana',
        });

        if (error) {
          alert('Erro ao salvar devolutiva: ' + error.message);
        } else {
          setSelectedFile(null);
          setPreviewUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          await fetchAttachments();
        }
        setUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta devolutiva?')) return;
    await supabase.from('term_attachments').delete().eq('id', id);
    setViewingAttachment(null);
    fetchAttachments();
  };

  const termTypeLabel = (type: string) =>
    type === 'gym' ? 'Academia / Transporte' : 'Saída para Almoço';

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl px-8 py-6 border-b border-gray-100 flex justify-between items-center z-10 rounded-t-[2rem]">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1 opacity-70">Devolutiva de Termo</p>
            <h2 className="font-headline font-extrabold text-xl text-gray-900">{student.full_name}</h2>
            <p className="text-sm text-gray-500 font-medium">{student.grade} • RM {student.enrollment_id}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-gray-500">close</span>
          </button>
        </div>

        <div className="p-8 space-y-8 flex-1">

          {/* Upload Section */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 border border-gray-200">
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
              <span className="material-symbols-outlined text-primary text-base">upload_file</span>
              Anexar Novo Termo Digitalizado
            </h3>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de Termo</label>
                <select
                  value={termType}
                  onChange={(e) => setTermType(e.target.value as 'lunch' | 'gym')}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl font-bold text-gray-700 bg-white focus:border-primary outline-none text-sm"
                >
                  <option value="lunch">Saída para Almoço</option>
                  <option value="gym">Academia / Transporte (Zona Rural)</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Arquivo (Imagem ou PDF)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="devolutiva-upload"
                />
                <label
                  htmlFor="devolutiva-upload"
                  className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl font-bold text-gray-500 bg-white hover:border-primary hover:text-primary transition-colors text-sm flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">attach_file</span>
                  {selectedFile ? selectedFile.name : 'Selecionar arquivo...'}
                </label>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && selectedFile?.type.startsWith('image/') && (
              <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={previewUrl} alt="Pré-visualização" className="w-full max-h-64 object-contain bg-gray-100" />
                {/* Stamp preview */}
                <div className="absolute bottom-3 right-3 bg-primary/90 text-white p-2.5 rounded-xl text-[9px] font-black uppercase text-right leading-tight backdrop-blur-sm shadow-lg border-2 border-white/20">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                    <span>Assinado Eletronicamente</span>
                  </div>
                  <div className="opacity-80">Direção CETI • Nova Itarana</div>
                  <div className="opacity-70">{format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                </div>
              </div>
            )}

            {selectedFile && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl font-black uppercase tracking-wider text-sm hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> Salvando...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>verified</span> Anexar e Assinar Eletronicamente</>
                )}
              </button>
            )}
          </div>

          {/* Attachments List */}
          <div>
            <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider mb-4">
              <span className="material-symbols-outlined text-secondary text-base">folder_open</span>
              Termos Arquivados ({attachments.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-400">
                <span className="material-symbols-outlined text-4xl animate-spin block mb-2">progress_activity</span>
                Carregando...
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">folder</span>
                <p className="text-gray-400 font-medium text-sm">Nenhuma devolutiva arquivada ainda.</p>
                <p className="text-gray-300 text-xs mt-1">Anexe o termo digitalizado acima.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary" style={{fontVariationSettings:"'FILL' 1"}}>description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{termTypeLabel(att.term_type)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(att.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] font-mono text-primary/60 mt-0.5 truncate">{att.verification_code}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingAttachment(att)}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Ver
                      </button>
                      <button
                        onClick={() => handleDelete(att.id)}
                        className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-black uppercase hover:bg-red-100 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewer Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Viewer Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <p className="font-black text-gray-900 text-sm">{student.full_name}</p>
                <p className="text-xs text-gray-500">{termTypeLabel(viewingAttachment.term_type)} • {format(new Date(viewingAttachment.uploaded_at), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const win = window.open();
                    if (win) {
                      win.document.write(`<html><body style="margin:0"><img src="${viewingAttachment.file_url}" style="max-width:100%" /></body></html>`);
                      win.print();
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Imprimir
                </button>
                <button onClick={() => setViewingAttachment(null)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="overflow-y-auto flex-1 bg-gray-100 p-4">
              <div className="relative inline-block w-full">
                {viewingAttachment.file_url.startsWith('data:image') ? (
                  <img
                    src={viewingAttachment.file_url}
                    alt="Termo digitalizado"
                    className="w-full rounded-xl shadow-lg"
                  />
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl">
                    <span className="material-symbols-outlined text-6xl text-gray-300 block mb-3">description</span>
                    <p className="text-gray-500 font-bold">{viewingAttachment.file_name}</p>
                    <p className="text-gray-400 text-sm mt-1">Arquivo PDF</p>
                  </div>
                )}

                {/* Digital Signature Stamp */}
                <div className="absolute bottom-4 right-4 bg-primary text-white p-3 rounded-2xl text-[9px] font-black uppercase text-right leading-tight shadow-xl border-2 border-white/30 min-w-[180px]">
                  <div className="flex items-center justify-end gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-sm" style={{fontVariationSettings:"'FILL' 1"}}>verified</span>
                    <span className="text-[11px]">Assinado Eletronicamente</span>
                  </div>
                  <div className="h-px bg-white/30 mb-1.5" />
                  <div className="text-white/90">{viewingAttachment.director_name}</div>
                  <div className="text-white/70 mt-0.5">
                    {format(new Date(viewingAttachment.uploaded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  <div className="mt-1.5 bg-white/20 rounded-lg px-2 py-1 font-mono text-[8px] tracking-wider break-all">
                    {viewingAttachment.verification_code}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
