import express from "express"
import { PrismaClient } from "@prisma/client"

const router = express.Router()
const prisma = new PrismaClient()

// Get all tracks for a wallet
router.get("/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params

    const artist = await prisma.artist.findUnique({
      where: { walletAddress },
      include: {
        tracks: {
          include: {
            revenues: true,
          },
        },
      },
    })

    res.json(artist?.tracks || [])
  } catch (error) {
    console.error("Get tracks error:", error)
    res.status(500).json({ error: "Failed to fetch tracks" })
  }
})

// Register a new track
router.post("/register", async (req, res) => {
  try {
    const { trackId, title, walletAddress } = req.body

    // Find or create artist
    let artist = await prisma.artist.findUnique({
      where: { walletAddress },
    })

    if (!artist) {
      artist = await prisma.artist.create({
        data: { walletAddress },
      })
    }

    // Create track
    const track = await prisma.track.create({
      data: {
        trackId,
        title,
        artistId: artist.id,
      },
    })

    res.json(track)
  } catch (error) {
    console.error("Register track error:", error)
    res.status(500).json({ error: "Failed to register track" })
  }
})

// Add revenue to a track
router.post("/revenue", async (req, res) => {
  try {
    const { trackId, amount, platform } = req.body

    const track = await prisma.track.findUnique({
      where: { trackId },
    })

    if (!track) {
      return res.status(404).json({ error: "Track not found" })
    }

    // Add revenue record
    const revenue = await prisma.revenue.create({
      data: {
        trackId: track.id,
        amount: Number.parseFloat(amount),
        platform,
      },
    })

    // Update track total earnings
    await prisma.track.update({
      where: { id: track.id },
      data: {
        totalEarnings: {
          increment: Number.parseFloat(amount),
        },
      },
    })

    res.json(revenue)
  } catch (error) {
    console.error("Add revenue error:", error)
    res.status(500).json({ error: "Failed to add revenue" })
  }
})

export default router
