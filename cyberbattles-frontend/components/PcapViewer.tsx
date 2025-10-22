// components/PcapViewer.tsx

// REF: Debugged compiler warning using Claude. 
// REF: https://claude.ai/share/17830828-d66b-4453-b8d6-69dcb04418a3

'use client'

import { useState, createElement } from 'react'
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
  enableHexToggle = true,
  showFullscreenBtn = false,
  useCanvas = true
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
        createElement('pcap-element', {
          src,
          lang,
          ...(enableHexToggle && { enablehextoggle: 'true' }),
          ...(showFullscreenBtn && { showfullscreenbtn: 'true' }),
          ...(useCanvas && { usecanvas: 'true' })
        })
      ) : (
        <div className="p-4 text-gray-500">Loading PCAP viewer...</div>
      )}
    </>
  )
}