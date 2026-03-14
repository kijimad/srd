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
  const [isTopHalf, setIsTopHalf] = useState(true)
  const [urlParams, setUrlParams] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [splitMode, setSplitMode] = useState(true) // true: 上下分割, false: 全体表示
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef(null)

  useEffect(() => {
    // Restore sidebar state from localStorage
    const saved = localStorage.getItem('sidebarVisible')
    if (saved !== null) {
      setSidebarVisible(saved !== 'false')
    }

    // Restore split mode from localStorage
    const savedSplitMode = localStorage.getItem('splitMode')
    if (savedSplitMode !== null) {
      setSplitMode(savedSplitMode !== 'false')
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
    const halfParam = params.get('half') === 'bottom' ? false : true

    if (fileParam) {
      setUrlParams({
        file: fileParam,
        page: pageParam,
        isTop: halfParam
      })
    }
  }, [])

  const toggleSidebar = () => {
    const newValue = !sidebarVisible
    setSidebarVisible(newValue)
    localStorage.setItem('sidebarVisible', newValue)
  }

  const toggleSplitMode = () => {
    const newValue = !splitMode
    setSplitMode(newValue)
    localStorage.setItem('splitMode', newValue)
    // 全体表示に切り替えたときは常に上半分状態にリセット
    if (!newValue) {
      setIsTopHalf(true)
    }
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
    setIsTopHalf(pdfInfo.initialIsTop !== undefined ? pdfInfo.initialIsTop : true)
  }

  const handlePageChange = (newPageNum, newIsTop) => {
    setCurrentPage(newPageNum)
    setIsTopHalf(newIsTop)
  }

  const handlePdfStateUpdate = (state) => {
    if (state.pageNum !== undefined) setCurrentPage(state.pageNum)
    if (state.isTopHalf !== undefined) setIsTopHalf(state.isTopHalf)
    if (state.totalPages !== undefined) setTotalPages(state.totalPages)
  }

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
        isTopHalf={isTopHalf}
        onPageChange={handlePageChange}
        splitMode={splitMode}
        onToggleSplitMode={toggleSplitMode}
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
          onToggleSidebar={toggleSidebar}
          pdfUrl={currentPdf?.url}
          pdfName={currentPdf?.name}
          pageNum={currentPage}
          isTopHalf={isTopHalf}
          splitMode={splitMode}
          onPageChange={handlePageChange}
          onStateUpdate={handlePdfStateUpdate}
        />
      </Flex>
    </Flex>
  )
}
