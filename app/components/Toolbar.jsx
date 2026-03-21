'use client'

import {
  HStack,
  IconButton,
  Text,
  Icon,
  Heading,
  Select,
  ButtonGroup,
} from '@chakra-ui/react'
import { BsLayoutSidebar, BsFilePdfFill, BsZoomIn, BsZoomOut } from 'react-icons/bs'

const SCALE_OPTIONS = [
  { value: 'auto', label: '自動' },
  { value: 'page-actual', label: '実際のサイズ' },
  { value: 'page-fit', label: 'ページ全体' },
  { value: 'page-width', label: 'ページ幅' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
  { value: '2', label: '200%' },
  { value: '3', label: '300%' },
  { value: '4', label: '400%' },
]

function Toolbar({
  onToggleSidebar,
  pdfName,
  pageNum,
  totalPages,
  scaleValue,
  currentScale,
  onScaleValueChange,
  onZoomIn,
  onZoomOut,
}) {
  const pageInfo = totalPages > 0 ? `${pageNum} / ${totalPages}` : ''
  const scalePercent = Math.round(currentScale * 100)

  const handleScaleSelectChange = (e) => {
    const value = e.target.value
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      onScaleValueChange(numValue)
    } else {
      onScaleValueChange(value)
    }
  }

  const getSelectValue = () => {
    if (typeof scaleValue === 'number') {
      const match = SCALE_OPTIONS.find(opt => parseFloat(opt.value) === scaleValue)
      return match ? match.value : ''
    }
    return scaleValue
  }

  return (
    <HStack
      py={2}
      px={3}
      bg="gray.900"
      spacing={3}
      backdropFilter="blur(0.5rem)"
    >
      <Heading size="md" display="flex" alignItems="center" gap={2} minW={0} flex={1}>
        <Icon as={BsFilePdfFill} color="blue.400" flexShrink={0} />
        <Text as="span" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {pdfName}
        </Text>
      </Heading>

      <Text fontSize="sm" color="gray.400" fontWeight="medium" fontFamily="mono">
        {pageInfo}
      </Text>

      <HStack spacing={1} flexShrink={0}>
        <ButtonGroup size="sm" isAttached variant="outline">
          <IconButton
            icon={<BsZoomOut />}
            onClick={onZoomOut}
            aria-label="Zoom out"
            title="縮小"
          />
          <IconButton
            icon={<BsZoomIn />}
            onClick={onZoomIn}
            aria-label="Zoom in"
            title="拡大"
          />
        </ButtonGroup>

        <Select
          size="sm"
          w="120px"
          value={getSelectValue()}
          onChange={handleScaleSelectChange}
          bg="gray.800"
          borderColor="gray.600"
        >
          {SCALE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {typeof scaleValue === 'number' && !SCALE_OPTIONS.find(opt => parseFloat(opt.value) === scaleValue) && (
            <option value={scaleValue}>{scalePercent}%</option>
          )}
        </Select>

        <Text fontSize="sm" color="gray.400" fontFamily="mono" minW="50px" textAlign="center">
          {scalePercent}%
        </Text>
      </HStack>

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
