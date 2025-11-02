'use client'

import { useState, useEffect } from 'react'
import { Flex } from '@chakra-ui/react'
import Sidebar from './Sidebar'
import PdfViewer from './PdfViewer'
import Toolbar from './Toolbar'

export default function MainContent() {
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [currentPdf, setCurrentPdf] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isTopHalf, setIsTopHalf] = useState(true)
  const [urlParams, setUrlParams] = useState(null)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    // Restore sidebar state from localStorage
    const saved = localStorage.getItem('sidebarVisible')
    if (saved !== null) {
      setSidebarVisible(saved !== 'false')
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
    : 'Select a PDF from the list'

  return (
    <Flex h="100vh" overflow="hidden" direction="column">
      {sidebarVisible && (
        <Toolbar
          onToggleSidebar={toggleSidebar}
          pdfName={displayName}
          pageNum={currentPage}
          totalPages={totalPages}
          isTopHalf={isTopHalf}
          onPageChange={handlePageChange}
        />
      )}
      <Flex flex={1} overflow="hidden">
        <Sidebar
          visible={sidebarVisible}
          onPdfSelect={handlePdfLoad}
          currentPdfPath={currentPdf?.path}
          urlParams={urlParams}
        />
        <PdfViewer
          sidebarVisible={sidebarVisible}
          onToggleSidebar={toggleSidebar}
          pdfUrl={currentPdf?.url}
          pdfName={currentPdf?.name}
          pageNum={currentPage}
          isTopHalf={isTopHalf}
          onPageChange={handlePageChange}
          onStateUpdate={handlePdfStateUpdate}
        />
      </Flex>
    </Flex>
  )
}
