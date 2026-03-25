"use client"

import { useState, useRef, useEffect, useCallback, FormEvent } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import {
  X,
  Send,
  Loader2,
  Minimize2,
  Maximize2,
  User as UserIcon,
  AlertCircle,
} from "lucide-react"

/** Pig face SVG icon — AI GVM mascot */
function PigIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="32" cy="34" r="22" fill="#F8BBD0" />
      <ellipse cx="14" cy="18" rx="8" ry="10" fill="#F48FB1" transform="rotate(-15 14 18)" />
      <ellipse cx="14" cy="18" rx="5" ry="7" fill="#F8BBD0" transform="rotate(-15 14 18)" />
      <ellipse cx="50" cy="18" rx="8" ry="10" fill="#F48FB1" transform="rotate(15 50 18)" />
      <ellipse cx="50" cy="18" rx="5" ry="7" fill="#F8BBD0" transform="rotate(15 50 18)" />
      <circle cx="23" cy="30" r="3.5" fill="#1a1a1a" />
      <circle cx="24" cy="28.8" r="1.2" fill="white" />
      <circle cx="41" cy="30" r="3.5" fill="#1a1a1a" />
      <circle cx="42" cy="28.8" r="1.2" fill="white" />
      <ellipse cx="32" cy="40" rx="10" ry="7" fill="#F48FB1" />
      <ellipse cx="28" cy="40" rx="2.5" ry="2" fill="#E91E63" />
      <ellipse cx="36" cy="40" rx="2.5" ry="2" fill="#E91E63" />
      <path d="M28 46c2 2 6 2 8 0" stroke="#C2185B" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="38" r="4" fill="#F48FB1" opacity="0.4" />
      <circle cx="48" cy="38" r="4" fill="#F48FB1" opacity="0.4" />
    </svg>
  )
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
}

export function AICopilot() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text }
    const assistantId = `a-${Date.now()}`

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    // Build UIMessage format that the API expects
    const allMessages = [...messages, userMsg]
    const apiMessages = allMessages.map(m => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text", text: m.text }],
    }))

    try {
      abortRef.current = new AbortController()

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, context: pathname }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || `Error ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("Sin respuesta del servidor")

      const decoder = new TextDecoder()
      let assistantText = ""

      // Add empty assistant message that we'll fill with streamed text
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", text: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        const currentText = assistantText
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, text: currentText } : m)
        )
      }

      // If response was empty, show fallback
      if (!assistantText.trim()) {
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, text: "No pude generar una respuesta. Intenta reformular tu pregunta." }
            : m
          )
        )
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      const msg = err instanceof Error ? err.message : "Error de conexion"
      setError(msg)
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [messages, pathname])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    const text = inputValue.trim()
    setInputValue("")
    sendMessage(text)
  }

  const handleSuggestion = (text: string) => {
    if (isLoading) return
    setInputValue("")
    sendMessage(text)
  }

  const handleClose = () => {
    abortRef.current?.abort()
    setOpen(false)
    setMessages([])
    setError(null)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        title="AI GVM"
        aria-label="Abrir AI GVM"
      >
        <PigIcon className="h-9 w-9 group-hover:rotate-12 transition-transform" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all",
        minimized
          ? "bottom-6 right-6 w-72 h-14"
          : "bottom-6 right-6 w-96 h-[32rem]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-emerald-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <PigIcon className="h-6 w-6" />
          <span className="text-xs font-black uppercase tracking-widest">AI GVM</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(!minimized)}
            className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label={minimized ? "Expandir" : "Minimizar"}
          >
            {minimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="h-7 w-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Cerrar AI GVM"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <PigIcon className="h-14 w-14 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold text-slate-400">Soy AI GVM, tu copiloto de negocio</p>
                <p className="text-[10px] text-slate-300 mt-1">Preguntame por datos reales de la empresa</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {['Como van las ventas este mes?', 'Que productos estan por agotarse?', 'Dame un resumen ejecutivo', 'Quien me debe mas de 30 dias?', 'Como va el pipeline de ventas?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSuggestion(q)}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex gap-3", m.role === 'user' ? 'justify-end' : '')}
              >
                {m.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <PigIcon className="h-5 w-5" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed",
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-700 rounded-bl-none'
                  )}
                >
                  <p className="whitespace-pre-wrap text-xs">{m.text}</p>
                </div>
                {m.role === 'user' && (
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-3">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 text-emerald-600 animate-spin" />
                </div>
                <div className="bg-slate-100 rounded-xl rounded-bl-none px-3 py-2">
                  <p className="text-xs text-slate-400">Pensando...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border-t border-red-100 shrink-0 flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-[10px] text-red-600">{error}</p>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-slate-100 flex gap-2 shrink-0"
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
              disabled={isLoading}
              aria-label="Mensaje para AI GVM"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              size="icon"
              className="h-9 w-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              aria-label="Enviar mensaje"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </>
      )}
    </div>
  )
}
