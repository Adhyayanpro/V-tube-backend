import { asyncHandler } from "../utils/asyncHandler.js";
import{ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefreshTokens=async(userId)=>{
  try{
    const user=await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()
    user.refreshToken=refreshToken//adding refresh token to the database
    await user.save({validateBeforeSave:false})
    return {accessToken,refreshToken}
  }catch(error){
    throw new ApiError(500,"something went wrong while generating access and refresh token")
  }
}
const registerUser = asyncHandler(async (req, res) => {
  //get user details from  frontend
  //validation--not empty 
  //check if user already exist:username and email
  //check for images,check for avatars
  //upload them to cloudinary,avatar
  //create user object -create entry in db
  //remove password and refresh token feild from response 
  //check for user creation 
  //return res

const {fullName,email,username,password}=req.body
  // console.log("email:",email); 
  if ([fullName, email, username, password].some((field) => field?.trim() === "")) 
   { throw new ApiError(400, "All fields are required");
}
//user already exist or not
const existedUser=await User.findOne({
  $or:[{username},{email}]
})
if(existedUser){
  throw new ApiError(409,"user with email or username alredy exist")
}
//4
const avatarlocalpath=req.files?.avatar[0]?.path;
const coverImagelocalpath=req.files?.coverImage[0]?.path;
// let coverImageLocalPath;
// if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
//   coverImageLocalPath=req.files.coverImage[0].path
// }
if(!avatarlocalpath){
  throw new ApiError(400,"avatar is not found")
}
//upload the file on cloudinary
const avatar=await uploadOnCloudinary(avatarlocalpath);
const coverImage=await uploadOnCloudinary(coverImagelocalpath);
if(!avatar){
  throw new ApiError(400,"avatar is not found")
}
const user=await User.create({
  fullName,
  avatar:avatar.url,
  coverImage:coverImage?.url||"",
  email,
  password,
  username:username.toLowerCase()
})

const createdUser=await User.findById(user._id).select(
  "-password -refreshToken"
)
if(!createdUser){
  throw new ApiError(500,"something went wrong while registering the user")
}
return res.status(201).json(
  new ApiResponse(200,createdUser,"user registered successfully")
)

})

const loginUser=asyncHandler(async(req,res)=>{
   //req body se data le aao
   //username or email
   //find the user
   //password check
   //access and refresh token
   //send cookie


   const {email,username,password}=req.body
   if(!(username||email)){
    throw new ApiError(400,"username or email is required")
   }
   const user=await User.findOne({
      $or:[{username},{email}]
    })
    if(!user){
      throw new ApiError(404,"user does not exist")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
      throw new ApiError(401,"invalid user credentials")

    }
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")


    const options={
      httpOnly:true,
      secure:true
    }
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,{
          user:loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
      )
    )


    
    //hamara wala user ka u lowercase hai User mongoose provide karta jo findone etc use karne me help karta hai
})
const logOutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,{
      $set:{
        refreshToken:undefined
      }
    },{
      new:true//new res bejhega
    }
  )
  const options={
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(
    200,{},"user logged out"
  ))
  
})
const refreshAccessToken=asyncHandler(async(req,res)=>{
  const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken
  if(!incomingRefreshToken){
    throw new ApiError(401,"unauthroized request")
  }
  try {
    const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user= await User.findById(decodedToken?._id)
    if(!user){
      throw new ApiError(401,"invalid refresh token")
    }
    if(!incomingRefreshToken!=user?.refreshToken){
      throw new ApiError(401,"refresh token is expired or used ")
    }
    const optins={httpOnly:true,secure:true}
     const {accessToken,newrefreshToken}=await generateAccessAndRefreshTokens(user._id)
  
  
    return res
    .status(200)
    .cookie("accessToken",accessToken,optins)
    .cookie("refreshToken",newrefreshToken,optins)
    .json(
      new ApiResponse(
        200,{
          accessToken,refreshToken:newrefreshToken
        },"Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message||"invalid refresh token")
    
  }
})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
  const {oldPassword,newPassword}=req.body
  const user=await User.findById(req.user?._id)
  const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
  if(!isPasswordCorrect){
    throw new ApiError(400,"password is not correct")
  }
  user.password=newPassword
  await user.save({validateBeforeSave:false})
  return res.status(200)
  .json(new ApiResponse(200,{},"password is changed successfully"))
})
const getCurrentUser=asyncHandler(async(req,res)=>{
  return res
  .status(200)
  .json(new ApiResponse(200,req.user,"current user fetched successfully "))
})
const updateAccountDetails=asyncHandler(async(req,res)=>{
  const {fullName,email}=req.body

  if(!fullName||!email){
    throw new ApiError(400,"All feilds are required")
  }
 const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        fullName,
        email:email
      }
    },
    {new:true}//update hone ke baad jo information save hogi vo return ho jaayegi
  
  
  )
  .select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"account details are updated"))
})
const updateUserAvatar=asyncHandler(async(req,res)=>{ 
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
      throw new ApiError(400,"file not found")
    }
    const existingUser = await User.findById(req.user?._id);
if (!existingUser) {
  throw new ApiError(404, "User not found"); // Throw an error if the user is not found
}

// Delete the old avatar from Cloudinary if it exists
if (existingUser.avatar) {
  const deleteResult = await deleteFromCloudinary(existingUser.avatar); // Assume `deleteFromCloudinary` is a helper to delete images
  if (!deleteResult.success) {
    throw new ApiError(400, "Error deleting old avatar");
  }
}
   const avatar=await uploadOnCloudinary(avatarLocalPath)
   if(!avatar.url){
    throw new ApiError(400,"error while uploading on avatar")

   }
   const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar:avatar.url
      }
    },
    {new:true}
   ).select("-password")
return res
.status(200)
.json(
  new ApiResponse(
  200,user,"avatar is uploaded successfully"
))
})
const updateUserCoverImage=asyncHandler(async(req,res)=>{
  const coverLocalPath=req.file?.path
  if(!coverLocalPath){
    throw new ApiError(400,"coverImage not found")
  }
 const coverImage=await uploadOnCloudinary(coverLocalPath)
 if(!coverImage.url){
  throw new ApiError(400,"error while uploading on image")

 }
 const user=await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set:{
      coverImage:coverImage.url
    }
  },
  {new:true}
 ).select("-password")
 return res
.status(200)
.json(
  new ApiResponse(
  200,user,"image is uploaded successfully"
))
})
const getUserChannelProfile=asyncHandler(async(req,res)=>{
  const {username}=req.params

  if(!username?.trim()){
    throw new ApiError(400,"username is missing")
  }
  const channel=await User.aggregate([
    {
      $match:{
        username:username?.toLoweCase()
      },
      
    },{
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },{
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      }
    },{
      $addFields:{
        subscribersCount:{
          $size:"$subscribers"
        },
        channelSubscribedToCount:{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in:[req.user?._id,"$subscribers.subscriber"]},
            then:true,
            else:false
          }
        }
        
      }
    },
    {
      $project:{
        fullName:1,username:1,subscribersCount:1,
        channelSubscribedToCount:1,isSubscribed:1,
        avatar:1,coverImage:1,email:1

      }
    }
  ])
  if(!channel?.length){
    throw new ApiError(404,"channel does not exist")
  }
  return res.status(200)
  .json(
    new ApiResponse(200,
      channel[0],"user channel fetched successfully"
    )
  )
})

export { registerUser,loginUser,logOutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateUserAvatar,updateUserCoverImage,getUserChannelProfile }