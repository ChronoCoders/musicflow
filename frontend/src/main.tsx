import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App'

// Disabled to prevent conflicts with main Next.js app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>Frontend app disabled - using main Next.js app</div>
  </StrictMode>,
)
