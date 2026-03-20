'use client'

import { useState, useEffect, useRef, useCallback, memo, useReducer } from 'react'
import { Box, VStack, HStack, Text, Icon, IconButton, Flex, Input } from '@chakra-ui/react'
import { BsFilePdfFill, BsFolderFill, BsFolder2Open, BsArrowLeft } from 'react-icons/bs'
import { List } from 'react-window'
import { useDebounce } from '../hooks/useDebounce'

const ITEM_HEIGHT = 40
const PAGE_LIMIT = 50

function makePageKey(dirPath, query, pageNum) {
  return `${dirPath}:${query}:${pageNum}`
}

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

const RowComponent = memo(function RowComponent({ index, style, itemsMap, currentPdfPath, onItemClick }) {
  const item = itemsMap[index]

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
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const initialLoadDone = useRef(false)

  const itemsMapRef = useRef({})
  const loadedPagesRef = useRef(new Set())
  const loadingPagesRef = useRef(new Set())
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const listRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Core fetch: load a single page and merge into itemsMap
  const fetchPage = useCallback(async (dirPath, pageNum, query = '', extraParams = {}) => {
    const params = buildBrowseParams(dirPath, pageNum, { query, ...extraParams })
    const response = await fetch(`/api/browse?${params}`)
    const data = await response.json()

    data.items.forEach((item, i) => {
      itemsMapRef.current[data.offset + i] = item
    })
    loadedPagesRef.current.add(makePageKey(dirPath, query, pageNum))

    return data
  }, [])

  const loadPage = useCallback(async (dirPath, pageNum, query = '') => {
    const pageKey = makePageKey(dirPath, query, pageNum)
    if (loadedPagesRef.current.has(pageKey) || loadingPagesRef.current.has(pageKey)) return

    loadingPagesRef.current.add(pageKey)
    try {
      const data = await fetchPage(dirPath, pageNum, query)
      setCurrentPath(data.currentPath)
      setTotal(data.total)
      forceUpdate()
    } catch (error) {
      console.error('Error loading directory:', error)
    } finally {
      loadingPagesRef.current.delete(pageKey)
    }
  }, [fetchPage])

  const resetAndLoad = useCallback(async (dirPath, query = '') => {
    itemsMapRef.current = {}
    loadedPagesRef.current = new Set()
    loadingPagesRef.current = new Set()
    setTotal(0)

    try {
      const data = await fetchPage(dirPath, 1, query)
      setCurrentPath(data.currentPath)
      setTotal(data.total)
      forceUpdate()
    } catch (error) {
      console.error('Error loading directory:', error)
    }
  }, [fetchPage])

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
    if (urlParams && !hasLoadedFromUrl) {
      setHasLoadedFromUrl(true)
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

      fetchPage(parentDir, 1, '', { focus: fileName })
        .then(async (data) => {
          setCurrentPath(data.currentPath)
          setTotal(data.total)

          if (data.focusIndex != null) {
            const focusPage = Math.floor(data.focusIndex / PAGE_LIMIT) + 1

            if (focusPage > 1) {
              await fetchPage(parentDir, focusPage)
            }

            forceUpdate()

            setTimeout(() => {
              if (listRef.current) {
                listRef.current.scrollToRow({ index: data.focusIndex, align: 'center' })
              }
            }, 50)
          } else {
            forceUpdate()
          }
        })
        .catch(error => console.error('Error loading from URL:', error))
    }
  }, [urlParams, hasLoadedFromUrl, onPdfSelect, fetchPage])

  // Scroll to selected item when it becomes available in itemsMap
  useEffect(() => {
    if (listRef.current && currentPdfPath) {
      const entry = Object.entries(itemsMapRef.current).find(([, item]) => item.path === currentPdfPath)
      if (entry) {
        listRef.current.scrollToRow({ index: parseInt(entry[0]), align: 'center' })
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
    const startPage = Math.floor(Math.max(0, startIndex - 10) / PAGE_LIMIT) + 1
    const endPage = Math.floor(Math.min(total - 1, stopIndex + 10) / PAGE_LIMIT) + 1

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const pageKey = makePageKey(currentPath, debouncedQuery, pageNum)
      if (!loadedPagesRef.current.has(pageKey)) {
        loadPage(currentPath, pageNum, debouncedQuery)
      }
    }
  }, [total, currentPath, debouncedQuery, loadPage])

  const rowProps = {
    itemsMap: itemsMapRef.current,
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

      <Box flex={1} overflow="hidden" position="relative">
        {total === 0 ? (
          <Text textAlign="center" p={4} color="gray.500">
            No files found
          </Text>
        ) : (
          <List
            listRef={listRef}
            rowCount={total}
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
