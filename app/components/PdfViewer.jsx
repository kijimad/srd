'use client'

import { useState, useEffect, useRef } from 'react'
import { Flex, Box } from '@chakra-ui/react'
import Toolbar from './Toolbar'
import ReadingStats from './ReadingStats'

function PdfViewer({ sidebarVisible, onToggleSidebar, pdfUrl, pdfName, initialPage, initialIsTop }) {
  const [pdfjsLib, setPdfjsLib] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageNum, setPageNum] = useState(initialPage)
  const [isTopHalf, setIsTopHalf] = useState(initialIsTop)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [timerKey, setTimerKey] = useState(0)

  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const baseScaleRef = useRef(1.0)
  const renderTaskRef = useRef(null)
  const outputScale = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) * 2 : 2
  const OVERLAP_RATIO = 0.04 // 4% overlap between top and bottom halves

  useEffect(() => {
    // Load PDF.js dynamically on client side only
    import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.mjs'
      setPdfjsLib(pdfjs)
    })
  }, [])

  useEffect(() => {
    if (pdfUrl && pdfjsLib) {
      loadPDF(pdfUrl)
    }
  }, [pdfUrl, pdfjsLib])

  useEffect(() => {
    // Update page and half when props change
    setPageNum(initialPage)
    setIsTopHalf(initialIsTop)
  }, [initialPage, initialIsTop])

  useEffect(() => {
    if (pdfDoc && pdfjsLib) {
      renderPage(pageNum, isTopHalf)
    }
  }, [pdfDoc, pageNum, isTopHalf, zoomLevel, sidebarVisible, pdfjsLib])

  const loadPDF = async (url) => {
    if (!pdfjsLib) return
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/'
      })
      const doc = await loadingTask.promise
      setPdfDoc(doc)
    } catch (error) {
      console.error('Error loading PDF:', error)
    }
  }

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

  const renderPage = async (num, topHalf) => {
    if (!pdfDoc || !canvasRef.current) return

    // Cancel previous render task if it exists
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
    }

    const page = await pdfDoc.getPage(num)
    baseScaleRef.current = calculateScale(page)
    const scale = baseScaleRef.current * zoomLevel

    const viewport = page.getViewport({ scale })
    const halfHeight = viewport.height / 2
    const displayHeight = halfHeight * (1 + OVERLAP_RATIO)

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    canvas.width = Math.floor(viewport.width * outputScale)
    canvas.height = Math.floor(displayHeight * outputScale)
    canvas.style.width = Math.floor(viewport.width) + 'px'
    canvas.style.height = Math.floor(displayHeight) + 'px'

    const yOffset = topHalf ? 0 : -halfHeight * (1 - OVERLAP_RATIO)
    const transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, yOffset * outputScale]
      : [1, 0, 0, 1, 0, yOffset]

    const renderContext = {
      canvasContext: ctx,
      transform: transform,
      viewport: viewport
    }

    renderTaskRef.current = page.render(renderContext)
    try {
      await renderTaskRef.current.promise
      renderTaskRef.current = null
      updateURL()
    } catch (error) {
      // Ignore cancellation errors
      if (error.name !== 'RenderingCancelledException') {
        console.error('Rendering error:', error)
      }
    }
  }

  const updateURL = () => {
    if (!pdfDoc || !pdfName) return
    const params = new URLSearchParams()
    params.set('file', pdfName)
    params.set('page', pageNum)
    params.set('half', isTopHalf ? 'top' : 'bottom')
    const newURL = window.location.pathname + '?' + params.toString()
    window.history.pushState({}, '', newURL)
  }

  const onPrevPage = () => {
    if (isTopHalf) {
      if (pageNum <= 1) return
      setPageNum(pageNum - 1)
      setIsTopHalf(false)
    } else {
      setIsTopHalf(true)
    }
  }

  const onNextPage = () => {
    if (isTopHalf) {
      setIsTopHalf(false)
    } else {
      if (pageNum >= pdfDoc?.numPages) return
      setPageNum(pageNum + 1)
      setIsTopHalf(true)
    }
    setTimerKey(prev => prev + 1) // Reset timer
  }

  const handleCanvasClick = (e) => {
    if (!pdfDoc) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const halfWidth = rect.width / 2

    if (clickX < halfWidth) {
      onPrevPage()
    } else {
      onNextPage()
    }
  }

  const handlePageChange = (newPageNum, newIsTop) => {
    if (!pdfDoc) return
    if (newPageNum < 1 || newPageNum > pdfDoc.numPages) return
    setPageNum(newPageNum)
    setIsTopHalf(newIsTop)
  }

  const handleKeyDown = (e) => {
    // 文字入力中はショートカットを無視する
    const target = e.target
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }

    if (!pdfDoc) return

    if (e.key === 'ArrowLeft') onPrevPage()
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      onNextPage()
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      setZoomLevel(prev => Math.min(prev * 1.2, 5.0))
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      setZoomLevel(prev => Math.max(prev / 1.2, 0.2))
    }
    if (e.key === '0') {
      e.preventDefault()
      setZoomLevel(1.0)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pdfDoc, pageNum, isTopHalf])

  useEffect(() => {
    const handleResize = () => {
      if (pdfDoc) {
        renderPage(pageNum, isTopHalf)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [pdfDoc, pageNum, isTopHalf])

  const displayName = pdfName
    ? pdfName.replace(/\d{8}T\d{6}--/g, '').replace(/\.[^.]+$/, '')
    : 'Select a PDF from the list'

  useEffect(() => {
    document.title = pdfName
      ? displayName + ' - Theater'
      : 'Theater'
  }, [pdfName, displayName])

  return (
    <Flex flex={1} direction="column" bg="gray.800" position="relative">
      <Toolbar
        onToggleSidebar={onToggleSidebar}
        pdfName={displayName}
        pageNum={pageNum}
        totalPages={pdfDoc?.numPages || 0}
        isTopHalf={isTopHalf}
        onPageChange={handlePageChange}
      />
      <Box
        ref={containerRef}
        flex={1}
        display="flex"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
        position="relative"
        p={4}
        cursor="pointer"
        bg="gray.800"
        onClick={handleCanvasClick}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '0.25rem'
          }}
        />
      </Box>
      <Box
        position="fixed"
        bottom={4}
        right={4}
        zIndex={1000}
      >
        <ReadingStats timerKey={timerKey} pageNum={pageNum} isTopHalf={isTopHalf} pdfName={pdfName} />
      </Box>
    </Flex>
  )
}

export default PdfViewer
