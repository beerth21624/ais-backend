const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
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
    prompt: {
        type: String,
    },
    folder_knowledge: {
        type: Array,
    },
    record_status: {
        type: String,
    },

});

module.exports = mongoose.model('Character', characterSchema);