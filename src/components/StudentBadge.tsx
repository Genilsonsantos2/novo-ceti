import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-xl overflow-hidden shadow-2xl mx-auto relative bg-white border border-gray-300 flex flex-col group"
      style={{ 
        WebkitPrintColorAdjust: 'exact', 
        printColorAdjust: 'exact'
      }}
    >
      {/* Official Security Pattern Overlay - Extremely subtle to not interfere with legibility */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none select-none overflow-hidden flex flex-wrap gap-4 p-4 items-center justify-center rotate-[-15deg]">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="text-[10px] font-black uppercase whitespace-nowrap">CETI NOVA ITARANA • SECRETARIA DA EDUCAÇÃO • BAHIA</span>
        ))}
      </div>

      {/* Top Color Bar */}
      <div className="h-1.5 w-full flex relative z-20">
        <div className="h-full flex-1 bg-logo-orange shadow-[0_0_10px_rgba(249,115,22,0.3)]"></div>
        <div className="h-full flex-1 bg-logo-green shadow-[0_0_10px_rgba(34,197,94,0.3)]"></div>
        <div className="h-full flex-1 bg-logo-red shadow-[0_0_10px_rgba(239,68,68,0.3)]"></div>
        <div className="h-full flex-1 bg-logo-blue shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#001e40] to-[#003366] text-white px-4 py-2.5 flex justify-between items-center relative z-20 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-white p-0.5 rounded shadow-sm">
            <img src="/ceti-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-headline font-black text-[13px] leading-none tracking-tight uppercase">CETI - NOVA ITARANA</h3>
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] mt-1 text-blue-200">Colégio Estadual de Tempo Integral</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="text-[6px] font-black uppercase tracking-[0.3em] opacity-50">Vigência</div>
          <div className="text-[12px] font-black text-amber-400 drop-shadow-sm">2026</div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 flex gap-6 relative z-20">
        {/* Photo Section with Holographic Seal */}
        <div className="flex flex-col gap-2 relative">
          <div className="relative">
            <div className="w-[75px] h-[95px] rounded-lg overflow-hidden border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.1)] bg-gray-100 ring-1 ring-gray-200">
              {showPhoto ? (
                <img 
                  src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                  alt={student.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-300 text-5xl">person</span>
                </div>
              )}
            </div>
            
            {/* Holographic Seal Over Photo */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-tr from-gray-300 via-white to-gray-400 border-2 border-white shadow-lg flex items-center justify-center overflow-hidden opacity-90">
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.8),transparent)] animate-[spin_4s_linear_infinite]"></div>
              <img src="/ceti-logo.png" alt="Seal" className="w-6 h-6 object-contain grayscale opacity-60 mix-blend-multiply" />
            </div>
          </div>

          <div className={`text-[9px] font-black uppercase text-center py-1 rounded-md border-2 shadow-sm ${
            student.is_authorized 
              ? 'bg-emerald-500 text-white border-white' 
              : 'bg-rose-500 text-white border-white'
          }`}>
            {student.is_authorized ? 'AUTORIZADO' : 'RESTRITO'}
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="space-y-3">
            <div>
              <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] block mb-0.5">Nome do Discente</span>
              <h2 className="text-black font-headline font-black text-[16px] leading-tight uppercase tracking-tight line-clamp-2">
                {student.full_name}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] block mb-0.5">Série/Turma</span>
                <span className="text-black font-black text-[13px] uppercase">{student.grade}</span>
              </div>
              <div>
                <span className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] block mb-0.5">Nº Matrícula</span>
                <span className="text-black font-mono font-bold text-[13px]">{student.enrollment_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between mt-auto">
            <div className="text-[6px] text-gray-400 font-bold uppercase leading-tight italic">
              Este cartão é oficial e de uso obrigatório.<br />
              Em caso de perda, informe à secretaria.
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-md ring-4 ring-gray-50">
            <QRCodeSVG value={student.qr_code_id} size={55} level="H" />
          </div>
          <span className="text-[7px] font-mono text-gray-400 font-black tracking-widest">{student.qr_code_id.substring(0, 10).toUpperCase()}</span>
        </div>
      </div>

      {/* Security Stripe with State text */}
      <div className="h-2 w-full bg-[#001e40] flex items-center justify-center overflow-hidden">
        <span className="text-[5px] text-white/40 font-black tracking-[1em] uppercase whitespace-nowrap">
          GOVERNO DO ESTADO DA BAHIA • SECRETARIA DA EDUCAÇÃO • CETI NOVA ITARANA
        </span>
      </div>
    </div>
  );
};


