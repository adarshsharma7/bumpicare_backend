// controllers/promotionalDeals/featuredDealController.js

import FeaturedDeal from '../../models/FeaturedDeal.js';

export const getAllFeaturedDeals = async (req, res) => {
  try {
    const { isActive } = req.query;
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const deals = await FeaturedDeal.find(filter)
      .populate('product', 'name images price stock category')
      .populate('category', 'name')
      .populate('bundleProducts.product', 'name images price')
      .populate('createdBy', 'name email')
      .sort({ displayOrder: -1, createdAt: -1 });

    return res.status(200).json({ success: true, data: deals, count: deals.length });
  } catch (error) {
    console.error('Get featured deals error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const getSingleFeaturedDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await FeaturedDeal.findById(id)
      .populate('product', 'name images price stock category')
      .populate('category', 'name')
      .populate('bundleProducts.product', 'name images price')
      .populate('createdBy', 'name email');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Featured deal not found' });
    }
    return res.status(200).json({ success: true, data: deal });
  } catch (error) {
    console.error('Get featured deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const createFeaturedDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const deal = await FeaturedDeal.create({ ...req.body, createdBy: admin._id });
    await deal.populate('product', 'name images');
    return res.status(201).json({ success: true, message: 'Featured deal created successfully', data: deal });
  } catch (error) {
    console.error('Create featured deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const updateFeaturedDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const deal = await FeaturedDeal.findByIdAndUpdate(id, req.body, { new: true })
      .populate('product', 'name images')
      .populate('category', 'name');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Featured deal not found' });
    }
    return res.status(200).json({ success: true, message: 'Featured deal updated successfully', data: deal });
  } catch (error) {
    console.error('Update featured deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const deleteFeaturedDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const deal = await FeaturedDeal.findByIdAndDelete(id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Featured deal not found' });
    }
    return res.status(200).json({ success: true, message: 'Featured deal deleted successfully' });
  } catch (error) {
    console.error('Delete featured deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};