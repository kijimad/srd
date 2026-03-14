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
import { BsLayoutSidebar, BsFileEarmarkText, BsFilePdfFill, BsLayoutSplit, BsSquare } from 'react-icons/bs'

function Toolbar({
  onToggleSidebar,
  pdfName,
  pageNum,
  totalPages,
  isTopHalf,
  onPageChange,
  splitMode,
  onToggleSplitMode
}) {
  const halfText = isTopHalf ? '上' : '下'
  const pageInfo = splitMode
    ? (totalPages > 0 ? `${pageNum} / ${totalPages} (${halfText})` : '')
    : (totalPages > 0 ? `${pageNum} / ${totalPages}` : '')

  // Calculate slider value
  const currentSliderValue = splitMode
    ? (totalPages > 0 ? (pageNum - 1) * 2 + (isTopHalf ? 1 : 2) : 0)
    : pageNum
  const maxSliderValue = splitMode ? totalPages * 2 : totalPages

  const handleSliderChange = (value) => {
    if (splitMode) {
      const newPageNum = Math.floor((value - 1) / 2) + 1
      const newIsTop = value % 2 === 1
      onPageChange(newPageNum, newIsTop)
    } else {
      onPageChange(value, true)
    }
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
          value={currentSliderValue}
          min={1}
          max={maxSliderValue}
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
        icon={splitMode ? <BsLayoutSplit /> : <BsSquare />}
        variant="outline"
        size="sm"
        onClick={onToggleSplitMode}
        title={splitMode ? '全体表示に切替' : '上下分割に切替'}
        aria-label="Toggle split mode"
      />

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
