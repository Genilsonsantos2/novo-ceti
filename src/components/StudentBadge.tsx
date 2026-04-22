import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface StudentBadgeProps {
  student: any;
  showPhoto?: boolean;
}

export const StudentBadge: React.FC<StudentBadgeProps> = ({ student, showPhoto = true }) => {
  const year = new Date().getFullYear();
  const isAuthorized = student.is_authorized;

  return (
    <div 
      className="w-[86mm] h-[54mm] shrink-0 rounded-lg overflow-hidden shadow-2xl mx-auto print:shadow-none print:mx-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="relative w-full h-full flex overflow-hidden" style={{ background: isAuthorized ? 'linear-gradient(135deg, #1A3D6B 0%, #00A651 100%)' : 'linear-gradient(135deg, #c41e3a 0%, #8b1428 100%)' }}>
        
        {/* LEFT SIDE - PHOTO (MAIN FOCUS) */}
        <div className="relative w-[40%] h-full bg-white/10 flex items-center justify-center border-r-2" style={{ borderColor: isAuthorized ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)' }}>
          {showPhoto && (
            <img 
              src={student.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=random`} 
              alt={student.full_name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = `https://api.dicebear.com/7.x/initials/svg?seed=${student.full_name}&backgroundColor=random`;
              }}
            />
          )}
          {!showPhoto && (
            <span className="material-symbols-outlined text-white text-5xl opacity-30">person</span>
          )}
        </div>

        {/* RIGHT SIDE - INFORMATION */}
        <div className="flex-1 flex flex-col justify-between p-3 relative z-10">
          
          {/* TOP - School Info + Year */}
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-black text-[8px] leading-none uppercase tracking-tight">CETI</h3>
              <p className="text-white/90 text-[5px] leading-none font-bold mt-0.5">Nova Itarana</p>
            </div>
            <span className="text-white/80 font-black text-[10px] tracking-tight shrink-0">{year}</span>
          </div>

          {/* MIDDLE - STUDENT INFO (MAIN CONTENT) */}
          <div className="flex-1 flex flex-col justify-center gap-1">
            {/* Name - LARGE - Most important */}
            <div className="bg-white/15 px-2 py-1.5 rounded-md">
              <h2 className="text-white font-black text-[12px] leading-tight uppercase break-words">
                {student.full_name.split(' ').slice(0, 3).join(' ')}
              </h2>
              <p className="text-white/95 text-[9px] font-bold mt-0.5">
                {student.grade}
              </p>
            </div>

            {/* ID Badge */}
            <div className="flex gap-1 text-[7px]">
              <div className="flex-1 bg-white/10 px-1.5 py-1 rounded">
                <span className="text-white/70 block font-bold leading-none">RM</span>
                <span className="text-white font-black text-[9px] tracking-wider">{student.enrollment_id}</span>
              </div>
            </div>
          </div>

          {/* BOTTOM - STATUS + QR */}
          <div className="flex items-end gap-2 mt-1">
            
            {/* STATUS - HIGHLY VISIBLE */}
            <div className={`flex-1 rounded-md px-2 py-1.5 flex flex-col items-center justify-center border-2 ${
              isAuthorized 
                ? 'bg-emerald-400/30 border-emerald-300 text-emerald-100' 
                : 'bg-red-500/40 border-red-300 text-red-100'
            }`}>
              <span className="material-symbols-outlined text-[14px] leading-none font-black">
                {isAuthorized ? 'check_circle' : 'cancel'}
              </span>
              <span className="text-[7px] font-black uppercase tracking-tight leading-none mt-0.5">
                {isAuthorized ? 'OK' : 'BLOQ'}
              </span>
            </div>

            {/* QR CODE - COMPACT */}
            <div className="bg-white p-0.5 rounded shadow-sm border border-white/40">
              <QRCodeSVG value={student.qr_code_id} size={42} level="H" />
            </div>
          </div>
        </div>

        {/* ACCENT BAR - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-red-600"></div>
      </div>
    </div>
  );
};
