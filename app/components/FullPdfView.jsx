'use client'

import { useEffect, useRef, useState } from 'react'
import { Box } from '@chakra-ui/react'
import 'pdfjs-dist/web/pdf_viewer.css'

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
          // Set initial page
          if (initialPageRef.current && initialPageRef.current > 0) {
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

  // Handle page changes from external source (slider)
  useEffect(() => {
    if (!viewerRef.current || !viewerReady) return

    if (viewerRef.current.currentPageNumber !== pageNum) {
      viewerRef.current.currentPageNumber = pageNum
    }
  }, [pageNum, viewerReady])

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

  return (
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
  )
}

export default FullPdfView
