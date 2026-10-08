import { saveAs } from 'file-saver';

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
