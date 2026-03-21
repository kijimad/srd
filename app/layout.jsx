export const metadata = {
  title: 'Theater',
  description: 'PDF Slide Viewer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
