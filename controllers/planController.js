const Plan = require('../models/planModel'); 

exports.getPlans = async (req, res) => {
  const response = await Plan.getAll(); 
  res.json(response.data);
};

exports.addPlan = async (req, res) => {
  const response = await Plan.create(req.body); 
  res.json(response.data);
};

exports.updatePlan = async (req, res) => {
  const response = await Plan.update(req.params.id, req.body); 
  res.json(response.data);
};

exports.deletePlan = async (req, res) => {
  await Plan.remove(req.params.id); 
  res.json({ message: "Deleted successfully" });
};