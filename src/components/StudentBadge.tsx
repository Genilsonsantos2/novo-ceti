import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  return (
    <div 
      className="w-[85.6mm] h-[54mm] shrink-0 rounded-[10px] overflow-hidden shadow-none print:shadow-none mx-auto relative bg-white border border-gray-200 flex flex-col"
      style={{ 
        WebkitPrintColorAdjust: 'exact', 
        printColorAdjust: 'exact',
        boxSizing: 'border-box'
      }}
    >
      {/* Background Watermark */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden flex items-center justify-center">
        <img src="/ceti-logo.png" alt="" className="w-[40mm] h-[40mm] object-contain grayscale" />
      </div>

      {/* Header */}
      <div className="h-[12mm] bg-[#001e40] text-white px-3 flex justify-between items-center relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white p-0.5 rounded shadow-sm">
            <img src="/ceti-logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-[11px] leading-none uppercase tracking-tight">CETI - NOVA ITARANA</h3>
            <span className="text-[6px] font-bold uppercase tracking-[0.1em] text-blue-200 mt-0.5">Colégio Estadual de Tempo Integral</span>
          </div>
        </div>
        <div className="text-right border-l border-white/20 pl-2">
          <div className="text-[5px] font-black uppercase tracking-widest opacity-60">Vigência</div>
          <div className="text-[11px] font-black">2026</div>
        </div>
      </div>

      {/* Body Section */}
      <div className="flex-1 flex p-3 gap-3 relative z-20 overflow-hidden items-center">
        {/* Left Column: Photo - Fixed Width */}
        <div className="w-[24mm] shrink-0 flex flex-col gap-1.5 items-center">
          <div className="w-[24mm] h-[30mm] rounded-md overflow-hidden border-2 border-white shadow-md bg-gray-50 ring-1 ring-gray-100 shrink-0">
            {showPhoto ? (
              <img 
                src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                alt="" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-300 text-5xl">person</span>
              </div>
            )}
          </div>
          
          <div className={`w-full text-[8px] font-black uppercase text-center py-0.5 rounded shadow-sm border ${
            student.is_authorized 
              ? 'bg-green-600 text-white border-green-700' 
              : 'bg-red-600 text-white border-red-700'
          }`}>
            {student.is_authorized ? 'AUTORIZADO' : 'BLOQUEADO'}
          </div>
        </div>

        {/* Middle Column: Details - Flexible */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <div className="mb-2">
            <span className="text-[7px] text-[#001e40] font-black uppercase tracking-wider block mb-0.5 opacity-50">Nome do Discente</span>
            <h2 className="text-[#001e40] font-black text-[14px] leading-[1.1] uppercase line-clamp-2">
              {student.full_name}
            </h2>
          </div>
          
          <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2">
            <div>
              <span className="text-[7px] text-[#001e40] font-black uppercase tracking-wider block opacity-50">Série/Turma</span>
              <span className="text-black font-black text-[11px] uppercase truncate block">{student.grade}</span>
            </div>
            <div>
              <span className="text-[7px] text-[#001e40] font-black uppercase tracking-wider block opacity-50">Matrícula</span>
              <span className="text-black font-mono font-bold text-[11px] truncate block">{student.enrollment_id}</span>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code - Fixed Width */}
        <div className="w-[20mm] shrink-0 flex flex-col items-center justify-center gap-1 border-l border-gray-100 pl-2">
          <div className="bg-white p-0.5 rounded border border-gray-100 shadow-sm">
            <QRCodeSVG value={student.qr_code_id} size={55} level="M" />
          </div>
          <span className="text-[6px] font-mono text-gray-400 font-bold uppercase truncate w-full text-center">{student.qr_code_id.substring(0, 10)}</span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="h-[5mm] bg-[#001e40] flex items-center px-3 relative z-20 shrink-0">
         <div className="flex gap-1 h-full py-1 items-center">
            <div className="w-1.5 h-1.5 bg-logo-orange rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-logo-green rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-logo-red rounded-full"></div>
            <div className="w-1.5 h-1.5 bg-logo-blue rounded-full"></div>
         </div>
         <div className="flex-1 text-center">
            <span className="text-[5px] text-white/40 font-bold tracking-[0.2em] uppercase whitespace-nowrap">
              SECRETARIA DA EDUCAÇÃO • BAHIA • CETI NOVA ITARANA
            </span>
         </div>
      </div>
    </div>
  );
};


