import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { SelectedMovieProvider } from './context/SelectedMovieContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <SelectedMovieProvider>
        <App />
      </SelectedMovieProvider>
    </ErrorBoundary>
  </StrictMode>,
)
