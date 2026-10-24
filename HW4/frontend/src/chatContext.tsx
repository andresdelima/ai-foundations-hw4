import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { PageResults } from './api'

/** Page results plus a counter so each new chat search re-runs the card animation. */
export type ChatPageResults = PageResults & { version: number }

type ChatControls = {
  open: boolean
  draft: string
  setOpen: (open: boolean) => void
  setDraft: (draft: string) => void
  /** Open the chat panel with a suggested question already typed in. */
  askAbout: (question: string) => void
  /** Latest search results the agent sent to the page (null = show the normal catalogue). */
  pageResults: ChatPageResults | null
  showPageResults: (results: PageResults) => void
  clearPageResults: () => void
  /** Product open on a single-item page, so "this" in chat means that item. */
  viewing: ViewingProduct | null
  setViewing: (product: ViewingProduct | null) => void
}

export type ViewingProduct = { product_id: string; name: string }

const ChatContext = createContext<ChatControls | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pageResults, setPageResults] = useState<ChatPageResults | null>(null)
  const [viewing, setViewing] = useState<ViewingProduct | null>(null)

  const askAbout = useCallback((question: string) => {
    setDraft(question)
    setOpen(true)
  }, [])
  const showPageResults = useCallback((results: PageResults) => {
    setPageResults((prev) => ({ ...results, version: (prev?.version ?? 0) + 1 }))
  }, [])
  const clearPageResults = useCallback(() => setPageResults(null), [])

  return (
    <ChatContext.Provider
      value={{ open, draft, setOpen, setDraft, askAbout, pageResults, showPageResults, clearPageResults, viewing, setViewing }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>')
  return ctx
}
