import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-xl overflow-hidden shadow-lg mx-auto relative bg-white border border-gray-200 flex flex-col"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Top Color Bar (Holographic style for print) */}
      <div className="h-2 w-full flex">
        <div className="h-full flex-1 bg-logo-orange"></div>
        <div className="h-full flex-1 bg-logo-green"></div>
        <div className="h-full flex-1 bg-logo-red"></div>
        <div className="h-full flex-1 bg-logo-blue"></div>
      </div>

      {/* Header */}
      <div className="bg-[#001e40] text-white px-3 py-2 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <img src="/ceti-logo.png" alt="Logo" className="w-7 h-7 object-contain bg-white rounded p-0.5" />
          <div>
            <h3 className="font-headline font-black text-[12px] leading-none tracking-tight">CETI - NOVA ITARANA</h3>
            <p className="text-[6px] font-bold uppercase tracking-wider mt-1 opacity-80">Colégio Estadual de Tempo Integral</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[7px] font-black uppercase tracking-widest opacity-60">Identidade</div>
          <div className="text-[10px] font-black text-amber-400">2026</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex gap-5 relative z-10">
        {/* Photo Section */}
        <div className="flex flex-col gap-2">
          <div className="w-[70px] h-[85px] rounded-md overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-50">
            {showPhoto ? (
              <img 
                src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                alt={student.full_name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-300 text-4xl">person</span>
              </div>
            )}
          </div>
          <div className={`text-[8px] font-black uppercase text-center py-0.5 rounded border ${
            student.is_authorized ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {student.is_authorized ? 'Autorizado' : 'Restrito'}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 flex flex-col justify-between py-0.5">
          <div className="space-y-2">
            <div>
              <span className="text-[6px] text-gray-400 font-black uppercase tracking-widest block">Nome do Aluno</span>
              <h2 className="text-gray-900 font-headline font-black text-[13px] leading-tight uppercase line-clamp-2">
                {student.full_name}
              </h2>
            </div>
            
            <div className="flex gap-4">
              <div>
                <span className="text-[6px] text-gray-400 font-black uppercase tracking-widest block">Turma</span>
                <span className="text-gray-900 font-black text-[11px] uppercase tracking-tight">{student.grade}</span>
              </div>
              <div>
                <span className="text-[6px] text-gray-400 font-black uppercase tracking-widest block">Matrícula</span>
                <span className="text-gray-900 font-mono font-bold text-[11px] tracking-tight">{student.enrollment_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div className="text-[5px] text-gray-400 font-bold uppercase leading-relaxed">
              Este cartão é pessoal e intransferível.<br />
              Uso obrigatório para acesso escolar.
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center gap-1.5">
          <div className="bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
            <QRCodeSVG value={student.qr_code_id} size={50} level="H" />
          </div>
          <span className="text-[6px] font-mono text-gray-400 font-bold tracking-widest">{student.qr_code_id}</span>
        </div>
      </div>

      {/* Bottom Stripe */}
      <div className="h-1 w-full bg-[#001e40] opacity-10"></div>
    </div>
  );
};


