import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../authContext'

export type Field = {
  name: string
  label: string
  type: string
  autoComplete: string
  minLength?: number
  maxLength?: number
}

// Shared log-in / sign-up card. `onSubmit` returns an error message or nothing.
export default function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  footer,
  onSubmit,
}: {
  title: string
  subtitle: string
  fields: Field[]
  submitLabel: string
  footer: ReactNode
  onSubmit: (values: Record<string, string>) => Promise<string | void>
}) {
  const { user, logout } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      const message = await onSubmit(values)
      if (message) setError(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="container page auth-page">
        <div className="card auth-card">
          <h1>You're logged in</h1>
          <p className="muted">
            Signed in as <strong>{user.email}</strong>.
          </p>
          <Link to="/products" className="btn btn-primary btn-block">
            Keep shopping
          </Link>
          <button className="btn btn-outline btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container page auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            <input
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              minLength={f.minLength}
              maxLength={f.maxLength}
              required
            />
          </label>
        ))}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : submitLabel}
        </button>
        <p className="muted small">{footer}</p>
      </form>
    </div>
  )
}
