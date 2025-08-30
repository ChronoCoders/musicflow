"use strict";
var __importDefault = (this?.__importDefault) || function (mod) {
    return (mod?.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
// Get all tracks for a wallet
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const artist = await prisma.artist.findUnique({
            where: { walletAddress },
            include: {
                tracks: {
                    include: {
                        revenues: true
                    }
                }
            }
        });
        res.json(artist?.tracks || []);
    }
    catch (error) {
        console.error('Get tracks error:', error);
        res.status(500).json({ error: 'Failed to fetch tracks' });
    }
});
// Register a new track
router.post('/register', async (req, res) => {
    try {
        const { trackId, title, walletAddress } = req.body;
        // Find or create artist
        let artist = await prisma.artist.findUnique({
            where: { walletAddress }
        });
        if (!artist) {
            artist = await prisma.artist.create({
                data: { walletAddress }
            });
        }
        // Create track
        const track = await prisma.track.create({
            data: {
                trackId,
                title,
                artistId: artist.id
            }
        });
        res.json(track);
    }
    catch (error) {
        console.error('Register track error:', error);
        res.status(500).json({ error: 'Failed to register track' });
    }
});
// Add revenue to a track
router.post('/revenue', async (req, res) => {
    try {
        const { trackId, amount, platform } = req.body;
        const track = await prisma.track.findUnique({
            where: { trackId }
        });
        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }
        // Add revenue record
        const revenue = await prisma.revenue.create({
            data: {
                trackId: track.id,
                amount: parseFloat(amount),
                platform
            }
        });
        // Update track total earnings
        await prisma.track.update({
            where: { id: track.id },
            data: {
                totalEarnings: {
                    increment: parseFloat(amount)
                }
            }
        });
        res.json(revenue);
    }
    catch (error) {
        console.error('Add revenue error:', error);
        res.status(500).json({ error: 'Failed to add revenue' });
    }
});
exports.default = router;
