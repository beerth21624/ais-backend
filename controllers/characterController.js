//import model
const Character = require('../schemas/characterSchema');
const Folder = require('../schemas/folderSchema');
const { storage, CloudinayRemoveImage } = require('../storage/storage');

const multer = require('multer');
const upload = multer({ storage });

const createCharacter = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }

        const { name, description, prompt, record_status='A' } = req.body;
        const image_name = req.file.filename;
        const image_url = req.file.path;
        const newCharacter = new Character({ name, image_name, image_url, description, prompt, record_status });
        try {
            await newCharacter.save();
            res.status(201).json(newCharacter);
        } catch (error) {
            res.status(409).json({ message: error.message });
        }
    });
}

const getCharacters = async (req, res) => {
    const {record_status} = req.query;
    if(record_status){
        try {
            const characters = await Character.find({record_status});
            res.status(200).json(characters);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
        return;
    }
    try {
        const characters = await Character.find();
        res.status(200).json(characters);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getCharacter = async (req, res) => {
    const { id } = req.params;
    try {
        const character
            = await Character.findById(id);
        res.status(200).json(character);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const updateCharacter = async (req, res) => {
    const { id } = req.params;
    const { name, description, prompt, record_status } = req.body;
    const updatedCharacter = { name, description, prompt, record_status, _id: id };
    try {
        await Character.findByIdAndUpdate
            (id, updatedCharacter, { new: true });
        res.json(updatedCharacter);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const deleteCharacter = async (req, res) => {
    const { id } = req.params;
    try {
        const character = await Character
            .findById(id);
        CloudinayRemoveImage(character.image_name);
        await Character.deleteOne({ _id: id });

        res.status(200).json({ message: 'Character deleted successfully' });
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }

}


const assignKnowledge = async (req, res) => {
    const { id } = req.params;
    const { folder_ids } = req.body;
    
    try {
        const character = await Character.findById(id);
        const newFolderKnowledge = [...character.folder_knowledge, ...folder_ids];
        const updatedCharacter = { folder_knowledge: newFolderKnowledge, _id: id };
        await Character.findByIdAndUpdate
            (id, updatedCharacter, { new: true });
        res.json(updatedCharacter);
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
}

   const getCharacterKnowledge = async (req, res) => {
    const { id } = req.params;
    try {
        const character
            = await Character.findById(id);
        const folderKnowledge = character.folder_knowledge;
        const folders = await Folder.find({ _id: { $in: folderKnowledge } });
        res.status(200).json(folders);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const deleteCharacterKnowledge = async (req, res) => {
    const { id } = req.params;
    const { folder_id } = req.body;
    if (!folder_id) {
        return res.status(400).json({ message: 'Folder id is required' });
    }
    try {
        const character = await Character.findById(id);
        const newFolderKnowledge = character.folder_knowledge.filter((folder) => folder != folder_id);
        const updatedCharacter = { folder_knowledge: newFolderKnowledge, _id: id };
        await Character.findByIdAndUpdate
            (id, updatedCharacter, { new: true });
        res.json(updatedCharacter);
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
 
}



    
            

module.exports = { createCharacter, getCharacters, getCharacter, updateCharacter, deleteCharacter, assignKnowledge, getCharacterKnowledge, deleteCharacterKnowledge };