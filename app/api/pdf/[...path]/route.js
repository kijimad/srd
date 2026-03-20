import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

function nodeStreamToWeb(stream) {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })
}

export async function GET(request, { params }) {
  const resolvedParams = await params
  const requestedPath = resolvedParams.path.join('/')
  const baseDir = process.env.PDF_DIR || process.cwd()
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '')
  const absolutePath = path.resolve(baseDir, safePath)

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
      const end = Math.min(
        match[2] ? parseInt(match[2], 10) : start + 32 * 1024 * 1024 - 1,
        fileSize - 1
      )
      const chunkSize = end - start + 1

      return new NextResponse(nodeStreamToWeb(fs.createReadStream(absolutePath, { start, end })), {
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

  return new NextResponse(nodeStreamToWeb(fs.createReadStream(absolutePath)), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': fileSize.toString(),
      'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
      'Accept-Ranges': 'bytes',
    },
  })
}
