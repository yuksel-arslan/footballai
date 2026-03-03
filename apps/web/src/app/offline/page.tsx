'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(14, 165, 233, 0.2))',
              boxShadow: '0 0 40px rgba(14, 165, 233, 0.3)',
            }}
          >
            <WifiOff className="w-10 h-10 text-[#0EA5E9]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-3 gradient-text">
          Çevrimdışısınız
        </h1>

        <p className="text-muted-foreground mb-6">
          İnternet bağlantınız yok gibi görünüyor. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="btn-neon inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold"
        >
          <RefreshCw className="w-5 h-5" />
          Tekrar Dene
        </button>

        <p className="text-sm text-muted-foreground mt-8">
          Son görüntülenen sayfalar çevrimdışı kullanılabilir.
        </p>
      </div>
    </div>
  )
}
