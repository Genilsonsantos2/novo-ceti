import React from 'react';

interface ImportStudentsModalProps {
  show: boolean;
  onClose: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  importing: boolean;
  fileName: string;
  previewRows: Array<{ full_name: string; enrollment_id: string; grade: string; issues: string[]; warnings: string[] }>;
  onConfirmImport: () => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  show,
  onClose,
  onImportFile,
  onDownloadTemplate,
  importing,
  fileName,
  previewRows,
  onConfirmImport,
}) => {
  if (!show) return null;
  const validCount = previewRows.filter(row => row.issues.length === 0).length;
  const blockedCount = previewRows.length - validCount;

  return (
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
              onChange={onImportFile}
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

          {previewRows.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div><p className="text-xs font-bold text-gray-800">Conferência: {fileName}</p><p className="mt-1 text-[10px] text-gray-500">{validCount} pronta(s) · {blockedCount} bloqueada(s)</p></div>
                <button type="button" onClick={onConfirmImport} disabled={importing || validCount === 0} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{importing ? 'Salvando...' : `Importar ${validCount} aluno(s)`}</button>
              </div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white text-[9px] uppercase text-gray-500"><tr><th className="px-3 py-2">Aluno / RM</th><th className="px-3 py-2">Conferência</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.slice(0, 20).map((row, index) => <tr key={`${row.enrollment_id}-${index}`}><td className="px-3 py-2"><strong className="block text-gray-800">{row.full_name || 'Sem nome'}</strong><span className="text-gray-500">RM {row.enrollment_id || '—'} · {row.grade || 'Sem turma'}</span></td><td className="px-3 py-2">{row.issues.length > 0 ? <span className="font-bold text-rose-700">{row.issues.join('; ')}</span> : row.warnings.length > 0 ? <span className="font-semibold text-amber-700">{row.warnings.join('; ')}</span> : <span className="font-bold text-emerald-700">Pronto para importar</span>}</td></tr>)}
                  </tbody>
                </table>
                {previewRows.length > 20 && <p className="px-3 py-2 text-[10px] text-gray-500">Exibindo 20 de {previewRows.length} linhas.</p>}
              </div>
            </section>
          )}

          <div className="flex gap-3">
            <button 
              onClick={onDownloadTemplate}
              className="flex-1 py-4 bg-secondary/10 text-secondary rounded-2xl font-bold hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 text-xs"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Baixar Modelo CSV
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-4 glass-card rounded-2xl font-bold hover:scale-[1.02] transition-all text-on-surface-variant text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
