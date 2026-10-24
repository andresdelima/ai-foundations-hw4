import { Link } from 'react-router-dom'

export default function NotFound({ message = "We couldn't find that page." }: { message?: string }) {
  return (
    <div className="container page empty-state">
      <h1>Lost on Old Campus?</h1>
      <p className="muted">{message}</p>
      <Link to="/products" className="btn btn-primary">
        Back to products
      </Link>
    </div>
  )
}
