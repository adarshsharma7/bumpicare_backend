// controllers/promotionalDeals/flashSaleController.js

import FlashSale from '../../models/FlashSale.js';

// Get all flash sales
export const getAllFlashSales = async (req, res) => {
    try {
        const { isActive } = req.query;

        let filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const flashSales = await FlashSale.find(filter)
            .populate('products.product', 'name images category brand')
            .populate('createdBy', 'name email')
            .sort({ priority: -1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: flashSales,
            count: flashSales.length
        });
    } catch (error) {
        console.error('Get flash sales error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Get single flash sale
export const getSingleFlashSale = async (req, res) => {
    try {
        const { id } = req.params;

        const flashSale = await FlashSale.findById(id)
            .populate('products.product', 'name images category brand stock')
            .populate('createdBy', 'name email');

        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Flash sale not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: flashSale
        });
    } catch (error) {
        console.error('Get flash sale error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Create flash sale
export const createFlashSale = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const {
            name,
            description,
            banner,
            products,
            startDate,
            endDate,
            priority
        } = req.body;

        const flashSale = await FlashSale.create({
            name,
            description,
            banner: banner || '',
            products,
            startDate,
            endDate,
            priority: priority || 0,
            isActive: true,
            createdBy: admin._id
        });

        await flashSale.populate('products.product', 'name images');

        return res.status(201).json({
            success: true,
            message: 'Flash sale created successfully',
            data: flashSale
        });
    } catch (error) {
        console.error('Create flash sale error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Update flash sale
export const updateFlashSale = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const { id } = req.params;

        const flashSale = await FlashSale.findById(id);
        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Flash sale not found'
            });
        }

        const updateFields = [
            'name', 'description', 'banner', 'products',
            'startDate', 'endDate', 'isActive', 'priority'
        ];

        updateFields.forEach(field => {
            if (req.body[field] !== undefined) {
                flashSale[field] = req.body[field];
            }
        });

        await flashSale.save();
        await flashSale.populate('products.product', 'name images');

        return res.status(200).json({
            success: true,
            message: 'Flash sale updated successfully',
            data: flashSale
        });
    } catch (error) {
        console.error('Update flash sale error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// Delete flash sale
export const deleteFlashSale = async (req, res) => {
    try {
        const admin = req.user;

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized. Admin access required.'
            });
        }

        const { id } = req.params;

        const flashSale = await FlashSale.findByIdAndDelete(id);

        if (!flashSale) {
            return res.status(404).json({
                success: false,
                message: 'Flash sale not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Flash sale deleted successfully'
        });
    } catch (error) {
        console.error('Delete flash sale error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};