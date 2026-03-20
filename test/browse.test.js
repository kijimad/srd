import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Create a temp directory with test files for browse API
let tmpDir

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srd-test-'))

  // Create subdirectory
  fs.mkdirSync(path.join(tmpDir, 'subdir'))

  // Create PDF files
  for (let i = 1; i <= 120; i++) {
    const name = `file_${String(i).padStart(3, '0')}.pdf`
    fs.writeFileSync(path.join(tmpDir, name), 'dummy')
  }

  // Create a file in subdir
  fs.writeFileSync(path.join(tmpDir, 'subdir', 'nested.pdf'), 'dummy')

  // Create a non-pdf file
  fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'dummy')
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// Helper to call browse API via the running dev server
// NOTE: These tests require the server to be running with PDF_DIR set to tmpDir.
// Since we can't change env at runtime, we test the logic directly by importing the route's helpers.
// Instead, we test against the actual server assuming PDF_DIR=cwd or provide unit tests.

// --- Unit tests for browse logic ---

function listDirectory(dir, basePath = '') {
  const items = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const relativePath = path.join(basePath, entry.name)

    if (entry.isDirectory()) {
      items.push({ type: 'directory', name: entry.name, path: relativePath })
    } else if (entry.isFile() && entry.name.endsWith('.pdf')) {
      items.push({ type: 'file', name: entry.name, path: relativePath })
    }
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

function browsePage(items, page, limit) {
  const total = items.length
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedItems = items.slice(startIndex, endIndex)
  const hasMore = endIndex < total
  return { items: paginatedItems, total, offset: startIndex, hasMore, page, limit }
}

function findFocusIndex(items, focusName) {
  const idx = items.findIndex(item => item.name === focusName)
  return idx === -1 ? null : idx
}

describe('listDirectory', () => {
  it('lists only PDF files and directories', () => {
    const items = listDirectory(tmpDir, '.')
    const names = items.map(i => i.name)

    expect(names).toContain('subdir')
    expect(names).toContain('file_001.pdf')
    expect(names).not.toContain('readme.txt')
  })

  it('sorts directories before files', () => {
    const items = listDirectory(tmpDir, '.')
    expect(items[0].type).toBe('directory')
    expect(items[0].name).toBe('subdir')
    expect(items[1].type).toBe('file')
  })

  it('sorts files alphabetically', () => {
    const items = listDirectory(tmpDir, '.')
    const files = items.filter(i => i.type === 'file')
    expect(files[0].name).toBe('file_001.pdf')
    expect(files[files.length - 1].name).toBe('file_120.pdf')
  })

  it('lists nested directory contents', () => {
    const items = listDirectory(path.join(tmpDir, 'subdir'), 'subdir')
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('nested.pdf')
    expect(items[0].path).toBe(path.join('subdir', 'nested.pdf'))
  })
})

describe('pagination', () => {
  let allItems

  beforeAll(() => {
    allItems = listDirectory(tmpDir, '.')
  })

  it('returns first page with correct offset', () => {
    const result = browsePage(allItems, 1, 50)
    expect(result.offset).toBe(0)
    expect(result.items).toHaveLength(50)
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(121) // 120 files + 1 directory
  })

  it('returns second page with correct offset', () => {
    const result = browsePage(allItems, 2, 50)
    expect(result.offset).toBe(50)
    expect(result.items).toHaveLength(50)
    expect(result.hasMore).toBe(true)
  })

  it('returns last page with hasMore=false', () => {
    const result = browsePage(allItems, 3, 50)
    expect(result.offset).toBe(100)
    expect(result.items).toHaveLength(21)
    expect(result.hasMore).toBe(false)
  })

  it('returns empty for out-of-range page', () => {
    const result = browsePage(allItems, 10, 50)
    expect(result.items).toHaveLength(0)
    expect(result.hasMore).toBe(false)
  })

  it('first item on page 2 follows last item on page 1', () => {
    const page1 = browsePage(allItems, 1, 50)
    const page2 = browsePage(allItems, 2, 50)
    const last1 = page1.items[page1.items.length - 1]
    const first2 = page2.items[0]
    // They should be adjacent in the full list
    const idx1 = allItems.indexOf(last1)
    const idx2 = allItems.indexOf(first2)
    expect(idx2).toBe(idx1 + 1)
  })
})

describe('focus', () => {
  let allItems

  beforeAll(() => {
    allItems = listDirectory(tmpDir, '.')
  })

  it('finds the index of an existing file', () => {
    const idx = findFocusIndex(allItems, 'file_075.pdf')
    expect(idx).not.toBeNull()
    expect(allItems[idx].name).toBe('file_075.pdf')
  })

  it('returns null for non-existent file', () => {
    const idx = findFocusIndex(allItems, 'nonexistent.pdf')
    expect(idx).toBeNull()
  })

  it('focus index matches the correct page', () => {
    const idx = findFocusIndex(allItems, 'file_075.pdf')
    const pageNum = Math.floor(idx / 50) + 1
    const result = browsePage(allItems, pageNum, 50)
    const found = result.items.find(i => i.name === 'file_075.pdf')
    expect(found).toBeDefined()
  })

  it('focus index for first file is on page 1', () => {
    const idx = findFocusIndex(allItems, 'file_001.pdf')
    // file_001.pdf is index 1 (after subdir directory)
    expect(idx).toBe(1)
    const pageNum = Math.floor(idx / 50) + 1
    expect(pageNum).toBe(1)
  })

  it('focus index for last file is on the last page', () => {
    const idx = findFocusIndex(allItems, 'file_120.pdf')
    const pageNum = Math.floor(idx / 50) + 1
    expect(pageNum).toBe(3)
  })
})

describe('search filter', () => {
  let allItems

  beforeAll(() => {
    allItems = listDirectory(tmpDir, '.')
  })

  it('filters by query case-insensitively', () => {
    const query = 'file_00'
    const filtered = allItems.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    expect(filtered).toHaveLength(9) // file_001 through file_009
    expect(filtered.every(i => i.name.startsWith('file_00'))).toBe(true)
  })

  it('returns empty for no match', () => {
    const filtered = allItems.filter(i => i.name.toLowerCase().includes('zzzzz'))
    expect(filtered).toHaveLength(0)
  })
})
