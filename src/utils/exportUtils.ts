import { saveAs } from 'file-saver';

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
