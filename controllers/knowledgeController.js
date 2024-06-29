const FolderSchema = require('../schemas/folderSchema');
const Knowledge = require('../schemas/knowledgeSchema');
const QaKnowledge = require('../schemas/QaKnowledgeSchema');
const ImageKnowledge = require('../schemas/ImageKnowledgeSchema');
const { storage,CloudinayRemoveImage } = require('../storage/storage');
const mongoose = require('mongoose')


const multer = require('multer');
const upload = multer({ storage });


const createKnowledge = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }
        const { title, description, record_status } = req.body;
        record_status = record_status || 'A';
        const image_name = req.file.filename;
        const image_url = req.file.path;
        const newKnowledge = new Knowledge({ title, image_name, image_url, description, record_status });
        try {
            await newKnowledge.save();
            res.status(201).json(newKnowledge);
        } catch (error) {
            res.status(409).json({ message: error.message });
        }
    });

}

const getKnowledges = async (req, res) => {
    try {
        const knowledges = await Knowledge.find();
        res.status(200).json(knowledges);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getKnowledge = async (req, res) => {
    const { id } = req.params;
    try {
        const knowledge
            = await Knowledge.findById(id);
        res.status(200).json(knowledge);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const updateKnowledge = async (req, res) => {
    const { id } = req.params;
    const { title, description, record_status } = req.body;
    const updatedKnowledge = { title, description, record_status, _id: id };
    try {
        await Knowledge.findByIdAndUpdate
            (id, updatedKnowledge, { new: true });
        res.json(updatedKnowledge);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const deleteKnowledge = async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No knowledge with id: ${id}`);
    try {
        await Knowledge.findByIdAndRemove(id);
        res.json({ message: 'Knowledge deleted successfully' });
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}


const createQaKnowledge = async (req, res) => {
    const { folder_id } = req.params;
    const { question, answer, record_status } = req.body;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { 
            qa_knowledge: [...folder.qa_knowledge, {
                _id:new mongoose.Types.ObjectId(),
                question: question,
                answer: answer,
                record_status: record_status
            }] };
            
        await FolderSchema 
            .findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(201).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const updateQaKnowledge = async (req, res) => {
    const { folder_id, qa_id } = req.params;
    const { question, answer, record_status } = req.body;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { qa_knowledge: folder.qa_knowledge.map(qa => qa._id == qa_id ? { _id: qa_id, question, answer, record_status } : qa) };
        await FolderSchema.findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}


const deleteQaKnowledge = async (req, res) => {
    const { folder_id, qa_id } = req.params;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { qa_knowledge: folder.qa_knowledge.filter(qa => qa._id != qa_id) };
        await FolderSchema.findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}


const createImageKnowledge = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }
        const { folder_id } = req.params;
        const {  description, record_status } = req.body;

        const image_name = req.file.filename;
        const image_url = req.file.path;
        try {
            const folder = await FolderSchema.findById(folder_id);
            const updatedFolder = { 
                image_knowledge: [...folder.image_knowledge, {
                    _id: new mongoose.Types.ObjectId(),
                    image_name: image_name,
                    image_url: image_url,
                    description: description,
                    record_status: record_status
                }] };
                
            await FolderSchema 
                .findByIdAndUpdate(folder_id, updatedFolder, { new: true });
            res.status(201).json(updatedFolder);
        } catch (error) {
            res.status(409).json({ message: error.message });
        }
    });

}

const updateImageKnowledge = async (req, res) => {
    const { folder_id, image_id } = req.params;
    const { description, record_status } = req.body;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { image_knowledge: folder.image_knowledge.map(image => image._id == image_id ? { _id: image_id, description: description, record_status: record_status , image_name:image.image_name , image_url:image.image_url  } : image) };
        await FolderSchema.findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const deleteImageKnowledge = async (req, res) => {
    const { folder_id, image_id } = req.params;
    try {
        const folder = await FolderSchema.findById(folder_id);
        CloudinayRemoveImage(folder.image_knowledge.find(image => image._id == image_id).image_name);
        const updatedFolder = { image_knowledge: folder.image_knowledge.filter(image => image._id != image_id) };
        await FolderSchema.findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}





module.exports = {
    createKnowledge,
    getKnowledges,
    getKnowledge,
    updateKnowledge,
    deleteKnowledge,
    createQaKnowledge,
    createImageKnowledge,
    updateQaKnowledge,
    deleteQaKnowledge,
    updateImageKnowledge,
    deleteImageKnowledge
    
}