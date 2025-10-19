'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import { addLogoToPDF, addWatermarkToPDF } from './PDFLogo'

interface PDFReportProps {
  title: string
  data: any[]
}

export function PDFReport({ title, data }: PDFReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      const pdf = new jsPDF()
      
      // Add logo at top-left
      await addLogoToPDF({ pdf, x: 20, y: 20, width: 40, height: 40 })
      
      // Add watermark
      addWatermarkToPDF(pdf)
      
      // Add title
      pdf.setFontSize(20)
      pdf.text(title, 70, 40)
      
      // Add content
      pdf.setFontSize(12)
      pdf.text('Universal Printing Press Report', 70, 50)
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 70, 60)
      
      // Add some sample data
      let yPosition = 80
      data.forEach((item, index) => {
        pdf.text(`${index + 1}. ${item.name || item.title || 'Item'}`, 20, yPosition)
        yPosition += 10
      })
      
      // Save the PDF
      pdf.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating}
      className="flex items-center space-x-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      <span>{isGenerating ? 'Generating...' : 'Generate PDF Report'}</span>
    </button>
  )
}
