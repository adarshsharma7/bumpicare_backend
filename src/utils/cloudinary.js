import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key:process.env.CLOUDINARY_API_NAME , 
  api_secret:process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary=async(localfilepath)=>{
try {
    if(!localfilepath) return null

    //upload file on cloudinary
  const response= await cloudinary.uploader.upload(localfilepath,{
        resource_type:"auto"
      })
      // console.log(response)
      // console.log("file is uploaded on cloudinary",response.url);
      fs.unlinkSync(localfilepath)
      return response

} catch (error) {
    fs.unlinkSync(localfilepath)
    return null
}
}

export {uploadOnCloudinary}