import React, { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface StudentPhotoUploadProps {
  student: any;
  onUploadSuccess: (newUrl: string) => void;
}

export const StudentPhotoUpload: React.FC<StudentPhotoUploadProps> = ({ student, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !student) return;
    try {
      setUploading(true);

      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
          try {
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Falha ao processar a imagem');
            
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error('Erro ao converter imagem para blob'));
            }, 'image/jpeg', 0.85);
            URL.revokeObjectURL(objectUrl);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Falha ao carregar a imagem selecionada'));
        };

        img.src = objectUrl;
      });

      // Upload to Supabase Storage
      const fileName = `student_${student.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update student table with new public URL
      const { data: updatedRows, error: dbError } = await supabase
        .from('students')
        .update({ photo_url: publicUrl })
        .eq('id', student.id)
        .select();
        
      if (dbError) throw dbError;
      
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Permissão negada ou aluno não encontrado no banco de dados.');
      }
      
      onUploadSuccess(publicUrl);
      alert('Foto salva com sucesso!');
    } catch (err: any) {
      console.error('Erro ao processar e salvar a foto:', err);
      alert('Erro ao salvar a foto: ' + (err.message || 'Verifique sua conexão.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">
          {uploading ? 'progress_activity' : 'camera_alt'}
        </span>
        {uploading ? 'Enviando...' : 'Trocar Foto'}
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
        className="hidden"
      />
    </div>
  );
};
