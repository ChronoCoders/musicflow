# MusicFlow - Decentralized Music Royalty Distribution

A full-stack decentralized application for managing music royalty distribution on the Polygon blockchain.

## Features

- **Track Registration**: Register music tracks with blockchain verification
- **Revenue Tracking**: Monitor earnings from multiple platforms
- **Smart Contract Integration**: Automated royalty distribution via smart contracts
- **Analytics Dashboard**: Comprehensive revenue analytics and insights
- **Multi-Platform Support**: Track revenue from various streaming platforms
- **Wallet Integration**: Connect with MetaMask and other Web3 wallets

## Project Structure

\`\`\`
musicflow/
├── frontend/          # React + Vite frontend
├── backend/           # Express.js API server
├── contracts/         # Solidity smart contracts
├── scripts/           # Deployment scripts
└── README.md
\`\`\`

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MetaMask wallet
- Alchemy API key (for Polygon network)

### Installation

1. **Install all dependencies:**
\`\`\`bash
npm run install:all
\`\`\`

2. **Set up environment variables:**
\`\`\`bash
cp .env.example .env
# Edit .env with your actual API keys
\`\`\`

3. **Set up the database:**
\`\`\`bash
cd backend
npm run db:generate
npm run db:push
\`\`\`

4. **Start development servers:**
\`\`\`bash
npm run dev
\`\`\`

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Environment Variables

Create a `.env` file in the root directory:

\`\`\`env
# Backend Configuration
PORT=3001

# Blockchain Configuration
ALCHEMY_API_KEY=your_alchemy_api_key_here
PRIVATE_KEY=your_private_key_here

# Frontend Configuration
VITE_ALCHEMY_API_KEY=your_alchemy_api_key_here
VITE_API_BASE_URL=http://localhost:3001/api
\`\`\`

## Development

### Backend (Express + Prisma)
\`\`\`bash
cd backend
npm run dev          # Start development server
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Run database migrations
\`\`\`

### Frontend (React + Vite)
\`\`\`bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
\`\`\`

### Smart Contracts (Hardhat)
\`\`\`bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run deploy       # Deploy to network
\`\`\`

## Key Components

### Backend API Endpoints
- `GET /api/tracks/:walletAddress` - Get tracks for wallet
- `POST /api/tracks/register` - Register new track
- `POST /api/tracks/revenue` - Add revenue record

### Frontend Components
- **Dashboard**: Main interface for track management
- **AnalyticsDashboard**: Revenue analytics and charts
- **Wallet Integration**: Web3 wallet connection

### Smart Contract
- **RoyaltyDistributor**: Handles on-chain royalty distribution

## Technologies

- **Frontend**: React 18, TypeScript, Vite, Wagmi, Chart.js
- **Backend**: Express.js, Prisma ORM, SQLite
- **Blockchain**: Solidity, Hardhat, Polygon Network
- **Styling**: CSS3, Responsive Design

## Troubleshooting

### Common Issues

1. **Missing dependencies**: Run `npm run install:all`
2. **Database issues**: Run `npm run db:generate && npm run db:push` in backend
3. **Wallet connection**: Ensure MetaMask is installed and connected to Polygon
4. **API errors**: Check backend server is running on port 3001

### Build Errors

If you encounter build errors:
1. Delete `node_modules` in all directories
2. Run `npm run install:all`
3. Restart development servers

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and questions, please open a GitHub issue or contact the development team.
