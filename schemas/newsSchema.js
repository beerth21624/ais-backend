const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title : {
        type: String,
        required: true
    },
    content : {
        type: String,
        required: true
    },
    image_url : {
        type: String,
        required: true
    },
    record_status : {
        type: String,
    },
    public_at : {
        type: Date,
    },
    created_at : {
        type: Date,
        default: Date.now
    },
    updated_at : {
        type: Date,
        default: Date.now
    }
});