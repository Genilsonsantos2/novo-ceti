import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-[1.2rem] overflow-hidden shadow-2xl mx-auto relative group bg-[#001228] border border-white/10"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* Background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[120%] bg-primary/20 blur-[60px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[100%] bg-tertiary-fixed/10 blur-[50px] rounded-full"></div>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
      </div>

      {/* Main Card Content */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-lg shadow-black/20 flex items-center justify-center">
              <img src="/ceti-logo.png" alt="CETI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-white font-headline font-black text-base leading-none tracking-tighter">CETI</h3>
              <p className="text-white/40 text-[6px] font-bold uppercase tracking-[0.2em] mt-0.5">Colégio Estadual de Tempo Integral</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/30 text-[8px] font-black tracking-widest uppercase">Identidade Estudantil</div>
            <div className="text-amber-400 font-black text-[10px] mt-0.5">2026</div>
          </div>
        </div>

        {/* Decorative holographic-ish line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"></div>

        {/* Body */}
        <div className="flex-1 px-5 py-3 flex gap-4">
          {/* Photo Section */}
          <div className="relative">
            <div className="w-[75px] h-[95px] rounded-lg overflow-hidden border-2 border-white/20 shadow-xl relative z-10">
              {showPhoto ? (
                <img 
                  src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}`} 
                  alt={student.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white/20 text-4xl">person</span>
                </div>
              )}
            </div>
            {/* Holographic sticker effect */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-60 blur-[1px] border border-white/40 flex items-center justify-center z-20">
              <span className="material-symbols-outlined text-[10px] text-white font-bold">verified</span>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 flex flex-col justify-between py-0.5">
            <div>
              <h2 className="text-white font-headline font-black text-[14px] leading-tight uppercase tracking-tight line-clamp-2">
                {student.full_name}
              </h2>
              <div className="inline-block mt-1 px-2 py-0.5 bg-white/10 rounded-md border border-white/5">
                <span className="text-white/70 text-[9px] font-bold uppercase tracking-wider">{student.grade}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[6px] text-white/30 font-black uppercase tracking-widest block">Matrícula</span>
                <span className="text-white font-mono font-bold text-[11px] tracking-tight">{student.enrollment_id}</span>
              </div>
              <div className="text-right">
                <span className="text-[6px] text-white/30 font-black uppercase tracking-widest block">Acesso</span>
                <div className={`flex items-center justify-end gap-1 ${student.is_authorized ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className="w-1 h-1 rounded-full bg-current shadow-[0_0_4px_currentColor]"></span>
                  <span className="text-[8px] font-black uppercase">{student.is_authorized ? 'Liberado' : 'Restrito'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-1.5 rounded-xl shadow-2xl ring-4 ring-black/20">
              <QRCodeSVG value={student.qr_code_id} size={54} level="H" />
            </div>
            <span className="text-[6px] font-mono text-white/20 mt-1.5 font-bold uppercase tracking-widest">{student.qr_code_id}</span>
          </div>
        </div>

        {/* Footer Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-[#001228] via-primary to-[#001228] opacity-50"></div>
      </div>
    </div>
  );
};
