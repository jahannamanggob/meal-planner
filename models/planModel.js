const axios = require('axios');
const DB = 'http://localhost:3000';

exports.getAll = () => axios.get(`${DB}/plans`);
exports.create = (data) => axios.post(`${DB}/plans`, data);
exports.update = (id, data) => axios.put(`${DB}/plans/${id}`, data);
exports.remove = (id) => axios.delete(`${DB}/plans/${id}`);