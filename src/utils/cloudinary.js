import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Upload Single File
const uploadOnCloudinary = async (localfilepath) => {
  try {
    if (!localfilepath) return null;

    // Upload file on cloudinary
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
      folder: "bumpicare", // Organize files in folder
    });

    // Delete local file after successful upload
    fs.unlinkSync(localfilepath);
    return response;
  } catch (error) {
    // Delete local file on error
    if (fs.existsSync(localfilepath)) {
      fs.unlinkSync(localfilepath);
    }
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

// ✅ Upload Multiple Files (for product images)
const uploadMultipleOnCloudinary = async (localFilePaths) => {
  try {
    if (!localFilePaths || localFilePaths.length === 0) return [];

    const uploadPromises = localFilePaths.map((filePath) =>
      cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
        folder: "bumpicare/products",
      })
    );

    const responses = await Promise.all(uploadPromises);

    // Delete all local files after upload
    localFilePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    return responses.map((res) => res.secure_url);
  } catch (error) {
    // Delete local files on error
    localFilePaths.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    console.error("Cloudinary multiple upload error:", error);
    return [];
  }
};

// ✅ Delete Image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, uploadMultipleOnCloudinary, deleteFromCloudinary };