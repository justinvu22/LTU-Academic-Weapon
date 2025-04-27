import React from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const ExportControls = ({ charts, data }) => {
  const exportChartAsImage = async (chartId) => {
    const element = document.getElementById(chartId);
    if (!element) return;

    const canvas = await html2canvas(element);
    const image = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `${chartId}-${new Date().toISOString()}.png`;
    link.href = image;
    link.click();
  };

  const exportReportAsPDF = async () => {
    const doc = new jsPDF();
    let yPosition = 10;

    // Add title
    doc.setFontSize(20);
    doc.text('ShadowSight Dashboard Report', 20, yPosition);
    yPosition += 20;

    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 20;

    // Add summary
    doc.setFontSize(14);
    doc.text('Summary', 20, yPosition);
    yPosition += 10;
    doc.setFontSize(12);
    doc.text(`Total Activities: ${data.length}`, 20, yPosition);
    yPosition += 10;
    doc.text(`Anomalies Detected: ${data.filter(d => d.isAnomaly).length}`, 20, yPosition);
    yPosition += 20;

    // Export each chart
    for (const chartId of charts) {
      const element = document.getElementById(chartId);
      if (!element) continue;

      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      // Add chart title
      doc.setFontSize(14);
      doc.text(chartId.replace(/([A-Z])/g, ' $1').trim(), 20, yPosition);
      yPosition += 10;

      // Add chart image
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth() - 40;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      doc.addImage(imgData, 'PNG', 20, yPosition, pdfWidth, pdfHeight);
      yPosition += pdfHeight + 20;

      // Add new page if needed
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 10;
      }
    }

    doc.save(`shadowSight-report-${new Date().toISOString()}.pdf`);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold">Export Options</h3>
      <div className="flex flex-wrap gap-4">
        {charts.map(chartId => (
          <button
            key={chartId}
            onClick={() => exportChartAsImage(chartId)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export {chartId} as PNG
          </button>
        ))}
        <button
          onClick={exportReportAsPDF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Export Full Report as PDF
        </button>
      </div>
    </div>
  );
};

export default ExportControls; 