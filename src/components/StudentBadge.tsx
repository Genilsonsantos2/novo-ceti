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
      className="w-[86mm] h-[54mm] shrink-0 rounded-xl overflow-hidden shadow-2xl mx-auto print:shadow-none print:mx-0"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div className="relative w-full h-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A3D6B 0%, #00A651 100%)' }}>
        
        {/* Subtle decorative pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-32 h-32 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 border-2 border-white rounded-full"></div>
        </div>
        
        {/* Main container */}
        <div className="relative z-10 h-full flex flex-col p-3 gap-2">
          
          {/* Header Section - Logo + Institution Name */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0 shadow-md border border-white/40">
              <img src="/ceti-logo.png" alt="CETI" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-[10px] leading-none tracking-tight">CETI</h3>
              <p className="text-white/90 text-[6px] leading-tight font-semibold">Colégio Estadual de Tempo Integral</p>
            </div>
            <span className="text-[6px] text-white/80 font-bold tracking-widest shrink-0">{year}</span>
          </div>

          {/* Divider line with accent color */}
          <div className="h-px bg-gradient-to-r from-white/40 via-white/60 to-white/40"></div>

          {/* Main Content Section - Photo + Info + QR */}
          <div className="flex-1 flex gap-2 min-h-0">
            
            {/* Photo Column */}
            {showPhoto && (
              <div className="shrink-0">
                <div className="w-14 h-[calc(100%-2px)] rounded-lg overflow-hidden ring-2 ring-white/30 shadow-lg bg-white/10">
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
            
            {/* Info Column - Central */}
            <div className="flex-1 flex flex-col justify-between min-w-0 gap-1">
              {/* Student Name */}
              <div>
                <h2 className="text-white font-black text-[11px] leading-tight uppercase truncate pr-1">
                  {student.full_name}
                </h2>
                <p className="text-white/95 text-[8px] font-bold mt-0.5">
                  {student.grade || 'Série não informada'}
                </p>
              </div>
              
              {/* ID and Status Row 1 */}
              <div className="bg-white/10 rounded-sm px-2 py-1">
                <div className="flex justify-between gap-3">
                  <div>
                    <span className="block text-[5px] text-white/70 uppercase font-bold tracking-widest leading-none mb-0.5">Matrícula</span>
                    <span className="text-white font-bold text-[9px] tracking-wider font-mono">{student.enrollment_id}</span>
                  </div>
                  <div>
                    <span className="block text-[5px] text-white/70 uppercase font-bold tracking-widest leading-none mb-0.5">Status</span>
                    <div className={`inline-flex items-center gap-1 ${student.is_authorized ? 'text-emerald-200' : 'text-red-200'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span className="text-[8px] font-bold uppercase">{student.is_authorized ? 'ATIVO' : 'BLOQUEADO'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Column - Right */}
            <div className="shrink-0 flex flex-col items-center justify-center gap-0.5">
              <div className="bg-white p-1 rounded shadow-lg border-2 border-white/30">
                <QRCodeSVG value={student.qr_code_id} size={52} level="H" />
              </div>
              <span className="text-[5px] text-white/70 font-mono tracking-wider font-bold">QR ID</span>
            </div>
          </div>
        </div>

        {/* Bottom accent bar - usando cor do logo (laranja/vermelho) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-red-500 to-red-600"></div>
      </div>
    </div>
  );
};
