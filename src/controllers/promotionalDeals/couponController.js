// controllers/promotionalDeals/couponController.js

import Coupon from '../../models/Coupon.js';
import mongoose from 'mongoose';

// Get all coupons
export const getAllCoupons = async (req, res) => {
    try {
        const { isActive, search } = req.query;

        let filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const coupons = await Coupon.find(filter)
            .populate('applicableProducts', 'name images price')
            .populate('applicableCategories', 'name')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: coupons,
            count: coupons.length
        });
    } catch (error) {
        console.error('Get coupons error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get single coupon
export const getSingleCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findById(id)
            .populate('applicableProducts', 'name images price')
            .populate('applicableCategories', 'name')
            .populate('createdBy', 'name email');

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: coupon
        });
    } catch (error) {
        console.error('Get coupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Create coupon
export const createCoupon = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const {
            code,
            description,
            discountType,
            discountValue,
            minOrderValue,
            maxDiscountAmount,
            usageLimit,
            userUsageLimit,
            applicableFor,
            applicableProducts,
            applicableCategories,
            applicableUsers,
            startDate,
            endDate
        } = req.body;

        // Check if code already exists
        const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code already exists'
            });
        }

        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            description,
            discountType,
            discountValue,
            minOrderValue: minOrderValue || 0,
            maxDiscountAmount: maxDiscountAmount || null,
            usageLimit: usageLimit || null,
            userUsageLimit: userUsageLimit || 1,
            applicableFor: applicableFor || 'all',
            applicableProducts: applicableProducts || [],
            applicableCategories: applicableCategories || [],
            applicableUsers: applicableUsers || [],
            startDate,
            endDate,
            isActive: true,
            createdBy: admin._id
        });

        await coupon.populate('applicableProducts', 'name images price');
        await coupon.populate('applicableCategories', 'name');

        return res.status(201).json({
            success: true,
            message: 'Coupon created successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Create coupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update coupon
export const updateCoupon = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const { id } = req.params;

        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        // Update fields
        const updateFields = [
            'description', 'discountType', 'discountValue', 'minOrderValue',
            'maxDiscountAmount', 'usageLimit', 'userUsageLimit', 'applicableFor',
            'applicableProducts', 'applicableCategories', 'applicableUsers',
            'startDate', 'endDate', 'isActive'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                coupon[field] = req.body[field];
            }
        });

        await coupon.save();
        await coupon.populate('applicableProducts', 'name images price');
        await coupon.populate('applicableCategories', 'name');

        return res.status(200).json({
            success: true,
            message: 'Coupon updated successfully',
            data: coupon
        });
    } catch (error) {
        console.error('Update coupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete coupon
export const deleteCoupon = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const { id } = req.params;

        const coupon = await Coupon.findByIdAndDelete(id);

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Coupon not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon deleted successfully'
        });
    } catch (error) {
        console.error('Delete coupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Validate coupon (for frontend use)
export const validateCoupon = async (req, res) => {
    try {
        const { code, userId, orderValue, productIds } = req.body;

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        const now = new Date();
        if (now < coupon.startDate || now > coupon.endDate) {
            return res.status(400).json({
                success: false,
                message: 'Coupon is expired or not yet active'
            });
        }

        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                message: 'Coupon usage limit reached'
            });
        }

        if (orderValue < coupon.minOrderValue) {
            return res.status(400).json({
                success: false,
                message: `Minimum order value should be ₹${coupon.minOrderValue}`
            });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (orderValue * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount) {
                discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
        } else {
            discountAmount = coupon.discountValue;
        }

        return res.status(200).json({
            success: true,
            message: 'Coupon is valid',
            data: {
                coupon,
                discountAmount: Math.round(discountAmount),
                finalAmount: Math.round(orderValue - discountAmount)
            }
        });
    } catch (error) {
        console.error('Validate coupon error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};