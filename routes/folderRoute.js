const router = require('express').Router();
const { createFolder, getFolders, getFolder, updateFolder, deleteFolder, updateGeneralKnowledge } = require('../controllers/folderController'); 

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id', getFolder);
router.patch('/:id', updateFolder);
router.delete('/:id', deleteFolder);
router.patch('/general/:id', updateGeneralKnowledge);


module.exports = router;