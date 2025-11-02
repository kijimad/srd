'use client'

import {
  HStack,
  IconButton,
  Text,
  Flex,
  Icon,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Box,
  Heading
} from '@chakra-ui/react'
import { BsLayoutSidebar, BsFileEarmarkText, BsFilePdfFill } from 'react-icons/bs'

function Toolbar({
  onToggleSidebar,
  pdfName,
  pageNum,
  totalPages,
  isTopHalf,
  onPageChange
}) {
  const halfText = isTopHalf ? '上' : '下'
  const pageInfo = totalPages > 0 ? `${pageNum} / ${totalPages} (${halfText})` : ''

  // Calculate slider value (half-page units)
  const currentHalfPage = totalPages > 0 ? (pageNum - 1) * 2 + (isTopHalf ? 1 : 2) : 0
  const maxHalfPages = totalPages * 2

  const handleSliderChange = (value) => {
    const newPageNum = Math.floor((value - 1) / 2) + 1
    const newIsTop = value % 2 === 1
    onPageChange(newPageNum, newIsTop)
  }

  return (
    <HStack
      py={2}
      px={3}
      bg="gray.900"
      spacing={3}
      backdropFilter="blur(0.5rem)"
    >
      <HStack spacing={3}>
        <Heading size="md" display="flex" alignItems="center" gap={2}>
          <Icon as={BsFilePdfFill} color="blue.400" />
          {pdfName}
        </Heading>
      </HStack>

      <Flex flex={1} align="center" px={4}>
        <Slider
          value={currentHalfPage}
          min={1}
          max={maxHalfPages}
          step={1}
          onChange={handleSliderChange}
          isDisabled={totalPages === 0}
        >
          <SliderTrack bg="gray.700">
            <SliderFilledTrack bg="cyan.400" />
          </SliderTrack>
          <SliderThumb boxSize={4} bg="cyan.400" />
        </Slider>
      </Flex>

      <Text fontSize="sm" color="gray.400" fontWeight="medium" fontFamily="mono" minW="22" textAlign="center">
        {pageInfo}
      </Text>

      <IconButton
        icon={<BsLayoutSidebar />}
        variant="outline"
        size="sm"
        onClick={onToggleSidebar}
        title="Toggle Sidebar"
        aria-label="Toggle sidebar"
      />
    </HStack>
  )
}

export default Toolbar
