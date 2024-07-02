const router = require('express').Router();

const { createKnowledge, getKnowledges, getKnowledge, updateKnowledge, deleteKnowledge, createQaKnowledge, createImageKnowledge, deleteQaKnowledge, deleteImageKnowledge, updateQaKnowledge, updateImageKnowledge, createLinkKnowledge,
    deleteLinkKnowledge,
    multiDeleteLinkKnowledge,
    trainingLinkKnowledge,
    multiTrainingLinkKnowledge,
    getLinkKnowledge,
    getLinkKnowledgeById
 } = require('../controllers/knowledgeController');

router.post('/', createKnowledge);
router.get('/', getKnowledges);
router.get('/:id', getKnowledge);
router.patch('/:id', updateKnowledge);
router.delete('/:id', deleteKnowledge);
router.post('/qa/:folder_id', createQaKnowledge);
router.patch('/qa/:folder_id/:qa_id', updateQaKnowledge);
router.delete('/qa/:folder_id/:qa_id', deleteQaKnowledge);
router.post('/image/:folder_id', createImageKnowledge);
router.patch('/image/:folder_id/:image_id', updateImageKnowledge);
router.delete('/image/:folder_id/:image_id', deleteImageKnowledge);
router.post('/link/:folder_id', createLinkKnowledge);
router.delete('/link/:folder_id/:link_id', deleteLinkKnowledge);
router.post('/link/:folder_id/multi-delete', multiDeleteLinkKnowledge);
router.post('/link/:folder_id/:link_id/training', trainingLinkKnowledge);
router.post('/link/:folder_id/multi-training', multiTrainingLinkKnowledge);
router.get('/link/:folder_id', getLinkKnowledge);
router.get('/link/:folder_id/:link_id', getLinkKnowledgeById);


module.exports = router;