const mongoose = require('mongoose');

const knowledgeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    image_name: {
        type: String,
        required: true
    },
    image_url: {
        type: String,
        required: true
    },
    record_status: {
        type: String,
    },
});

module.exports = mongoose.model('Knowledge', knowledgeSchema);

