import './globals.css'

export const metadata = {
  title: 'ShadowSight Dashboard',
  description: 'AI-powered data leakage prevention and insider risk management',
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" className="light">
      <body className="bg-white text-gray-800">
        {children}
      </body>
    </html>
  )
} 