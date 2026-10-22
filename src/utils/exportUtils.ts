import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

export const exportElementToPDF = async (
  element: HTMLElement | null,
  filename: string,
  title?: string
) => {
  if (!element) {
    alert('Conteúdo para exportação não encontrado.');
    return;
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add('pdf-export-mode');
  [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('[class]'))].forEach(node => {
    const darkModeClasses = Array.from(node.classList).filter(className => className.startsWith('dark:'));
    node.classList.remove(...darkModeClasses);
  });
  clone.style.width = '210mm';
  clone.style.backgroundColor = '#ffffff';
  clone.style.position = 'absolute';
  clone.style.left = '-10000px';
  clone.style.top = '0';

  if (title) {
    const heading = document.createElement('h1');
    heading.textContent = title;
    heading.style.cssText = 'font: 700 18px Arial, sans-serif; margin: 0 0 16px; padding: 0 0 8px; border-bottom: 1px solid #d1d5db; color: #111827;';
    clone.prepend(heading);
  }

  const options = {
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: ['tr', '.pdf-keep-together', '.page-container'],
    },
  };

  try {
    document.body.appendChild(clone);
    await html2pdf()
      .set(options)
      .from(clone)
      .save();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Erro ao gerar PDF.');
  } finally {
    clone.remove();
  }
};

export const printElementAsPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Permita a abertura de janelas para gerar o PDF.');
    return;
  }

  const printDocument = printWindow.document;
  printDocument.open();
  printDocument.write('<!doctype html><html><head><meta charset="utf-8"><title></title></head><body></body></html>');
  printDocument.close();
  printDocument.title = filename;

  const stylesheetLoads = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).map(source => new Promise<void>(resolve => {
    const stylesheet = source.cloneNode(true) as HTMLLinkElement;
    stylesheet.onload = () => resolve();
    stylesheet.onerror = () => resolve();
    printDocument.head.appendChild(stylesheet);
  }));
  document.querySelectorAll('style').forEach(source => printDocument.head.appendChild(source.cloneNode(true)));

  const printRoot = printDocument.createElement('main');
  printRoot.className = 'pdf-print-root';
  printRoot.appendChild(element.cloneNode(true));
  printDocument.body.appendChild(printRoot);

  const printStyles = printDocument.createElement('style');
  printStyles.textContent = `
    html, body { margin: 0; padding: 0; background: #fff; }
    .pdf-print-root { width: 100%; margin: 0 auto; background: #fff; }
    .pdf-print-root > * { width: 100% !important; max-width: 100% !important; margin-left: auto !important; margin-right: auto !important; }
    @media print {
      @page { size: A4 portrait; margin: 12mm; }
      html, body { width: auto; height: auto; background: #fff !important; }
      .pdf-print-root { width: 100%; margin: 0; }
      .pdf-print-root > * { box-shadow: none !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  `;
  printDocument.head.appendChild(printStyles);

  await Promise.all(stylesheetLoads);
  await printDocument.fonts.ready;
  await Promise.all(Array.from(printRoot.querySelectorAll('img')).map(image => image.decode().catch(() => undefined)));
  printWindow.onafterprint = () => printWindow.close();
  printWindow.focus();
  printWindow.print();
};

export const exportToPDF = async (elementId: string, filename: string) => {
  await exportElementToPDF(document.getElementById(elementId), filename);
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
