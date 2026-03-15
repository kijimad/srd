'use client'

import { useState, useEffect, useRef } from 'react'
import { Flex, Box, Text, Spinner, VStack } from '@chakra-ui/react'
import FullPdfView from './FullPdfView'

function PdfViewer({ sidebarVisible, pdfUrl, pdfName, pageNum, onPageChange, onStateUpdate, scaleValue, onScaleChange }) {
  const [pdfjsLib, setPdfjsLib] = useState(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

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
    setPdfDoc(null)
    setIsLoading(true)
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
    } finally {
      setIsLoading(false)
    }
  }

  const updateURL = () => {
    if (!pdfDoc || !pdfName) return
    const params = new URLSearchParams()
    params.set('file', pdfName)
    params.set('page', pageNum)
    const newURL = window.location.pathname + '?' + params.toString()
    window.history.replaceState({}, '', newURL)
  }

  useEffect(() => {
    updateURL()
  }, [pageNum, pdfName])

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

    if (isLoading || !pdfDoc) {
      return (
        <VStack spacing={3}>
          <Spinner size="lg" color="blue.400" thickness="3px" />
          <Text color="gray.500">読み込み中...</Text>
        </VStack>
      )
    }

    return (
      <FullPdfView
        pdfDoc={pdfDoc}
        pdfjsLib={pdfjsLib}
        pageNum={pageNum}
        scaleValue={scaleValue}
        sidebarVisible={sidebarVisible}
        onPageChange={onPageChange}
        onScaleChange={onScaleChange}
      />
    )
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
        bg="gray.800"
      >
        {renderPdfView()}
      </Box>
    </Flex>
  )
}

export default PdfViewer
