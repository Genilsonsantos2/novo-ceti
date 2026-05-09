import React from 'react';

interface ImportStudentsModalProps {
  show: boolean;
  onClose: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  importing: boolean;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  show,
  onClose,
  onImportFile,
  onDownloadTemplate,
  importing,
}) => {
  if (!show) return null;

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
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
