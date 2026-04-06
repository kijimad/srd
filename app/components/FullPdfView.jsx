'use client'

import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, VStack } from '@chakra-ui/react'
import { BsChevronUp, BsChevronDown } from 'react-icons/bs'
import 'pdfjs-dist/web/pdf_viewer.css'

function NavButton({ icon, onClick, label }) {
  return (
    <IconButton
      icon={icon}
      onClick={onClick}
      aria-label={label}
      title={label}
      size="md"
      isRound
      bg="blackAlpha.700"
      color="white"
      _hover={{ bg: 'blackAlpha.800' }}
      boxShadow="md"
    />
  )
}

function FullPdfView({ pdfDoc, pdfjsLib, pageNum, scaleValue, sidebarVisible, onPageChange, onScaleChange }) {
  const viewerContainerRef = useRef(null)
  const viewerRef = useRef(null)
  const eventBusRef = useRef(null)
  const [viewerReady, setViewerReady] = useState(false)
  const lastScaleValue = useRef(scaleValue)
  const initializedRef = useRef(false)
  const initialPageRef = useRef(pageNum)

  // Initialize PDF Viewer
  useEffect(() => {
    if (!viewerContainerRef.current || !pdfjsLib || initializedRef.current) return

    const initViewer = async () => {
      try {
        const pdfjsViewer = await import('pdfjs-dist/web/pdf_viewer.mjs')

        const eventBus = new pdfjsViewer.EventBus()
        eventBusRef.current = eventBus

        const pdfLinkService = new pdfjsViewer.PDFLinkService({
          eventBus,
        })

        const container = viewerContainerRef.current
        const viewer = container.querySelector('.pdfViewer')

        if (!viewer) {
          console.error('Could not find .pdfViewer element')
          return
        }

        const pdfViewer = new pdfjsViewer.PDFViewer({
          container: container,
          viewer: viewer,
          eventBus,
          linkService: pdfLinkService,
          textLayerMode: 2,
          removePageBorders: true,
          maxCanvasPixels: -1,
        })

        pdfLinkService.setViewer(pdfViewer)
        viewerRef.current = pdfViewer
        initializedRef.current = true

        eventBus.on('pagechanging', (evt) => {
          onPageChange?.(evt.pageNumber)
        })

        eventBus.on('scalechanging', (evt) => {
          onScaleChange?.(evt.scale)
        })

        eventBus.on('pagesinit', () => {
          if (typeof scaleValue === 'number') {
            pdfViewer.currentScale = scaleValue
          } else {
            pdfViewer.currentScaleValue = scaleValue || 'page-width'
          }
          // Clamp to pagesCount; pdf.js logs an error for out-of-range pages.
          if (initialPageRef.current > 0 && initialPageRef.current <= pdfViewer.pagesCount) {
            pdfViewer.currentPageNumber = initialPageRef.current
          }
        })

        setViewerReady(true)
      } catch (error) {
        console.error('Error initializing PDF viewer:', error)
      }
    }

    initViewer()

    return () => {
      if (viewerRef.current) {
        viewerRef.current.cleanup()
        viewerRef.current = null
        initializedRef.current = false
      }
    }
  }, [pdfjsLib])

  // Load PDF document
  useEffect(() => {
    if (!viewerRef.current || !pdfDoc || !viewerReady) return

    // Update initial page ref before loading new document
    initialPageRef.current = pageNum
    viewerRef.current.setDocument(pdfDoc)
  }, [pdfDoc, viewerReady])

  // Handle scale changes
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return
    if (scaleValue === lastScaleValue.current) return

    lastScaleValue.current = scaleValue

    if (typeof scaleValue === 'number') {
      viewerRef.current.currentScale = scaleValue
    } else {
      viewerRef.current.currentScaleValue = scaleValue
    }
  }, [scaleValue, viewerReady])

  // Trigger resize when sidebar toggles
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return

    const timer = setTimeout(() => {
      if (viewerRef.current) {
        viewerRef.current.update()
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [sidebarVisible, viewerReady])

  const scrollByViewport = (direction) => {
    const container = viewerContainerRef.current
    if (!container) return
    const pageEl = container.querySelector('.page')
    const pageH = pageEl?.clientHeight ?? container.clientHeight
    // Overlap proportional to page height so context scales with zoom/device
    const overlap = pageH * 0.3
    const delta = Math.max(container.clientHeight - overlap, container.clientHeight * 0.2)
    container.scrollBy({ top: delta * direction })
  }

  return (
    <>
      <Box
        ref={viewerContainerRef}
        w="100%"
        h="100%"
        overflow="auto"
        position="absolute"
        bg="gray.800"
        sx={{
          '.pdfViewer': {
            paddingTop: '10px',
            paddingBottom: '10px',
          },
          '.page': {
            marginBottom: '10px',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)',
          },
          '.textLayer': {
            opacity: 1,
          },
        }}
      >
        <div className="pdfViewer"></div>
      </Box>
      <VStack position="absolute" top={4} right={8} spacing={2} zIndex={10}>
        <NavButton icon={<BsChevronUp />} onClick={() => scrollByViewport(-1)} label="前へ（表示領域分）" />
        <NavButton icon={<BsChevronDown />} onClick={() => scrollByViewport(1)} label="次へ（表示領域分）" />
      </VStack>
    </>
  )
}

export default FullPdfView
