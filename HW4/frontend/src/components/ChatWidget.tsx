import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, type CardProduct, type ChatTurn, type PageContext } from '../api'
import { useAuth } from '../authContext'
import { useChat } from '../chatContext'
import { BulldogMark } from './Brand'
import FormattedText from './FormattedText'
import ProductCard from './ProductCard'

type Message = {
  role: 'user' | 'assistant'
  content: string
  products?: CardProduct[]
  error?: boolean
  /** Loaded from the database (a returning customer's earlier conversation). */
  restored?: boolean
  /** Set when this reply put search results on the page. */
  page?: { title: string; count: number }
  /** Answer guardrail result (prices verified against the database). */
  check?: { prices_checked: number; retries: number; passed: boolean } | null
}

const SUGGESTIONS = ['Do you have navy hoodies?', 'What fits a Yale dad?', 'Which quarter-zips come in a medium?']
const PRODUCT_SUGGESTIONS = ['Do you have this in pink?', 'Which sizes are left?', 'What does it look like?']
const HISTORY_TURNS = 12 // guests only: earlier turns sent with each message (logged-in history lives in the DB)

// Floating chat panel. Each message goes to POST /api/chat with the current page
// context; FastAPI runs the PydanticAI agent. Logged-in shoppers' conversations
// are saved server-side and reloaded here when they return.
export default function ChatWidget() {
  const { open, setOpen, draft, setDraft, showPageResults, pageResults, viewing } = useChat()
  const { user, checking } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [messages, setMessages] = useState<Message[]>([])
  // A one-time speech bubble from the launcher (once per browser session) invites a first question.
  const [teaser, setTeaser] = useState(false)
  useEffect(() => {
    if (sessionStorage.getItem('cc_teaser_seen')) return
    const t = window.setTimeout(() => setTeaser(true), 6000)
    return () => window.clearTimeout(t)
  }, [])
  const dismissTeaser = () => {
    setTeaser(false)
    sessionStorage.setItem('cc_teaser_seen', '1')
  }
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Customer memory: load the saved conversation on login / return; clear it on logout.
  useEffect(() => {
    if (checking) return
    if (!user) {
      setMessages([])
      return
    }
    let alive = true
    api
      .chatHistory()
      .then((history) => {
        if (!alive) return
        setMessages(
          history.map((m) => ({ role: m.role, content: m.content, products: m.products, restored: true })),
        )
      })
      .catch(() => alive && setMessages([]))
    return () => {
      alive = false
    }
  }, [user, checking])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, sending, open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const restoredCount = messages.filter((m) => m.restored).length
  const greeting = user
    ? restoredCount
      ? `Welcome back, ${user.first_name}! Here's where we left off.`
      : `Hi ${user.first_name}! I'm the Campus Customs Bulldog. Ask me about sizes, stock, prices, or gift ideas.`
    : "Hi, I'm the Campus Customs Bulldog! Ask me about sizes, stock, prices, or gift ideas."

  // The greeting sits between the saved conversation and today's messages.
  const greetingBlock = (
    <>
      {restoredCount > 0 && <div className="chat-divider">Today</div>}
      <BulldogMark size={26} className="msg-avatar" />
      <div className="chat-msg assistant">
        <p>{greeting}</p>
      </div>
    </>
  )

  function pageContext(): PageContext {
    const onListing = pathname === '/products' && pageResults
    return {
      path: pathname,
      product_id: viewing?.product_id ?? null,
      listing_title: onListing ? pageResults.title : null,
      visible_product_ids: onListing ? pageResults.products.map((p) => p.product_id) : [],
    }
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || sending) return
    // Guests send their in-tab history; for logged-in shoppers the server loads it from the database.
    const history: ChatTurn[] = user
      ? []
      : messages
          .filter((m) => !m.error)
          .slice(-HISTORY_TURNS)
          .map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: message }])
    setDraft('')
    setSending(true)
    try {
      const res = await api.chat(message, history, pageContext())
      const page = res.page_results
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: res.reply,
          products: res.products,
          page: page ? { title: page.title, count: page.products.length } : undefined,
          check: res.check,
        },
      ])
      // Chat -> page: render the agent's search matches as cards on the Products page.
      if (page && page.products.length > 0) {
        showPageResults(page)
        if (pathname !== '/products') navigate('/products')
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      const content = err instanceof Error ? err.message : "Sorry, I can't reach the shop right now."
      setMessages((m) => [...m, { role: 'assistant', content, error: true }])
    } finally {
      setSending(false)
    }
  }

  async function clearHistory() {
    if (!window.confirm('Delete your saved chat history?')) return
    await api.clearChatHistory().catch(() => undefined)
    setMessages([])
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(draft)
  }

  const suggestions = viewing ? PRODUCT_SUGGESTIONS : SUGGESTIONS
  const showSuggestions = messages.every((m) => m.restored)

  return (
    <div className="chat-root">
      {open && (
        <section className="chat-panel" aria-label="Chat with Campus Customs">
          <header className="chat-header">
            <div className="chat-ident">
              <BulldogMark size={38} className="chat-avatar-lg" />
              <div>
                <strong>The Bulldog</strong>
                <small>
                  <span className="live-dot" /> Online · {user ? `chat saved to ${user.email}` : 'guest chat, log in to save it'}
                </small>
              </div>
            </div>
            <div className="chat-header-actions">
              {user && messages.length > 0 && (
                <button className="chat-clear" onClick={clearHistory} title="Delete saved chat history">
                  Clear
                </button>
              )}
              <button className="chat-close" aria-label="Close chat" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
          </header>

          <div className="chat-messages" ref={listRef}>
            {restoredCount > 0 && <div className="chat-divider">Your saved conversation</div>}
            {messages.map((m, i) => (
              <div key={i}>
                {i === restoredCount && greetingBlock}
                {m.role === 'assistant' && <BulldogMark size={26} className="msg-avatar" />}
                <div className={`chat-msg ${m.role} ${m.error ? 'error' : ''} ${m.restored ? 'restored' : ''}`}>
                  {m.role === 'assistant' ? <FormattedText text={m.content} /> : <p>{m.content}</p>}
                  {m.page && (
                    <button className="chat-page-link" onClick={() => navigate('/products')}>
                      ✨ {m.page.count} {m.page.title} on the page →
                    </button>
                  )}
                  {m.products && m.products.length > 0 && (
                    <div className="chat-products">
                      {m.products.map((p) => (
                        <ProductCard key={p.product_id} product={p} compact />
                      ))}
                    </div>
                  )}
                  {m.check?.passed && m.check.prices_checked > 0 && (
                    <span
                      className="chat-verified"
                      title={
                        m.check.retries
                          ? `The answer check caught an unverified claim and the Bulldog corrected it (${m.check.retries}×).`
                          : 'Every price in this answer matches our live inventory database.'
                      }
                    >
                      ✓ {m.check.prices_checked} {m.check.prices_checked === 1 ? 'price' : 'prices'} checked against live inventory
                      {m.check.retries > 0 && ' · corrected'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {messages.length === restoredCount && greetingBlock}
            {sending && (
              <div className="chat-msg assistant typing" aria-label="The Bulldog is checking the shelves">
                <span className="paws" aria-hidden>
                  <i>🐾</i>
                  <i>🐾</i>
                  <i>🐾</i>
                </span>
                checking the shelves…
              </div>
            )}
            {showSuggestions && !sending && (
              <div className="chat-suggestions">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {viewing && (
            <div className="chat-context" title="The Bulldog knows which item you're looking at">
              👀 Looking at <strong>{viewing.name}</strong>
            </div>
          )}
          <form className="chat-input" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={viewing ? 'Ask about this item…' : 'Ask about merch, sizes, stock…'}
              maxLength={2000}
              aria-label="Chat message"
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!draft.trim() || sending}>
              Send
            </button>
          </form>
        </section>
      )}

      {teaser && !open && (
        <div className="chat-teaser" role="status">
          <button className="chat-teaser-x" aria-label="Dismiss" onClick={dismissTeaser}>
            ×
          </button>
          <button
            className="chat-teaser-body"
            onClick={() => {
              dismissTeaser()
              setOpen(true)
            }}
          >
            Looking for your size? I check live stock. Just ask! 🐾
          </button>
        </div>
      )}
      <button
        className={`chat-launcher ${open ? 'is-open' : ''}`}
        onClick={() => {
          dismissTeaser()
          setOpen(!open)
        }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? <span className="launcher-x">×</span> : <BulldogMark size={40} className="launcher-dog" />}
        {!open && <span>Ask the Bulldog</span>}
      </button>
    </div>
  )
}
