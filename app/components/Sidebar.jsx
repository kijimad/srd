'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Box, VStack, HStack, Text, Icon, IconButton, Flex, Input, Spinner } from '@chakra-ui/react'
import { BsFilePdfFill, BsFolderFill, BsFolder2Open, BsArrowLeft } from 'react-icons/bs'
import { List } from 'react-window'
import { useDebounce } from '../hooks/useDebounce'

const ITEM_HEIGHT = 40
const PAGE_LIMIT = 50

const RowComponent = memo(function RowComponent({ index, style, items, currentPdfPath, hasMore, onItemClick }) {
  // Loading indicator at the end
  if (index >= items.length) {
    return (
      <div style={style}>
        <Box display="flex" alignItems="center" justifyContent="center" h="100%">
          <Spinner size="sm" color="gray.500" />
        </Box>
      </div>
    )
  }

  const item = items[index]
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
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const listRef = useRef(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  const loadDirectory = useCallback(async (path = '.', pageNum = 1, query = '', append = false) => {
    if (isLoading) return
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        path,
        page: pageNum.toString(),
        limit: PAGE_LIMIT.toString()
      })
      if (query) params.set('q', query)

      const response = await fetch(`/api/browse?${params}`)
      const data = await response.json()

      setCurrentPath(data.currentPath)
      setTotal(data.total)
      setHasMore(data.hasMore)
      setPage(pageNum)

      if (append) {
        setItems(prev => [...prev, ...data.items])
      } else {
        setItems(data.items)
      }
    } catch (error) {
      console.error('Error loading directory:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  // Initial load
  useEffect(() => {
    loadDirectory('.', 1, '')
  }, [])

  // Search query change
  useEffect(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
    loadDirectory(currentPath, 1, debouncedQuery)
  }, [debouncedQuery])

  // Load PDF from URL parameters
  useEffect(() => {
    if (urlParams && !hasLoadedFromUrl) {
      const fileName = urlParams.file.split('/').pop()
      onPdfSelect({
        url: '/api/pdf/' + urlParams.file,
        path: urlParams.file,
        name: fileName,
        initialPage: urlParams.page,
      })
      setHasLoadedFromUrl(true)
    }
  }, [urlParams, hasLoadedFromUrl, onPdfSelect])

  // Scroll to selected item
  useEffect(() => {
    if (listRef.current && currentPdfPath) {
      const index = items.findIndex(item => item.path === currentPdfPath)
      if (index !== -1) {
        listRef.current.scrollToRow({ index, align: 'center' })
      }
    }
  }, [currentPdfPath, items])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadDirectory(currentPath, page + 1, debouncedQuery, true)
    }
  }, [isLoading, hasMore, currentPath, page, debouncedQuery, loadDirectory])

  const goBack = () => {
    if (currentPath === '.' || currentPath === '') return
    const parentPath = currentPath.split(/[\/\\]/).slice(0, -1).join('/') || '.'
    setSearchQuery('')
    setItems([])
    setPage(1)
    setHasMore(true)
    loadDirectory(parentPath, 1, '')
  }

  const handleItemClick = useCallback((item) => {
    if (item.type === 'directory') {
      setSearchQuery('')
      setItems([])
      setPage(1)
      setHasMore(true)
      loadDirectory(item.path, 1, '')
    } else {
      onPdfSelect({
        url: '/api/pdf/' + item.path,
        path: item.path,
        name: item.name,
        initialPage: 1,
        initialIsTop: true
      })
    }
  }, [loadDirectory, onPdfSelect])

  const handleRowsRendered = useCallback(({ stopIndex }) => {
    if (stopIndex >= items.length - 10 && hasMore && !isLoading) {
      loadMore()
    }
  }, [items.length, hasMore, isLoading, loadMore])

  const rowCount = items.length + (hasMore ? 1 : 0)

  const rowProps = {
    items,
    currentPdfPath,
    hasMore,
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
        {items.length === 0 && !isLoading ? (
          <Text textAlign="center" p={4} color="gray.500">
            No files found
          </Text>
        ) : (
          <List
            listRef={listRef}
            rowCount={rowCount}
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
