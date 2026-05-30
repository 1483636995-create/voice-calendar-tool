import { useCallback, useMemo } from 'react'

interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
}

export interface UseSpeechSynthesisResult {
  isSupported: boolean
  speak: (text: string, options?: SpeakOptions) => void
  cancel: () => void
}

export const useSpeechSynthesis = (): UseSpeechSynthesisResult => {
  const isSupported = useMemo(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }, [])

  const cancel = useCallback(() => {
    if (!isSupported) {
      return
    }

    window.speechSynthesis.cancel()
  }, [isSupported])

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      const speechText = text.trim()

      if (!isSupported || !speechText) {
        return
      }

      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(speechText)
      utterance.lang = options.lang ?? 'zh-CN'
      utterance.rate = options.rate ?? 1
      utterance.pitch = options.pitch ?? 1
      window.speechSynthesis.speak(utterance)
    },
    [isSupported],
  )

  return {
    isSupported,
    speak,
    cancel,
  }
}
