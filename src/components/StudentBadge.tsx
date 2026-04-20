import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const StudentBadge: React.FC<{ student: any }> = ({ student }) => {
  return (
    <div 
      className="w-[86mm] shrink-0 rounded-2xl overflow-hidden shadow-2xl mx-auto"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* ===== FRENTE DO CARTÃO ===== */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #001228 0%, #001e40 35%, #003366 100%)' }}>
        
        {/* Decorative abstract circles */}
        <div className="absolute top-[-40px] right-[-40px] w-[160px] h-[160px] rounded-full border border-white/10"></div>
        <div className="absolute top-[-20px] right-[-20px] w-[100px] h-[100px] rounded-full border border-white/5"></div>
        <div className="absolute bottom-[-60px] left-[-30px] w-[180px] h-[180px] rounded-full bg-white/[0.03]"></div>
        
        {/* Header Bar - Logo + Institution */}
        <div className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-md">
            <img src="/ceti-logo.png" alt="CETI" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-headline font-extrabold text-sm leading-none tracking-tight">CETI</h3>
            <p className="text-white/50 text-[7px] font-bold uppercase tracking-[0.12em] leading-tight mt-0.5">Colégio Estadual de Tempo Integral de Nova Itarana</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[7px] text-white/40 font-bold uppercase tracking-widest block">2026</span>
          </div>
        </div>

        {/* Thin gold accent line */}
        <div className="mx-5 h-[1px] bg-gradient-to-r from-amber-400/60 via-amber-300/40 to-transparent"></div>

        {/* Main Content: Photo + Info + QR */}
        <div className="relative z-10 flex gap-4 px-5 py-4">
          
          {/* Photo */}
          <div className="shrink-0">
            <div className="w-[72px] h-[90px] rounded-xl overflow-hidden ring-2 ring-white/20 shadow-lg">
              <img 
                src={student.photo_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + student.full_name} 
                alt={student.full_name} 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
          
          {/* Student Info */}
          <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
            <div>
              <h2 className="text-white font-headline font-extrabold text-[13px] leading-tight uppercase break-words">{student.full_name}</h2>
              <p className="text-white/50 text-[10px] font-bold mt-1 tracking-wide">{student.grade}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <div>
                <span className="block text-[7px] text-white/30 uppercase tracking-widest font-bold">Matrícula</span>
                <span className="text-white font-bold text-[11px] tracking-wider font-mono">{student.enrollment_id}</span>
              </div>
              <div>
                <span className="block text-[7px] text-white/30 uppercase tracking-widest font-bold">Status</span>
                <div className={`inline-flex items-center gap-1 mt-0.5 ${student.is_authorized ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span className="text-[9px] font-bold uppercase">{student.is_authorized ? 'Ativo' : 'Bloqueado'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className="bg-white p-1.5 rounded-lg shadow-md">
              <QRCodeSVG value={student.qr_code_id} size={58} level="M" />
            </div>
            <span className="text-[6px] text-white/30 font-mono mt-1 tracking-wider">{student.qr_code_id}</span>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500"></div>
      </div>
    </div>
  );
};
