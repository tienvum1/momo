import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.jsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastContainer limit={1} position="top-right" autoClose={2500} newestOnTop closeOnClick theme="colored" />
  </StrictMode>,
)
