import { Fragment, type ReactNode } from 'react'

// Renders the small formatting subset the agent is allowed to use: **bold** and
// "- " bullet lines. Everything else is plain text (React escapes it), so model
// output can never inject HTML into the page.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

export default function FormattedText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*[-•*]\s+(.*)$/)
    if (m) {
      bullets.push(m[1])
    } else {
      flush()
      if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>)
    }
  }
  flush()
  return <>{blocks}</>
}
