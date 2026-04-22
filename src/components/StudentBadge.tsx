import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  const year = new Date().getFullYear();

  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-2xl overflow-hidden shadow-2xl mx-auto print:shadow-none print:mx-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #001228 0%, #001e44 40%, #003d66 100%)' }}>
        
        {/* Decorative background elements */}
        <div className="absolute top-[-45px] right-[-45px] w-[200px] h-[200px] rounded-full border border-white/8 opacity-60"></div>
        <div className="absolute bottom-[-60px] left-[-40px] w-[220px] h-[220px] rounded-full bg-gradient-to-t from-white/5 to-transparent"></div>
        
        {/* Main container with flexbox */}
        <div className="relative z-10 h-full flex flex-col">
          
          {/* Header Section */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-white/10">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center shrink-0 shadow-md">
              <img src="/ceti-logo.png" alt="CETI" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-headline font-extrabold text-xs leading-none tracking-tight">CETI</h3>
              <p className="text-white/50 text-[5px] font-bold uppercase tracking-[0.08em] leading-tight">Colégio Estadual de Tempo Integral</p>
            </div>
            <span className="text-[6px] text-white/40 font-bold uppercase tracking-widest shrink-0">{year}</span>
          </div>

          {/* Content Section - Flexible */}
          <div className="flex-1 flex gap-3 px-4 py-3">
            
            {/* Photo Column */}
            {showPhoto && (
              <div className="shrink-0">
                <div className="w-16 h-[calc(100%-2px)] rounded-lg overflow-hidden ring-2 ring-white/20 shadow-lg bg-gradient-to-br from-white/10 to-white/5">
                  <img 
                    src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=random`} 
                    alt={student.full_name} 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=random`;
                    }}
                  />
                </div>
              </div>
            )}
            
            {/* Info Column */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              {/* Student Name and Grade */}
              <div>
                <h2 className="text-white font-headline font-extrabold text-xs leading-tight uppercase truncate pr-1">
                  {student.full_name}
                </h2>
                <p className="text-white/60 text-[8px] font-bold mt-0.5 tracking-wide truncate">
                  {student.grade || 'Série não informada'}
                </p>
              </div>
              
              {/* ID and Status Info */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div className="flex flex-col">
                  <span className="block text-[5px] text-white/40 uppercase tracking-widest font-bold leading-none">Matrícula</span>
                  <span className="text-white font-bold text-[9px] tracking-wider font-mono leading-tight">{student.enrollment_id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="block text-[5px] text-white/40 uppercase tracking-widest font-bold leading-none">Status</span>
                  <div className={`inline-flex items-center gap-1 mt-0.5 ${student.is_authorized ? 'text-emerald-300' : 'text-red-300'}`}>
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    <span className="text-[7px] font-bold uppercase leading-none">{student.is_authorized ? 'Ativo' : 'Bloqueado'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Column */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-1">
              <div className="bg-white p-1 rounded-lg shadow-md border border-white/20">
                <QRCodeSVG value={student.qr_code_id} size={48} level="H" />
              </div>
              <span className="text-[4px] text-white/30 font-mono tracking-widest text-center leading-tight">ID</span>
            </div>
          </div>
        </div>

        {/* Bottom accent bar with gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-lg"></div>
      </div>
    </div>
  );
};
