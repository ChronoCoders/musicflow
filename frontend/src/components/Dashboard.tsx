import React, { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { parseEther, keccak256, toBytes, formatEther } from 'viem'
import { ROYALTY_DISTRIBUTOR_ADDRESS, ROYALTY_DISTRIBUTOR_ABI } from '../contracts/RoyaltyDistributor'

const Dashboard: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract } = useWriteContract()
  
  const [trackName, setTrackName] = useState('')
  const [revenueAmount, setRevenueAmount] = useState('')
  const [selectedTrackId, setSelectedTrackId] = useState('')

  const { data: pendingBalance } = useReadContract({
    address: ROYALTY_DISTRIBUTOR_ADDRESS,
    abi: ROYALTY_DISTRIBUTOR_ABI,
    functionName: 'pendingWithdrawals',
    args: [address as `0x${string}`],
  })

  const handleRegisterTrack = () => {
    console.log('Register track clicked', trackName)
    if (!trackName) {
      alert('Please enter track name')
      return
    }
    
    try {
      const trackId = keccak256(toBytes(trackName))
      console.log('Track ID:', trackId)
      
      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: 'registerTrack',
        args: [trackId],
      })
    } catch (error) {
      console.error('Register error:', error)
    }
  }

  const handleAddRevenue = () => {
    console.log('Add revenue clicked', selectedTrackId, revenueAmount)
    if (!selectedTrackId || !revenueAmount) {
      alert('Please fill all fields')
      return
    }
    
    try {
      const trackId = keccak256(toBytes(selectedTrackId))
      
      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: 'addRevenue',
        args: [trackId],
        value: parseEther(revenueAmount),
      })
    } catch (error) {
      console.error('Add revenue error:', error)
    }
  }

  const handleWithdraw = () => {
    console.log('Withdraw clicked')
    try {
      writeContract({
        address: ROYALTY_DISTRIBUTOR_ADDRESS,
        abi: ROYALTY_DISTRIBUTOR_ABI,
        functionName: 'withdraw',
      })
    } catch (error) {
      console.error('Withdraw error:', error)
    }
  }

  if (!isConnected) {
    return (
      <div style={{padding: '20px'}}>
        <h2>Connect Wallet</h2>
        {connectors.map((connector) => (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            style={{margin: '5px', padding: '10px'}}
          >
            Connect {connector.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div style={{padding: '20px'}}>
      <div style={{marginBottom: '20px', padding: '10px', border: '1px solid #ccc'}}>
        <p><strong>Connected:</strong> {address}</p>
        <p><strong>Pending Balance:</strong> {pendingBalance ? formatEther(pendingBalance) : '0'} MATIC</p>
        <button 
          onClick={() => disconnect()} 
          style={{margin: '5px', padding: '8px'}}
        >
          Disconnect
        </button>
        <button 
          onClick={handleWithdraw} 
          style={{margin: '5px', padding: '8px', backgroundColor: '#4CAF50', color: 'white'}}
        >
          Withdraw
        </button>
      </div>

      <div style={{marginBottom: '20px', padding: '10px', border: '1px solid #ccc'}}>
        <h3>Register Track</h3>
        <input
          type="text"
          value={trackName}
          onChange={(e) => setTrackName(e.target.value)}
          placeholder="Track Name"
          style={{padding: '8px', marginRight: '10px', width: '200px'}}
        />
        <button 
          onClick={handleRegisterTrack} 
          style={{padding: '8px', backgroundColor: '#2196F3', color: 'white'}}
        >
          Register
        </button>
      </div>

      <div style={{padding: '10px', border: '1px solid #ccc'}}>
        <h3>Add Revenue</h3>
        <input
          type="text"
          value={selectedTrackId}
          onChange={(e) => setSelectedTrackId(e.target.value)}
          placeholder="Track Name"
          style={{padding: '8px', marginRight: '10px', width: '200px'}}
        />
        <input
          type="number"
          value={revenueAmount}
          onChange={(e) => setRevenueAmount(e.target.value)}
          placeholder="Amount (MATIC)"
          step="0.01"
          style={{padding: '8px', marginRight: '10px', width: '150px'}}
        />
        <button 
          onClick={handleAddRevenue} 
          style={{padding: '8px', backgroundColor: '#FF9800', color: 'white'}}
        >
          Add Revenue
        </button>
      </div>
    </div>
  )
}

export default Dashboard