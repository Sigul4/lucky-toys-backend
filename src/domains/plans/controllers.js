const plans = require("./model");

module.exports.showAllPlans = async (req, res) => {
    try {
      const plansArray = await plans.find({}).lean();
  
      res.json(plansArray);
    } catch (err) {
      res.json({ error: err.message });
    }
  };

module.exports.createPlan = async (req, res) => {
    const planBody = req.body;

    try {
      const plan = await plans.create({ 
            price: planBody.price,
            title: planBody.title,
            description: planBody.description,
            duration: planBody.duration,
            advantages: planBody.advantages
       });
       res.status(201).json({ success: true, plan });
    } catch (err) {
      res.json({ error: err.message });
    }
};    
