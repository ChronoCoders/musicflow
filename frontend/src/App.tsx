import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import Dashboard from './components/Dashboard'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="App">
          <h1>MusicFlow</h1>
          <Dashboard />
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App