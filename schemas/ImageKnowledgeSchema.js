const mongoose = require('mongoose');

const imageKnowledgeSchema = new mongoose.Schema({
    image_name: {
        type: String,
        required: true
    },
    image_url: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    record_status: {
        type: String,
    },

});

module.exports = mongoose.model('ImageKnowledge', imageKnowledgeSchema);