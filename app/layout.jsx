export const metadata = {
  title: 'Theater',
  description: 'PDF Slide Viewer',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a202c" />
      </head>
      <body suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js');
                }
              `,
            }}
          />
        )}
        {process.env.NODE_ENV !== 'production' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((r) => r.unregister());
                  });
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  )
}
