const asyncHandler=(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }//next simply next middleware ko batayega ki error aaya hai tum error handling middleware par ja0
}
export{asyncHandler}





// const asyncHandler=(fn)=>async(req,res,next)=>{
//   try{
//     await fn(req,res,next)
//   }catch(error){
//     res.status(err.code||500).json({
//         success:false,
//         message:error.message
//     })
//   }
// }




