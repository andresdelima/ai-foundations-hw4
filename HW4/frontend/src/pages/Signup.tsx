import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../authContext'
import AuthForm from './AuthForm'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  return (
    <AuthForm
      title="Create your account"
      subtitle="Save your chats with the Bulldog shopping assistant."
      submitLabel="Create account"
      fields={[
        { name: 'first_name', label: 'First name', type: 'text', autoComplete: 'given-name', maxLength: 60 },
        { name: 'last_name', label: 'Last name', type: 'text', autoComplete: 'family-name', maxLength: 60 },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        { name: 'password', label: 'Password (8+ characters)', type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 128 },
        { name: 'confirm', label: 'Confirm password', type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 128 },
      ]}
      onSubmit={async (v) => {
        if (v.password !== v.confirm) return 'Passwords do not match.'
        await signup({ first_name: v.first_name, last_name: v.last_name, email: v.email, password: v.password })
        navigate('/products')
      }}
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    />
  )
}
