import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request, { params }) {
  const resolvedParams = await params
  const requestedPath = resolvedParams.path.join('/')
  const baseDir = process.env.PDF_DIR || process.cwd()
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '')
  const absolutePath = path.resolve(baseDir, safePath)

  // Security check
  if (!absolutePath.startsWith(baseDir)) {
    return new NextResponse('Access denied', { status: 403 })
  }

  let stat
  try {
    stat = fs.statSync(absolutePath)
  } catch {
    return new NextResponse('File not found', { status: 404 })
  }

  const fileSize = stat.size
  const filename = path.basename(absolutePath)
  const encodedFilename = encodeURIComponent(filename)
  const range = request.headers.get('range')

  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/)
    if (match) {
      const start = parseInt(match[1], 10)
      const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 32 * 1024 * 1024 - 1, fileSize - 1)
      const chunkSize = end - start + 1
      const stream = fs.createReadStream(absolutePath, { start, end })
      const readable = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk) => controller.enqueue(chunk))
          stream.on('end', () => controller.close())
          stream.on('error', (err) => controller.error(err))
        },
        cancel() {
          stream.destroy()
        },
      })

      return new NextResponse(readable, {
        status: 206,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': chunkSize.toString(),
          'Accept-Ranges': 'bytes',
        },
      })
    }
  }

  const stream = fs.createReadStream(absolutePath)
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
      'Accept-Ranges': 'bytes',
    },
  })
}
