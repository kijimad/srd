'use client'

import { useEffect, useRef } from 'react'

function FullPdfView({ pdfDoc, pdfjsLib, pageNum, zoomLevel, containerRef, sidebarVisible, onRenderComplete }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) * 2 : 2

  const calculateScale = (page) => {
    if (!containerRef.current) return 1.0
    const containerWidth = containerRef.current.clientWidth - 40
    const containerHeight = containerRef.current.clientHeight - 40

    const viewport = page.getViewport({ scale: 1.0 })
    const scaleX = containerWidth / viewport.width
    const scaleY = containerHeight / viewport.height
    return Math.min(scaleX, scaleY)
  }

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }

    const page = await pdfDoc.getPage(pageNum)
    const baseScale = calculateScale(page)
    const scale = baseScale * zoomLevel

    const viewport = page.getViewport({ scale })
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(viewport.height * outputScale)
    canvas.style.width = Math.floor(viewport.width) + 'px'
    canvas.style.height = Math.floor(viewport.height) + 'px'

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null

    renderTaskRef.current = page.render({
      canvasContext: ctx,
      transform: transform,
      viewport: viewport
    })

    try {
      await renderTaskRef.current.promise
      renderTaskRef.current = null
      onRenderComplete?.()
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Rendering error:', error)
      }
    }
  }

  useEffect(() => {
    if (pdfDoc && pdfjsLib) {
      renderPage()
    }
  }, [pdfDoc, pageNum, zoomLevel, sidebarVisible, pdfjsLib])

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && pdfjsLib) {
        renderPage()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfDoc, pageNum, zoomLevel, pdfjsLib])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pdfDoc && pdfjsLib) {
        renderPage()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pdfDoc, pageNum, zoomLevel, pdfjsLib])

  return (
    <canvas
      ref={canvasRef}
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        borderRadius: '0.25rem'
      }}
    />
  )
}

export default FullPdfView
