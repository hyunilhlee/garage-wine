import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '가라지와인 블로그 글쓰기 AI',
  description: '와인 정보를 입력하면 블로그 글을 자동으로 생성합니다',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
