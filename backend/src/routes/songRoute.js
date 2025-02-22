import express from 'express'
import { addSong, listSong, removeSong } from '../controllers/songController.js'
import upload from '../middleware/multer.js'

const songRoute = express.Router()

songRoute.post("/add",
 upload.fields([
    {name: "image", maxCount:1}, 
    {name:"audio", maxCount:1}
    ]), 
    addSong)

songRoute.get("/list", listSong)

songRoute.post("/remove", removeSong)

export default songRoute