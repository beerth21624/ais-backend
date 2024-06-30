const route = require('express').Router();

const { createNews, getNews, getNewsById, updateNews } = require('../controllers/newsController');

route.post('/', createNews);
route.get('/', getNews);
route.get('/:id', getNewsById);
route.patch('/:id', updateNews);

module.exports = route;