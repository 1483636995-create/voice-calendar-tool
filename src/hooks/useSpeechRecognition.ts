import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionErrorCode =
  | 'aborted'
  | 'audio-capture'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'network'
  | 'no-speech'
  | 'not-allowed'
  | 'service-not-allowed'

interface SpeechRecognitionAlternativeLike {
  transcript: string
  confidence: number
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionErrorEventLike {
  error: SpeechRecognitionErrorCode
  message?: string
}

interface BrowserSpeechRecognition {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onstart: (() => void) | null
  abort: () => void
  start: () => void
  stop: () => void
}

interface BrowserSpeechRecognitionConstructor {
  new (): BrowserSpeechRecognition
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor
}

interface UseSpeechRecognitionOptions {
  lang?: string
  onFinalResult?: (text: string) => void
}

export interface UseSpeechRecognitionResult {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  errorMessage?: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

const getSpeechRecognitionConstructor = (): BrowserSpeechRecognitionConstructor | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }

  const speechWindow = window as SpeechRecognitionWindow
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

const getErrorMessage = (error: SpeechRecognitionErrorCode, fallback?: string): string => {
  const messages: Record<SpeechRecognitionErrorCode, string> = {
    aborted: '语音识别已取消',
    'audio-capture': '没有检测到可用麦克风',
    'bad-grammar': '语音识别语法配置异常',
    'language-not-supported': '当前浏览器不支持中文识别',
    network: '语音识别服务网络异常',
    'no-speech': '没有听到清晰语音',
    'not-allowed': '麦克风权限未开启',
    'service-not-allowed': '浏览器阻止了语音识别服务',
  }

  return fallback || messages[error] || '语音识别失败'
}

export const useSpeechRecognition = ({
  lang = 'zh-CN',
  onFinalResult,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionResult => {
  const recognitionRef = useRef<BrowserSpeechRecognition | undefined>(undefined)
  const finalResultRef = useRef(onFinalResult)

  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [isSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()))

  useEffect(() => {
    finalResultRef.current = onFinalResult
  }, [onFinalResult])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setErrorMessage(undefined)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionConstructor()

    if (!SpeechRecognition) {
      setErrorMessage('当前浏览器不支持语音识别，请使用文本输入')
      return
    }

    recognitionRef.current?.abort()

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = lang
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setErrorMessage(undefined)
      setTranscript('')
      setInterimTranscript('')
    }

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result[0]?.transcript.trim() ?? ''

        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      if (interimText) {
        setInterimTranscript(interimText)
      }

      if (finalText) {
        setTranscript(finalText)
        setInterimTranscript('')
        finalResultRef.current?.(finalText)
      }
    }

    recognition.onerror = (event) => {
      setErrorMessage(getErrorMessage(event.error, event.message))
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [lang])

  return {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
  }
}
