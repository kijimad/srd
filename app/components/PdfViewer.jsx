'use client'

import { useState, useEffect, useRef } from 'react'
import { Flex, Box, Text } from '@chakra-ui/react'
import SplitPdfView from './SplitPdfView'
import FullPdfView from './FullPdfView'

function PdfViewer({ sidebarVisible, pdfUrl, pdfName, pageNum, isTopHalf, splitMode, onPageChange, onStateUpdate }) {
  const [pdfjsLib, setPdfjsLib] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1.0)

  const containerRef = useRef(null)

  useEffect(() => {
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

  const loadPDF = async (url) => {
    if (!pdfjsLib) return
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/standard_fonts/',
        wasmUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/wasm/',
      })
      const doc = await loadingTask.promise
      setPdfDoc(doc)
      onStateUpdate({ totalPages: doc.numPages })
    } catch (error) {
      console.error('Error loading PDF:', error)
    }
  }

  const updateURL = () => {
    if (!pdfDoc || !pdfName) return
    const params = new URLSearchParams()
    params.set('file', pdfName)
    params.set('page', pageNum)
    if (splitMode) {
      params.set('half', isTopHalf ? 'top' : 'bottom')
    }
    const newURL = window.location.pathname + '?' + params.toString()
    window.history.pushState({}, '', newURL)
  }

  const onPrevPage = () => {
    if (splitMode) {
      if (isTopHalf) {
        if (pageNum <= 1) return
        onPageChange(pageNum - 1, false)
      } else {
        onPageChange(pageNum, true)
      }
    } else {
      if (pageNum <= 1) return
      onPageChange(pageNum - 1, true)
    }
  }

  const onNextPage = () => {
    if (splitMode) {
      if (isTopHalf) {
        onPageChange(pageNum, false)
      } else {
        if (pageNum >= pdfDoc?.numPages) return
        onPageChange(pageNum + 1, true)
      }
    } else {
      if (pageNum >= pdfDoc?.numPages) return
      onPageChange(pageNum + 1, true)
    }
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

  const handleKeyDown = (e) => {
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
  }, [pdfDoc, pageNum, isTopHalf, splitMode])

  useEffect(() => {
    if (pdfName) {
      const displayName = pdfName.replace(/\d{8}T\d{6}--/g, '').replace(/\.[^.]+$/, '')
      document.title = displayName + ' - Theater'
    } else {
      document.title = 'Theater'
    }
  }, [pdfName])

  const renderPdfView = () => {
    if (!pdfUrl) {
      return <Text color="gray.500">サイドバーからPDFを選択してください</Text>
    }

    if (splitMode) {
      return (
        <SplitPdfView
          pdfDoc={pdfDoc}
          pdfjsLib={pdfjsLib}
          pageNum={pageNum}
          isTopHalf={isTopHalf}
          zoomLevel={zoomLevel}
          containerRef={containerRef}
          sidebarVisible={sidebarVisible}
          onRenderComplete={updateURL}
        />
      )
    } else {
      return (
        <FullPdfView
          pdfDoc={pdfDoc}
          pdfjsLib={pdfjsLib}
          pageNum={pageNum}
          zoomLevel={zoomLevel}
          containerRef={containerRef}
          sidebarVisible={sidebarVisible}
          onRenderComplete={updateURL}
        />
      )
    }
  }

  return (
    <Flex flex={1} direction="column" bg="gray.800" position="relative">
      <Box
        ref={containerRef}
        flex={1}
        display="flex"
        justifyContent="center"
        alignItems="center"
        overflow="hidden"
        position="relative"
        pt={1}
        px={4}
        pb={4}
        cursor={pdfUrl ? 'pointer' : 'default'}
        bg="gray.800"
        onClick={handleCanvasClick}
      >
        {renderPdfView()}
      </Box>
    </Flex>
  )
}

export default PdfViewer
