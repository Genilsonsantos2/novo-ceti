import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-[12px] overflow-hidden shadow-2xl mx-auto relative bg-white border border-gray-300 flex flex-col group"
      style={{ 
        WebkitPrintColorAdjust: 'exact', 
        printColorAdjust: 'exact',
        fontFamily: "'Inter', sans-serif"
      }}
    >
      {/* Background Subtle Watermark */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none overflow-hidden flex items-center justify-center">
        <img src="/ceti-logo.png" alt="watermark" className="w-48 h-48 object-contain grayscale" />
      </div>

      {/* Top Header Section - Solid & Professional */}
      <div className="bg-[#001e40] text-white px-4 py-2 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded shadow-sm">
            <img src="/ceti-logo.png" alt="Logo" className="w-9 h-9 object-contain" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-black text-[14px] leading-tight uppercase tracking-tight">CETI - NOVA ITARANA</h3>
            <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-blue-200">Colégio Estadual de Tempo Integral</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end border-l border-white/20 pl-3">
          <div className="text-[6px] font-black uppercase tracking-widest opacity-60">Ano Letivo</div>
          <div className="text-[14px] font-black text-white">2026</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex p-4 gap-5 relative z-20 bg-white/50 backdrop-blur-[1px]">
        {/* Left Side: Photo & Status */}
        <div className="flex flex-col gap-2">
          <div className="relative">
            <div className="w-[85px] h-[105px] rounded-lg overflow-hidden border-[3px] border-white shadow-lg bg-gray-50 ring-1 ring-gray-100">
              {showPhoto ? (
                <img 
                  src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                  alt={student.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-300 text-6xl">person</span>
                </div>
              )}
            </div>
            
            {/* Stamp/Seal Overlay */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white/90 border border-gray-100 shadow flex items-center justify-center overflow-hidden">
               <img src="/ceti-logo.png" alt="Seal" className="w-5 h-5 object-contain opacity-40 grayscale" />
            </div>
          </div>
          
          <div className={`text-[9px] font-black uppercase text-center py-1 rounded shadow-sm border ${
            student.is_authorized 
              ? 'bg-green-600 text-white border-green-700' 
              : 'bg-red-600 text-white border-red-700'
          }`}>
            {student.is_authorized ? 'LIBERADO' : 'BLOQUEADO'}
          </div>
        </div>

        {/* Middle: Student Details - High Contrast */}
        <div className="flex-1 flex flex-col justify-center py-1">
          <div className="mb-4">
            <span className="text-[8px] text-[#001e40] font-black uppercase tracking-widest block mb-1 opacity-60">Nome do Aluno</span>
            <h2 className="text-[#001e40] font-black text-[18px] leading-[1.1] uppercase break-words line-clamp-2">
              {student.full_name}
            </h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
            <div>
              <span className="text-[8px] text-[#001e40] font-black uppercase tracking-widest block mb-0.5 opacity-60">Série/Turma</span>
              <span className="text-black font-black text-[14px] uppercase">{student.grade}</span>
            </div>
            <div>
              <span className="text-[8px] text-[#001e40] font-black uppercase tracking-widest block mb-0.5 opacity-60">Matrícula</span>
              <span className="text-black font-mono font-bold text-[14px]">{student.enrollment_id}</span>
            </div>
          </div>
        </div>

        {/* Right Side: QR Code Area */}
        <div className="flex flex-col items-center justify-center gap-2 border-l border-gray-100 pl-4">
          <div className="bg-white p-1 rounded-lg border border-gray-100 shadow-sm">
            <QRCodeSVG value={student.qr_code_id} size={65} level="H" />
          </div>
          <span className="text-[8px] font-mono text-gray-500 font-bold tracking-tighter uppercase">{student.qr_code_id.substring(0, 12)}</span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="h-4 w-full bg-[#001e40] flex items-center px-4 relative z-20">
         <div className="flex gap-2 h-full py-1">
            <div className="w-2 h-full bg-logo-orange rounded-full"></div>
            <div className="w-2 h-full bg-logo-green rounded-full"></div>
            <div className="w-2 h-full bg-logo-red rounded-full"></div>
            <div className="w-2 h-full bg-logo-blue rounded-full"></div>
         </div>
         <div className="flex-1 text-center">
            <span className="text-[6px] text-white/50 font-bold tracking-[0.2em] uppercase">
              Secretaria da Educação • Governo do Estado da Bahia
            </span>
         </div>
      </div>
    </div>
  );
};


