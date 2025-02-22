import {v2 as cloudinary} from 'cloudinary'
import songModel from '../models/songModel.js';

// ==================Upload song in mongodb database and cloudinary ============================
const addSong = async (req, res) =>{
    try {
        // console.log("addSong function called");
        // fetching from request
        const name = req.body.name
        const desc = req.body.desc
        const album = req.body.album
        // console.log(req.files)
        const audioFile = req.files.audio[0]
        const imageFile = req.files.image[0]

        // upload image and audio in cloudinary
        const audioUpload = await cloudinary.uploader.upload(audioFile.path, {resource_type: "video"})
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type: "image"})

        // console.log(audioUpload)
        // console.log(imageUpload)

        // set the song duration from "duration" property of audioUpload
        const duration = `${Math.floor(audioUpload.duration/60)}:${Math.floor(audioUpload.duration%60)}`

        const songData = {
            name,
            desc,
            album,
            image: imageUpload.secure_url,
            file: audioUpload.secure_url,
            duration
        }


        // saving the song data in mongodb in song model
        const song = songModel(songData)
        await song.save()

        res.json({
            success : true,
            message : "song added"
        })
        
    } catch (error) {
        // console.log(error)
        res.json({
            success : false
        })
    }
}



// =========== get the all song data from database================
const listSong = async (req, res) =>{
    try {
        // get all song from song model by using find method
        const allSongs = await songModel.find({})
        res.json({
            success : true,
            songs : allSongs
        })
    } catch (error) {
        res.json({
            success : false
        })
    }
}


// ===================Remove song from database======================
const removeSong = async (req, res) =>{
    try {
        
        await songModel.findByIdAndDelete(req.body.id)
        res.json({
            success : true,
            message : "Song removed"
        })

    } catch (error) {
        req.json({
            success : false
        })
    }
}


export {addSong, listSong, removeSong}