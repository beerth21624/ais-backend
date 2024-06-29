const express = require('express');
const router = express.Router();
const { storage } = require('../storage/storage');


const { createCharacter, getCharacters, getCharacter, updateCharacter, deleteCharacter, assignKnowledge, getCharacterKnowledge, deleteCharacterKnowledge } = require('../controllers/characterController');


router.post('/', createCharacter);
router.get('/', getCharacters);
router.get('/:id', getCharacter);
router.patch('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);
router.post('/assign/:id', assignKnowledge);
router.get('/knowledge/:id', getCharacterKnowledge);
router.delete('/knowledge/:id', deleteCharacterKnowledge);



module.exports = router;

    

