'use client'

import { useEffect, useRef } from 'react'
import jsPDF from 'jspdf'

interface PDFLogoProps {
  pdf: jsPDF
  x?: number
  y?: number
  width?: number
  height?: number
  watermark?: boolean
}

export function addLogoToPDF({ 
  pdf, 
  x = 20, 
  y = 20, 
  width = 40, 
  height = 40,
  watermark = false 
}: PDFLogoProps) {
  // Create a canvas to load and process the image
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return

  // Set canvas size
  canvas.width = width
  canvas.height = height

  // Create an image element
  const img = new Image()
  img.crossOrigin = 'anonymous'
  
  img.onload = () => {
    // Draw the image on canvas
    ctx.drawImage(img, 0, 0, width, height)
    
    // Get image data
    const imageData = canvas.toDataURL('image/png')
    
    if (watermark) {
      // Add as watermark (faint background)
      pdf.setGState(new pdf.GState({ opacity: 0.1 }))
      pdf.addImage(imageData, 'PNG', x, y, width, height)
      pdf.setGState(new pdf.GState({ opacity: 1 }))
    } else {
      // Add as regular logo
      pdf.addImage(imageData, 'PNG', x, y, width, height)
    }
  }
  
  // Load the logo image
  img.src = '/assets/logo/logo.png'
}

export function addWatermarkToPDF(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  
  // Add watermark in center of page
  addLogoToPDF({
    pdf,
    x: pageWidth / 2 - 50,
    y: pageHeight / 2 - 50,
    width: 100,
    height: 100,
    watermark: true
  })
}














