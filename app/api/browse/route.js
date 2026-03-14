import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function listDirectory(dir, basePath = '') {
  const items = []

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relativePath = path.join(basePath, entry.name)

      if (entry.isDirectory()) {
        items.push({
          type: 'directory',
          name: entry.name,
          path: relativePath
        })
      } else if (entry.isFile() && entry.name.endsWith('.pdf')) {
        items.push({
          type: 'file',
          name: entry.name,
          path: relativePath
        })
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const requestedPath = searchParams.get('path') || '.'
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page')) || 1
  const limit = parseInt(searchParams.get('limit')) || 50
  const baseDir = process.env.PDF_DIR || process.cwd()

  // Security: prevent directory traversal
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '')
  const absolutePath = path.resolve(baseDir, safePath)

  // Ensure the path is within the pdfs directory
  if (!absolutePath.startsWith(baseDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
  }

  const stat = fs.statSync(absolutePath)
  if (!stat.isDirectory()) {
    return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
  }

  let items = listDirectory(absolutePath, safePath)

  // Filter by query (case-insensitive filename search)
  if (query) {
    const lowerQuery = query.toLowerCase()
    items = items.filter(item => item.name.toLowerCase().includes(lowerQuery))
  }

  const total = items.length
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedItems = items.slice(startIndex, endIndex)
  const hasMore = endIndex < total

  return NextResponse.json({
    currentPath: safePath,
    items: paginatedItems,
    total,
    page,
    limit,
    hasMore
  })
}
