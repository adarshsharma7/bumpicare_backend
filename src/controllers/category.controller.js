import Category from "../models/category.model.js";
import { verifyJWT } from "../middleware/auth.middleware.js"; 
import mongoose from "mongoose";


// ✅ Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Get Categories Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Add new category (Admin only)
export const addCategory = async (req, res) => {
  try {
    const admin = req.user; 

    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name required" });
    }

    const existing = await Category.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = await Category.create({ name, description });

    return res.status(201).json({ success: true, message: "Category created", category });
  } catch (error) {
    console.error("Category Add Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Update category (Admin only)
export const updateCategory = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id, name, description } = req.body;

    const updated = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, message: "Category updated", updated });
  } catch (error) {
    console.error("Category Update Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


// ✅ Delete category (Admin only)
export const deleteCategory = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.body;
    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Category Delete Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
