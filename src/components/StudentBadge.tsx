import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const StudentBadge: React.FC<{ student: any }> = ({ student }) => {
  return (
    <div className="id-gradient rounded-[1.5rem] p-6 shadow-xl relative overflow-hidden text-white w-[85mm] h-[55mm] md:w-full md:h-auto md:max-w-md mx-auto flex flex-col justify-between shrink-0" style={{WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact'}}>
      {/* Decorative Blur */}
      <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl opacity-90">school</span>
          <div>
            <span className="block text-[8px] font-bold tracking-widest uppercase opacity-70 leading-none">CETI</span>
            <span className="block text-[10px] font-bold tracking-wider leading-none mt-0.5">Nova Itarana</span>
          </div>
        </div>
        <div className="text-right">
          <span className="block text-[8px] uppercase tracking-widest opacity-70">ESTUDANTE</span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 flex gap-4 items-center flex-1">
        
        {/* Photo Container */}
        <div className="w-20 h-24 rounded-xl overflow-hidden shadow-lg bg-white/10 shrink-0 border border-white/20">
          <img src={student.photo_url || "https://via.placeholder.com/150"} alt={student.full_name} className="w-full h-full object-cover" />
        </div>
        
        {/* Data & QR Code */}
        <div className="flex-1 flex px-1">
          {/* Main Info */}
          <div className="flex-1 flex flex-col justify-center">
            <h2 className="font-headline text-lg font-bold leading-tight uppercase line-clamp-2">{student.full_name}</h2>
            <p className="text-white/70 font-medium tracking-wide text-xs mt-1 mb-2">{student.grade}</p>
            
            <div>
              <span className="block text-[8px] uppercase tracking-widest opacity-60">Matrícula</span>
              <span className="font-bold tracking-wider text-xs">{student.enrollment_id}</span>
            </div>
          </div>
          
          {/* QR Code integrated into card */}
          <div className="pl-3 border-l border-white/20 ml-3 flex flex-col items-center justify-center shrink-0">
            <div className="bg-white p-1.5 rounded-lg mb-1 shadow-inner">
              <QRCodeSVG value={student.qr_code_id} size={50} />
            </div>
            <div className={`mt-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider ${
              student.is_authorized ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-error-container text-on-error-container'
            }`}>
              {student.is_authorized ? 'ATIVO' : 'BLOQUEADO'}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
