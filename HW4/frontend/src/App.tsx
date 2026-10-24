import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './authContext'
import { BagProvider } from './bagContext'
import BagDrawer from './components/BagDrawer'
import { ChatProvider } from './chatContext'
import ChatWidget from './components/ChatWidget'
import Footer from './components/Footer'
import NavBar from './components/NavBar'
import About from './pages/About'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import ProductDetail from './pages/ProductDetail'
import Products from './pages/Products'
import Signup from './pages/Signup'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <BagProvider>
        <ChatProvider>
          <ScrollToTop />
          <NavBar />
          <main className="site-main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ChatWidget />
          <BagDrawer />
        </ChatProvider>
      </BagProvider>
    </AuthProvider>
  )
}
