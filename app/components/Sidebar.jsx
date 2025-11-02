'use client'

import { useState, useEffect, useRef } from 'react'
import { Box, VStack, HStack, Text, Icon, IconButton, Heading, Flex, Input } from '@chakra-ui/react'
import { BsFilePdfFill, BsFolderFill, BsFolder2Open, BsArrowLeft } from 'react-icons/bs'

function Sidebar({ visible, onPdfSelect, currentPdfPath, urlParams }) {
  const [currentPath, setCurrentPath] = useState('.')
  const [items, setItems] = useState([])
  const [hasLoadedFromUrl, setHasLoadedFromUrl] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const selectedItemRef = useRef(null)

  useEffect(() => {
    loadDirectory('.')
  }, [])

  const loadDirectory = async (path = '.') => {
    try {
      const response = await fetch(`/api/browse?path=${encodeURIComponent(path)}`)
      const data = await response.json()
      setCurrentPath(data.currentPath)
      setItems(data.items)
      setSearchQuery('') // Clear search when changing directory
    } catch (error) {
      console.error('Error loading directory:', error)
    }
  }

  useEffect(() => {
    // Load PDF from URL parameters when items are loaded
    if (urlParams && items.length > 0 && !hasLoadedFromUrl && currentPath === '.') {
      const matchingItem = items.find(item => item.path === urlParams.file)
      if (matchingItem) {
        onPdfSelect({
          url: '/api/pdf/' + matchingItem.path,
          path: matchingItem.path,
          name: matchingItem.name,
          initialPage: urlParams.page,
          initialIsTop: urlParams.isTop
        })
        setHasLoadedFromUrl(true)
      }
    }
  }, [urlParams, items, hasLoadedFromUrl, currentPath, onPdfSelect])

  useEffect(() => {
    // スクロールする
    if (selectedItemRef.current && currentPdfPath) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [currentPdfPath, items])

  const goBack = () => {
    if (currentPath === '.' || currentPath === '') return
    const parentPath = currentPath.split(/[\/\\]/).slice(0, -1).join('/') || '.'
    loadDirectory(parentPath)
  }

  const handlePdfClick = (item, initialPage = 1, initialIsTop = true) => {
    onPdfSelect({
      url: '/api/pdf/' + item.path,
      path: item.path,
      name: item.name,
      initialPage,
      initialIsTop
    })
  }

  const handleItemClick = (item) => {
    if (item.type === 'directory') {
      loadDirectory(item.path)
    } else {
      handlePdfClick(item)
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Box
      w="80"
      bg="gray.800"
      overflowY="auto"
      transition="margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      ml={visible ? 0 : '-80'}
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
      </VStack>

      <VStack spacing={0} py={2} align="stretch">
        {filteredItems.length === 0 ? (
          <Text textAlign="center" p={4} color="gray.500">
            {items.length === 0 ? 'No files found' : 'No matches found'}
          </Text>
        ) : (
          filteredItems.map((item, index) => (
            <Box
              key={index}
              ref={currentPdfPath === item.path ? selectedItemRef : null}
              px={3}
              py={2}
              mx={2}
              borderRadius="md"
              cursor="pointer"
              bg={currentPdfPath === item.path ? 'blue.600' : 'transparent'}
              _hover={{ bg: currentPdfPath === item.path ? 'blue.600' : 'gray.700', transform: 'translateX(0.5)' }}
              transition="all 0.2s"
              onClick={() => handleItemClick(item)}
            >
              <HStack spacing={2}>
                <Icon
                  as={item.type === 'directory' ? BsFolderFill : BsFilePdfFill}
                  color={item.type === 'directory' ? 'yellow.400' : 'red.400'}
                  flexShrink={0}
                />
                <Text
                  fontSize="sm"
                  fontWeight={item.type === 'directory' ? 'medium' : 'normal'}
                  wordBreak="break-word"
                >
                  {item.name}
                </Text>
              </HStack>
            </Box>
          ))
        )}
      </VStack>
    </Box>
  )
}

export default Sidebar
