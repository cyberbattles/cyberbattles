// components/PcapViewer.tsx
'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

interface PcapViewerProps {
  src: string
  lang?: 'zh-cn' | 'en-us'
  enableHexToggle?: boolean
  showFullscreenBtn?: boolean
  useCanvas?: boolean
}

export default function PcapViewer({
  src,
  lang = 'en-us',
  enableHexToggle = false,
  showFullscreenBtn = false,
  useCanvas = false
}: PcapViewerProps) {
  const [isReady, setIsReady] = useState(false)

  return (
    <>
      <Script
        src="https://unpkg.com/pcap-element/dist/pcap-element.esm.min.js"
        type="module"
        onReady={() => setIsReady(true)}
        strategy="lazyOnload"
      />
      
      {isReady ? (
        <pcap-element
          src={src}
          lang={lang}
          {...(enableHexToggle && { enablehextoggle: '' })}
          {...(showFullscreenBtn && { showfullscreenbtn: '' })}
          {...(useCanvas && { usecanvas: 'true' })}
        />
      ) : (
        <div className="p-4 text-gray-500">Loading PCAP viewer...</div>
      )}
    </>
  )
}