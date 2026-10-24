import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'
import AuthForm from './AuthForm'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to pick up your chat where you left off."
      submitLabel="Log in"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', maxLength: 128 },
      ]}
      onSubmit={async (v) => {
        await login(v.email, v.password)
        navigate('/products')
      }}
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    />
  )
}
