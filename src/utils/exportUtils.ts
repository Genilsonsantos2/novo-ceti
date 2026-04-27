import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const width = pdf.internal.pageSize.getWidth();

  try {
    // Clone the element to avoid changing the UI during export
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = '210mm'; // Set to A4 width
    clone.style.background = 'white';
    
    // Temporarily append to body to render
    document.body.appendChild(clone);

    await pdf.html(clone, {
      callback: function (doc) {
        doc.save(`${filename}.pdf`);
        document.body.removeChild(clone);
      },
      x: 0,
      y: 0,
      width: width,
      windowWidth: element.offsetWidth,
      autoPaging: 'slice', // This handles slicing but pdf.html() is generally better at not cutting lines
      html2canvas: {
        scale: 0.2645833333, // Convert px to mm (approximately)
        useCORS: true,
        logging: false,
      }
    });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
  }
};

export const exportToWord = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const htmlContent = element.innerHTML;
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Export</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .print-hidden { display: none !important; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid black; padding: 8px; text-align: left; }
        img { max-width: 100%; height: auto; }
        /* Basic styling for Word consistency */
        h1, h2, h3 { color: #1a1a1a; }
        .text-primary { color: #3b82f6; }
      </style>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', header], {
    type: 'application/msword',
  });

  saveAs(blob, `${filename}.doc`);
};
