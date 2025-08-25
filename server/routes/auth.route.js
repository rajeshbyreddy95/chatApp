import express from 'express'
import { login, logout, signup } from '../controllers/auth.controller.js'
import User from '../model/user.model.js'
import { generateToken } from '../lib/utils.js'
import mongoose from 'mongoose'
const router = express.Router()
import bcrypt from 'bcryptjs'
import { protectRoute } from '../middlewear/auth.middlewear.js'
import cloudinary from '../lib/cloudinary.js'

router.post('/signup', async(req,res)=>{
    const {fullname, email, password} = req.body
    console.log("the password is ", password);
    
    try {
        // password length checking
        if(password.length < 6){
            res.status(400).json({message:"password must be 6 characters"})
        }

        //checking user exists or not 
        const user = await User.findOne({email})

        if(user) return res.status(400).json({message:"user already exist"})


        // hash password
        const salt = await bcrypt.genSalt(10)
        const hashpassword = await bcrypt.hash(password, salt)

        const newUser =await new User({
            fullname,
            email,
            password:hashpassword
        })
        
        if(newUser){
            await newUser.save()
            // generate web token
            generateToken(newUser._id, res);
            

            return res.status(201).json({
                _id : newUser._id,
                fullname:newUser.fullname,
                email:newUser.email,
                profilepicture:newUser.profilepicture
            })
        }else{
            res.status(400).json({message:"invalid data"})
        }

    } catch (error) {
        console.log("Error in Signup controller ", error);
        return res.status(500).json({message:"internal server error"})
        
    }
})
router.post('/login',async(req, res)=>{
    const {email, password} = req.body
    console.log('====================================');
    console.log(email, password);
    console.log('====================================');
    try {
        const user = await User.findOne({email})

        if(!user){
            return res.status(400).json({message:"user not exist"})
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if(!isPasswordCorrect){
            return res.status(401).json({message:"passwprd does not match"})
        }
        generateToken(user._id, res)
        res.status(200).json({
            _id:user._id,
            fullname:user.fullname,
            profilepicture:user.profilepicture,
            email:user.email
        })
        
    } catch (error) {
        console.log("error in login controller");
        res.status(500).json({message:"internal error"})
        
    }
})
router.post('/logout', async(req,res)=>{
    try {
        res.cookie("jwt","",{maxAge:0})
        res.status(200).json({message:"loggedout successfully "})
    } catch (error) {
        console.log("error in logout error");
        res.status(500).json({message:"internal server error"})
    }
})

router.put('/update-profile', protectRoute, async(req,res)=>{
    try {
        const {profilepicture} = req.body
        const userId = req.user._id

        if(!profilepicture){
            return res.status(400).json({message:"profile picture is required"})
        }
        const uploadResponse = await cloudinary.uploader.upload(profilepicture)
        const updateUser = await User.findByIdAndUpdate(userId,{profilepicture:uploadResponse.secure_url}, {new:true})

        res.status(200).json(updateUser)
    } catch (error) {
        console.log("error in updating profile picture");
        res.status(500).json({message:"Internal Server error"})
        
    }


})

router.get("/check", protectRoute, async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "User is authorized",
      user: req.user,
    });
  } catch (error) {
    console.error("Error in /check:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router