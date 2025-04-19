import express from "express"
import cors from "cors";
import cookieParser from "cookie-parser"
const app=express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))//used in reading of url
app.use(express.static("public"))//ye kuch pdf ya favicon ko public wale folder me rakhega
app.use(cookieParser())//ye cookies ko store karne me kaam me aata hai
//rotes import
import  userRouter from './routes/user.routes.js';





//routes declaration
app.use("/api/v1/users",userRouter)

//http://localhost:8000/api/v1/users/register
export {app}