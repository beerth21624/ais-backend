const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
    },
    general_knowledge: {
        type:String,
    },
    link_knowledge: {
        type: Array,
    },
    image_knowledge: {
        type: Array,
    },
    qa_knowledge: {
        type: Array,
    },

    record_status: {
        type: String,
        default: 'A'
    },

});

module.exports = mongoose.model('Folder', folderSchema);