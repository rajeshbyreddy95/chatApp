import express from 'express'
import bcrypt from 'bcryptjs'
export const signup = (req,res)=>{
    const {fullname, email, password} = req.body
    try {
        if(password.length < 6){
            
        }
        // hash password

    } catch (error) {
        
    }
}
export const login = (req,res)=>{
    res.send("login route")
}
export const logout = (req,res)=>{
    res.send("logout route")
}