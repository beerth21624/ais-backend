const Folder = require('../schemas/folderSchema');
const ImageKnowledge = require('../schemas/ImageKnowledgeSchema');
const QaKnowledge = require('../schemas/QaKnowledgeSchema');

const createFolder = async (req, res) => {
    const { name, description, record_status} = req.body;
    const newFolder = new Folder({ name, description, record_status });
    try {
        await newFolder.save();
        res.status(201).json(newFolder);
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const getFolders = async (req, res) => {
    try {
        const folders = await Folder.find();
        res.status(200).json(folders);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}


const getFolder = async (req, res) => {
    const { id } = req.params;
    try {
        const folder
            = await Folder.findById(id);
        res.status(200).json(folder);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const updateFolder = async (req, res) => {
    const { id } = req.params;
    const { name, description, record_status } = req.body;
    const updatedFolder = { name, description, record_status, _id: id };
    try {
        await Folder.findByIdAndUpdate
            (id, updatedFolder, { new: true });
        res.json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }

}

const deleteFolder = async (req, res) => {
    const { id } = req.params;
    try {
        const folder = Folder.findById(id);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
       


        await Folder.deleteOne({ _id: id });
        res.json({ message: 'Folder deleted successfully' });

    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const updateGeneralKnowledge = async (req, res) => {
    const { id } = req.params;
    const { general_knowledge } = req.body;
    const updatedKnowledge = { general_knowledge, _id: id };
    try {
        await Folder.findByIdAndUpdate
            (id, updatedKnowledge, { new: true });
        res.json(updatedKnowledge);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}


module.exports = { createFolder, getFolders, getFolder, updateFolder, deleteFolder, updateGeneralKnowledge };
