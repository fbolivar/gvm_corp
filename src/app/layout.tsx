import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GVM S.A.S — ERP Integral',
  description: 'Sistema ERP integral para gestión empresarial - GVM S.A.S',
  icons: {
    icon: '/logo-gvm.png',
    apple: '/logo-gvm.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
