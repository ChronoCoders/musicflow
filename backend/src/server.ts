import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import tracksRouter from "./routes/tracks"

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
)
app.use(express.json())

app.use("/api/tracks", tracksRouter)

app.get("/health", (req, res) => {
  res.json({ status: "OK" })
})

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`)
})
