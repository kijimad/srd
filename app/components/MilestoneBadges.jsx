'use client'

import { Box, Icon, Tooltip } from '@chakra-ui/react'

function MilestoneBadges({ achievedMilestones }) {
  if (achievedMilestones.length === 0) return null

  return (
    <Box display="flex" flexDirection="column" gap={2} alignItems="center">
      {achievedMilestones.slice().reverse().map(m => (
        <Tooltip
          key={m.threshold}
          label={`${m.label} - ${m.threshold}ページ達成`}
          placement="left"
          bg="gray.800"
          color="white"
          fontSize="sm"
          fontWeight="bold"
          borderWidth="1px"
          borderColor="gray.600"
          boxShadow="0 4px 12px rgba(0,0,0,0.5)"
        >
          <Box
            position="relative"
            w={14}
            h={14}
            cursor="pointer"
            transition="all 0.2s ease"
            _hover={{
              transform: 'scale(1.1)',
            }}
            _active={{
              transform: 'scale(1.05)',
            }}
          >
            {/* 外側グロー */}
            <Box
              position="absolute"
              inset={-1}
              borderRadius="full"
              bgGradient="radial(#88888860 0%, transparent 70%)"
              filter="blur(8px)"
              pointerEvents="none"
            />

            {/* 外側リング（ダーク） */}
            <Box
              position="absolute"
              inset={0}
              borderRadius="full"
              bgGradient="linear(to-br, #1a1a1a, #2d2d2d)"
              borderWidth="2px"
              borderColor="#3a3a3a"
            />

            {/* 中間リング（シルバー） */}
            <Box
              position="absolute"
              inset={1.5}
              borderRadius="full"
              bgGradient="linear(to-br, #b8b8b8, #808080)"
              boxShadow="inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)"
            />

            {/* 内側リング（ダーク） */}
            <Box
              position="absolute"
              inset={2.5}
              borderRadius="full"
              bgGradient="linear(to-br, #4a4a4a, #2a2a2a)"
              boxShadow="inset 0 1px 2px rgba(0,0,0,0.5)"
            />

            {/* アイコン */}
            <Icon
              as={m.icon}
              boxSize={8}
              color="#c0c0c0"
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.7))"
              zIndex={1}
            />
          </Box>
        </Tooltip>
      ))}
    </Box>
  )
}

export default MilestoneBadges
