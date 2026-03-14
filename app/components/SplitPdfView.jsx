'use client'

import { useEffect, useRef } from 'react'

const OVERLAP_RATIO = 0.04

function SplitPdfView({ pdfDoc, pdfjsLib, pageNum, isTopHalf, zoomLevel, containerRef, sidebarVisible, onRenderComplete }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) * 2 : 2

  const calculateScale = (page) => {
    if (!containerRef.current) return 1.0
    const containerWidth = containerRef.current.clientWidth - 40
    const containerHeight = containerRef.current.clientHeight - 40

    const viewport = page.getViewport({ scale: 1.0 })
    const halfHeight = viewport.height / 2
    const displayHeight = halfHeight * (1 + OVERLAP_RATIO)

    const scaleX = containerWidth / viewport.width
    const scaleY = containerHeight / displayHeight
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

    const halfHeight = viewport.height / 2
    const displayHeight = halfHeight * (1 + OVERLAP_RATIO)
    const yOffset = isTopHalf ? 0 : -halfHeight * (1 - OVERLAP_RATIO)

    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(displayHeight * outputScale)
    canvas.style.width = Math.floor(viewport.width) + 'px'
    canvas.style.height = Math.floor(displayHeight) + 'px'

    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, yOffset * outputScale]
      : [1, 0, 0, 1, 0, yOffset]

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
  }, [pdfDoc, pageNum, isTopHalf, zoomLevel, sidebarVisible, pdfjsLib])

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc && pdfjsLib) {
        renderPage()
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfDoc, pageNum, isTopHalf, zoomLevel, pdfjsLib])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pdfDoc && pdfjsLib) {
        renderPage()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pdfDoc, pageNum, isTopHalf, zoomLevel, pdfjsLib])

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

export default SplitPdfView
