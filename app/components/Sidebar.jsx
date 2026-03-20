'use client'

import { useState, useEffect, useRef, useCallback, memo, useReducer } from 'react'
import { Box, VStack, HStack, Text, Icon, IconButton, Flex, Input } from '@chakra-ui/react'
import { BsFilePdfFill, BsFolderFill, BsFolder2Open, BsArrowLeft } from 'react-icons/bs'
import { List } from 'react-window'
import { useDebounce } from '../hooks/useDebounce'

const ITEM_HEIGHT = 40
const PAGE_LIMIT = 50

function buildBrowseParams(dirPath, pageNum, { query, focus } = {}) {
  const params = new URLSearchParams({
    path: dirPath,
    page: String(pageNum),
    limit: String(PAGE_LIMIT)
  })
  if (query) params.set('q', query)
  if (focus) params.set('focus', focus)
  return params
}

async function fetchBrowsePage(dirPath, pageNum, opts = {}) {
  const params = buildBrowseParams(dirPath, pageNum, opts)
  const response = await fetch(`/api/browse?${params}`)
  return response.json()
}

const RowComponent = memo(function RowComponent({ index, style, items, currentPdfPath, onItemClick }) {
  const item = items[index]

  if (!item) {
    return <div style={style} />
  }

  const isSelected = currentPdfPath === item.path

  return (
    <div style={style}>
      <Box px={3} h="100%" display="flex" alignItems="center">
        <HStack
          spacing={2}
          w="100%"
          px={3}
          py={2}
          borderRadius="md"
          cursor="pointer"
          bg={isSelected ? 'blue.600' : 'transparent'}
          _hover={{ bg: isSelected ? 'blue.600' : 'gray.700' }}
          transition="all 0.15s"
          onClick={() => onItemClick(item)}
        >
          <Icon
            as={item.type === 'directory' ? BsFolderFill : BsFilePdfFill}
            color={item.type === 'directory' ? 'yellow.400' : 'red.400'}
            flexShrink={0}
          />
          <Text
            fontSize="sm"
            fontWeight={item.type === 'directory' ? 'medium' : 'normal'}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            title={item.name}
          >
            {item.name.replace(/^\d{8}T\d{6}(--|\d+_)/, '').replace(/\.pdf$/i, '')}
          </Text>
        </HStack>
      </Box>
    </div>
  )
})

function Sidebar({ visible, width = 320, onPdfSelect, currentPdfPath, urlParams }) {
  const [currentPath, setCurrentPath] = useState('.')
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const initialLoadDone = useRef(false)
  const hasLoadedFromUrl = useRef(false)

  const itemsRef = useRef([])
  const firstLoadedPage = useRef(1)
  const lastLoadedPage = useRef(1)
  const hasMoreDown = useRef(true)
  const loadingNextRef = useRef(false)
  const loadingPrevRef = useRef(false)
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const listRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Apply browse result to pagination state
  const applyResult = useCallback((data, page) => {
    itemsRef.current = data.items
    firstLoadedPage.current = page
    lastLoadedPage.current = page
    hasMoreDown.current = data.hasMore
    setCurrentPath(data.currentPath)
    setTotal(data.total)
  }, [])

  const loadNextPage = useCallback(async (dirPath, query = '') => {
    if (loadingNextRef.current || !hasMoreDown.current) return
    loadingNextRef.current = true

    try {
      const nextPage = lastLoadedPage.current + 1
      const data = await fetchBrowsePage(dirPath, nextPage, { query })

      setTotal(data.total)
      itemsRef.current.push(...data.items)
      hasMoreDown.current = data.hasMore
      lastLoadedPage.current = nextPage
      forceUpdate()
    } catch (error) {
      console.error('Error loading directory:', error)
    } finally {
      loadingNextRef.current = false
    }
  }, [])

  const loadPrevPage = useCallback(async (dirPath, query = '') => {
    if (loadingPrevRef.current || firstLoadedPage.current <= 1) return
    loadingPrevRef.current = true

    try {
      const prevPage = firstLoadedPage.current - 1
      const data = await fetchBrowsePage(dirPath, prevPage, { query })

      const prevCount = data.items.length
      itemsRef.current.unshift(...data.items)
      firstLoadedPage.current = prevPage
      forceUpdate()

      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollToRow({ index: prevCount, align: 'start' })
        }
      })
    } catch (error) {
      console.error('Error loading directory:', error)
    } finally {
      loadingPrevRef.current = false
    }
  }, [])

  const resetAndLoad = useCallback(async (dirPath, query = '') => {
    itemsRef.current = []
    loadingNextRef.current = false
    loadingPrevRef.current = false
    setTotal(0)

    try {
      const data = await fetchBrowsePage(dirPath, 1, { query })
      applyResult(data, 1)
      forceUpdate()
    } catch (error) {
      console.error('Error loading directory:', error)
    }
  }, [applyResult])

  // Initial load
  useEffect(() => {
    if (!urlParams) {
      resetAndLoad('.', '')
      initialLoadDone.current = true
    }
  }, [])

  // Search query change (skip the initial mount)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      return
    }
    resetAndLoad(currentPath, debouncedQuery)
  }, [debouncedQuery])

  // Load PDF from URL parameters
  useEffect(() => {
    if (!urlParams || hasLoadedFromUrl.current) return
    hasLoadedFromUrl.current = true
    initialLoadDone.current = true

    const fileName = urlParams.file.split('/').pop()
    const parentDir = urlParams.file.includes('/')
      ? urlParams.file.split('/').slice(0, -1).join('/')
      : '.'

    onPdfSelect({
      url: '/api/pdf/' + urlParams.file,
      path: urlParams.file,
      name: fileName,
      initialPage: urlParams.page,
    })

    ;(async () => {
      try {
        const data = await fetchBrowsePage(parentDir, 1, { focus: fileName })
        const focusPage = data.focusIndex != null
          ? Math.floor(data.focusIndex / PAGE_LIMIT) + 1
          : 1

        if (focusPage > 1) {
          const focusData = await fetchBrowsePage(parentDir, focusPage)
          applyResult(focusData, focusPage)
        } else {
          applyResult(data, 1)
        }
        forceUpdate()

        if (data.focusIndex != null) {
          const localIndex = data.focusIndex - (focusPage - 1) * PAGE_LIMIT
          setTimeout(() => {
            if (listRef.current) {
              listRef.current.scrollToRow({ index: localIndex, align: 'center' })
            }
          }, 50)
        }
      } catch (error) {
        console.error('Error loading from URL:', error)
      }
    })()
  }, [urlParams, onPdfSelect, applyResult])

  // Scroll to selected item
  useEffect(() => {
    if (listRef.current && currentPdfPath) {
      const index = itemsRef.current.findIndex(item => item.path === currentPdfPath)
      if (index !== -1) {
        listRef.current.scrollToRow({ index, align: 'center' })
      }
    }
  }, [currentPdfPath])

  const goBack = () => {
    if (currentPath === '.' || currentPath === '') return
    const parentPath = currentPath.split(/[\/\\]/).slice(0, -1).join('/') || '.'
    setSearchQuery('')
    resetAndLoad(parentPath, '')
  }

  const handleItemClick = useCallback((item) => {
    if (item.type === 'directory') {
      setSearchQuery('')
      resetAndLoad(item.path, '')
    } else {
      onPdfSelect({
        url: '/api/pdf/' + item.path,
        path: item.path,
        name: item.name,
        initialPage: 1,
        initialIsTop: true
      })
    }
  }, [resetAndLoad, onPdfSelect])

  const handleRowsRendered = useCallback((visibleRows) => {
    const { startIndex, stopIndex } = visibleRows
    if (stopIndex >= itemsRef.current.length - 10) {
      loadNextPage(currentPath, debouncedQuery)
    }
    if (startIndex <= 5) {
      loadPrevPage(currentPath, debouncedQuery)
    }
  }, [currentPath, debouncedQuery, loadNextPage, loadPrevPage])

  const rowProps = {
    items: itemsRef.current,
    currentPdfPath,
    onItemClick: handleItemClick
  }

  return (
    <Box
      w={`${width}px`}
      minW={`${width}px`}
      bg="gray.800"
      display="flex"
      flexDirection="column"
      transition="margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      ml={visible ? 0 : `-${width}px`}
    >
      <VStack spacing={2} p={2} px={3} pt={3}>
        <HStack spacing={2} w="100%">
          <IconButton
            icon={<BsArrowLeft />}
            size="sm"
            variant="outline"
            onClick={goBack}
            isDisabled={currentPath === '.' || currentPath === ''}
            aria-label="Go back"
          />
          <Flex flex={1} align="center" gap={2} overflow="hidden">
            <Icon as={BsFolder2Open} color="yellow.600" fontSize="sm" />
            <Text fontSize="sm" color="gray.400" noOfLines={1}>{currentPath}</Text>
          </Flex>
        </HStack>
        <Input
          placeholder="Search..."
          size="sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          bg="gray.900"
          borderColor="gray.600"
          _hover={{ borderColor: 'gray.500' }}
          _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)' }}
        />
        <Text fontSize="xs" color="gray.500" alignSelf="flex-start">
          {total} items
        </Text>
      </VStack>

      <Box flex={1} overflow="hidden">
        {itemsRef.current.length === 0 && total === 0 ? (
          <Text textAlign="center" p={4} color="gray.500">
            No files found
          </Text>
        ) : (
          <List
            listRef={listRef}
            rowCount={itemsRef.current.length}
            rowHeight={ITEM_HEIGHT}
            rowComponent={RowComponent}
            rowProps={rowProps}
            onRowsRendered={handleRowsRendered}
            style={{ height: '100%' }}
          />
        )}
      </Box>
    </Box>
  )
}

export default Sidebar
