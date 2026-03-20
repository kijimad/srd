import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

let tmpDir
let testFile
const FILE_SIZE = 10 * 1024 * 1024 // 10MB

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srd-pdf-test-'))
  testFile = path.join(tmpDir, 'test.pdf')

  // Create a 10MB file with recognizable content
  const buf = Buffer.alloc(FILE_SIZE)
  for (let i = 0; i < FILE_SIZE; i++) {
    buf[i] = i % 256
  }
  fs.writeFileSync(testFile, buf)
})

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('Range request logic', () => {
  // Simulate the range parsing logic from the route
  function parseRange(rangeHeader, fileSize) {
    if (!rangeHeader) return null
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
    if (!match) return null

    const start = parseInt(match[1], 10)
    const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 32 * 1024 * 1024 - 1, fileSize - 1)
    const chunkSize = end - start + 1
    return { start, end, chunkSize }
  }

  it('parses range with start and end', () => {
    const result = parseRange('bytes=0-1023', FILE_SIZE)
    expect(result).toEqual({ start: 0, end: 1023, chunkSize: 1024 })
  })

  it('parses range with only start (defaults to 32MB chunk)', () => {
    const result = parseRange('bytes=0-', FILE_SIZE)
    // For 10MB file, end should be capped to fileSize - 1
    expect(result.start).toBe(0)
    expect(result.end).toBe(FILE_SIZE - 1)
    expect(result.chunkSize).toBe(FILE_SIZE)
  })

  it('caps open-ended range to 32MB for large files', () => {
    const largeSize = 100 * 1024 * 1024 // 100MB
    const result = parseRange('bytes=0-', largeSize)
    expect(result.end).toBe(32 * 1024 * 1024 - 1)
    expect(result.chunkSize).toBe(32 * 1024 * 1024)
  })

  it('handles mid-file range', () => {
    const result = parseRange('bytes=5000-9999', FILE_SIZE)
    expect(result).toEqual({ start: 5000, end: 9999, chunkSize: 5000 })
  })

  it('returns null for no range header', () => {
    expect(parseRange(null, FILE_SIZE)).toBeNull()
  })

  it('returns null for invalid range format', () => {
    expect(parseRange('invalid', FILE_SIZE)).toBeNull()
  })

  it('reads correct bytes with createReadStream range', () => {
    const start = 100
    const end = 199
    const stream = fs.createReadStream(testFile, { start, end })
    const chunks = []

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const buf = Buffer.concat(chunks)
        expect(buf).toHaveLength(100)
        // Verify content matches what we wrote
        for (let i = 0; i < 100; i++) {
          expect(buf[i]).toBe((start + i) % 256)
        }
        resolve()
      })
      stream.on('error', reject)
    })
  })

  it('reads last bytes of file', () => {
    const start = FILE_SIZE - 10
    const end = FILE_SIZE - 1
    const stream = fs.createReadStream(testFile, { start, end })
    const chunks = []

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk))
      stream.on('end', () => {
        const buf = Buffer.concat(chunks)
        expect(buf).toHaveLength(10)
        for (let i = 0; i < 10; i++) {
          expect(buf[i]).toBe((start + i) % 256)
        }
        resolve()
      })
      stream.on('error', reject)
    })
  })
})

describe('Content-Range header format', () => {
  it('formats correctly for partial response', () => {
    const start = 0
    const end = 1023
    const fileSize = 5000
    const header = `bytes ${start}-${end}/${fileSize}`
    expect(header).toBe('bytes 0-1023/5000')
  })

  it('formats correctly for large file', () => {
    const fileSize = 5368709120 // 5GB
    const start = 33554432 // 32MB
    const end = 67108863 // 64MB - 1
    const header = `bytes ${start}-${end}/${fileSize}`
    expect(header).toBe('bytes 33554432-67108863/5368709120')
  })
})
