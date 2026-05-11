const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const SECRET = "secret123";

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const response = await User.create({ email, password: hashedPassword });
  res.json(response.data);
};

exports.login = async (req, res) => {
  try {
    const user = await User.findByEmail(req.body.email);
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign({ id: user.id }, SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};