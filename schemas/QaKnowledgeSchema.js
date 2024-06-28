const mongoose = require('mongoose');

const qaKnowledgeSchema = new mongoose.Schema({
   question: {
       type: String,
       required: true
   },
    answer: {
         type: String,
         required: true
    },
    record_status: {
        type: String,
    },

});

module.exports = mongoose.model('QaKnowledge', qaKnowledgeSchema);