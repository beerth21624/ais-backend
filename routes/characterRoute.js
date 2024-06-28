const express = require('express');
const router = express.Router();
const { storage } = require('../storage/storage');


const { createCharacter, getCharacters, getCharacter, updateCharacter, deleteCharacter, assignKnowledge } = require('../controllers/characterController');


router.post('/', createCharacter);
router.get('/', getCharacters);
router.get('/:id', getCharacter);
router.patch('/:id', updateCharacter);
router.delete('/:id', deleteCharacter);
router.post('/assign/:id', assignKnowledge);



module.exports = router;

    

