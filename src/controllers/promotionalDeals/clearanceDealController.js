// controllers/promotionalDeals/clearanceDealController.js

import ClearanceDeal from '../../models/ClearanceDeal.js';

export const getAllClearanceDeals = async (req, res) => {
  try {
    const { isActive, reason } = req.query;
    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (reason) filter.reason = reason;

    const deals = await ClearanceDeal.find(filter)
      .populate('products.product', 'name images category brand')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: deals, count: deals.length });
  } catch (error) {
    console.error('Get clearance deals error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const getSingleClearanceDeal = async (req, res) => {
  try {
    const { id } = req.params;
    const deal = await ClearanceDeal.findById(id)
      .populate('products.product', 'name images category brand stock')
      .populate('createdBy', 'name email');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Clearance deal not found' });
    }
    return res.status(200).json({ success: true, data: deal });
  } catch (error) {
    console.error('Get clearance deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const createClearanceDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const deal = await ClearanceDeal.create({ ...req.body, createdBy: admin._id });
    await deal.populate('products.product', 'name images');
    return res.status(201).json({ success: true, message: 'Clearance deal created successfully', data: deal });
  } catch (error) {
    console.error('Create clearance deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const updateClearanceDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const deal = await ClearanceDeal.findByIdAndUpdate(id, req.body, { new: true })
      .populate('products.product', 'name images');

    if (!deal) {
      return res.status(404).json({ success: false, message: 'Clearance deal not found' });
    }
    return res.status(200).json({ success: true, message: 'Clearance deal updated successfully', data: deal });
  } catch (error) {
    console.error('Update clearance deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const deleteClearanceDeal = async (req, res) => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Admin access required.' });
    }

    const { id } = req.params;
    const deal = await ClearanceDeal.findByIdAndDelete(id);
    if (!deal) {
      return res.status(404).json({ success: false, message: 'Clearance deal not found' });
    }
    return res.status(200).json({ success: true, message: 'Clearance deal deleted successfully' });
  } catch (error) {
    console.error('Delete clearance deal error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};
