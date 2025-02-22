import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import songRoute from './src/routes/songRoute.js'
import connectDB from './src/config/mongodb.js'
import connectCloudinary from './src/config/cloudinary.js'
import albumRouter from './src/routes/albumRoute.js'

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors())


// initializing
app.use("/api/song", songRoute)
app.use("/api/album", albumRouter)
app.get("/", (req, res)=>{res.send("Api working")})

app.listen(port, ()=>console.log(`Server is listening on port ${port}`))