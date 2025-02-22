import {v2 as cloudinary} from "cloudinary"
import albumModel from "../models/albumModel.js";

// ================Add album in mongodb database and cloudinary============================
const addAlbum = async (req, res) =>{
    try {
        // console.log("executed here")

        // fetching from request
        const name = req.body.name;
        const desc = req.body.desc;
        const bgColor = req.body.bgColor;
        const imageFile = req.file;

        // upload image in cloudinary
        const uploadImage = await cloudinary.uploader.upload(imageFile.path, {resource_type: "image"})

        const albumData = {
            name,
            desc,
            bgColor,
            image : uploadImage.secure_url
        }

        // saving the album data in mongodb in song model
        const album = albumModel(albumData)
        await album.save()

        res.json({
            success : "true"
        })

    } catch (error) {
        // console.log(error)
        res.json({
            success: "false",
        })
    }
}


// =========== get the all album data from database================
const listAlbum = async (req, res) =>{
    try {
        // get all album from album model by using find method
        const allAlbums = await albumModel.find({})
        res.json({
            success : "true",
            album : allAlbums
        })


    } catch (error) {
        res.json({
            success: "false",
        })
    }    
}


// ===================Remove song from database======================
const removeAlbum = async (req, res) =>{
    try {
        await albumModel.findByIdAndDelete(req.body.id)
        res.json({
            success : "true",
            message : "album removed"
        })
    } catch (error) {
        res.json({
            success: "false",
        })
    }
}

export {addAlbum, listAlbum, removeAlbum}