'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Flex, Box } from '@chakra-ui/react'
import Sidebar from './Sidebar'
import PdfViewer from './PdfViewer'
import Toolbar from './Toolbar'

export default function MainContent() {
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [currentPdf, setCurrentPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [urlParams, setUrlParams] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [scaleValue, setScaleValue] = useState('page-width')
  const [currentScale, setCurrentScale] = useState(1)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef(null)

  useEffect(() => {
    // Restore sidebar state from localStorage
    const saved = localStorage.getItem('sidebarVisible')
    if (saved !== null) {
      setSidebarVisible(saved !== 'false')
    }

    // Restore sidebar width from localStorage
    const savedWidth = localStorage.getItem('sidebarWidth')
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth) || 320)
    }

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search)
    const fileParam = params.get('file')
    const pageParam = parseInt(params.get('page')) || 1

    if (fileParam) {
      setUrlParams({
        file: fileParam,
        page: pageParam,
      })
    }
  }, [])

  const toggleSidebar = () => {
    const newValue = !sidebarVisible
    setSidebarVisible(newValue)
    localStorage.setItem('sidebarVisible', newValue)
  }

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = sidebarWidth

    const handleMouseMove = (e) => {
      const newWidth = Math.max(200, Math.min(600, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('sidebarWidth', sidebarWidth.toString())
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [sidebarWidth])

  const handlePdfLoad = (pdfInfo) => {
    setCurrentPdf(pdfInfo)
    setCurrentPage(pdfInfo.initialPage || 1)
  }

  const handlePageChange = (newPageNum) => {
    setCurrentPage(newPageNum)
  }

  const handleScaleChange = (newScale) => {
    setCurrentScale(newScale)
  }

  const handleScaleValueChange = (newScaleValue) => {
    setScaleValue(newScaleValue)
  }

  const handleZoomIn = () => {
    setScaleValue(currentScale * 1.25)
  }

  const handleZoomOut = () => {
    setScaleValue(currentScale / 1.25)
  }

  const handlePdfStateUpdate = (state) => {
    if (state.pageNum !== undefined) setCurrentPage(state.pageNum)
    if (state.totalPages !== undefined) setTotalPages(state.totalPages)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        handleZoomIn()
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        handleZoomOut()
      }
      if (e.key === '0') {
        e.preventDefault()
        setScaleValue('page-width')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentScale])

  const displayName = currentPdf?.name
    ? currentPdf.name.replace(/\d{8}T\d{6}--/g, '').replace(/\.[^.]+$/, '')
    : '----'

  return (
    <Flex h="100vh" overflow="hidden" direction="column">
      <Toolbar
        onToggleSidebar={toggleSidebar}
        pdfName={displayName}
        pageNum={currentPage}
        totalPages={totalPages}
        scaleValue={scaleValue}
        currentScale={currentScale}
        onScaleValueChange={handleScaleValueChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />
      <Flex flex={1} overflow="hidden">
        <Sidebar
          visible={sidebarVisible}
          width={sidebarWidth}
          onPdfSelect={handlePdfLoad}
          currentPdfPath={currentPdf?.path}
          urlParams={urlParams}
        />
        {sidebarVisible && (
          <Box
            w="4px"
            cursor="col-resize"
            bg={isResizing ? 'blue.500' : 'transparent'}
            _hover={{ bg: 'blue.500' }}
            transition="background 0.15s"
            onMouseDown={handleResizeStart}
            flexShrink={0}
          />
        )}
        <PdfViewer
          sidebarVisible={sidebarVisible}
          pdfUrl={currentPdf?.url}
          pdfPath={currentPdf?.path}
          pdfName={currentPdf?.name}
          pageNum={currentPage}
          onPageChange={handlePageChange}
          onStateUpdate={handlePdfStateUpdate}
          scaleValue={scaleValue}
          onScaleChange={handleScaleChange}
        />
      </Flex>
    </Flex>
  )
}
