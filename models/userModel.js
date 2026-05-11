const axios = require('axios');
const DB = 'http://localhost:3000';

exports.findAll = () => axios.get(`${DB}/users`);
exports.findByEmail = async (email) => {
  const response = await axios.get(`${DB}/users`);
  return response.data.find(u => u.email === email);
};
exports.create = (userData) => axios.post(`${DB}/users`, userData);