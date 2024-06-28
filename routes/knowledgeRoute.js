const router = require('express').Router();

const { createKnowledge, getKnowledges, getKnowledge, updateKnowledge, deleteKnowledge, createQaKnowledge, createImageKnowledge, deleteQaKnowledge, deleteImageKnowledge } = require('../controllers/knowledgeController');

router.post('/', createKnowledge);
router.get('/', getKnowledges);
router.get('/:id', getKnowledge);
router.patch('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.post('/qa/:folder_id', createQaKnowledge);
router.delete('/qa/:folder_id/:qa_id', deleteQaKnowledge);
router.post('/image/:folder_id', createImageKnowledge);
router.delete('/image/:folder_id/:image_id', deleteImageKnowledge);

module.exports = router;