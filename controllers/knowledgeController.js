const FolderSchema = require('../schemas/folderSchema');
const Knowledge = require('../schemas/knowledgeSchema');
const QaKnowledge = require('../schemas/QaKnowledgeSchema');
const ImageKnowledge = require('../schemas/ImageKnowledgeSchema');
const { storage,CloudinayRemoveImage } = require('../storage/storage');
const mongoose = require('mongoose')
const scrapeWebsite = require('../utils/scrapeWebsite')


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

const getLinkKnowledge = async (req, res) => {
    const { folder_id } = req.params;
    try {
        const folder = await FolderSchema.findById(folder_id);
        res.status(200).json(folder.link_knowledge);
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
}


const getLinkKnowledgeById = async (req, res) => {
    const { folder_id, link_id } = req.params;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const link = folder.link_knowledge.find(link => link._id == link_id);
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }
        res.status(200).json(link);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const createLinkKnowledge = async (req, res) => {
    const { folder_id } = req.params;
    const { name,url, is_recommend } = req.body;

    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { 
            link_knowledge: [...folder.link_knowledge, {
                _id: new mongoose.Types.ObjectId(),
                name: name || 'Link',
                url: url,
                is_recommend: is_recommend,
                is_training: false,
                last_training: null,
                content: null,
            }] };
        await FolderSchema 
            .findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(201).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }

}

const deleteLinkKnowledge = async (req, res) => {
    const { folder_id, link_id } = req.params;
    try {
        const folder = await FolderSchema.findById(folder_id);
        const updatedFolder = { link_knowledge: folder.link_knowledge.filter(link => link._id != link_id) };
        await FolderSchema.findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json(updatedFolder);
    }
    catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const multiDeleteLinkKnowledge = async (req, res) => {
    const { folder_id } = req.params;
    const { link_ids } = req.body;

    if (!Array.isArray(link_ids) || link_ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty link_ids array" });
    }

    try {
        const folder = await FolderSchema.findById(folder_id);

        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }

        const updatedLinkKnowledge = folder.link_knowledge.filter(
            link => !link_ids.includes(link._id.toString())
        );

        const updatedFolder = await FolderSchema.findByIdAndUpdate(
            folder_id,
            { link_knowledge: updatedLinkKnowledge },
            { new: true }
        );

        res.status(200).json({
            message: "Links deleted successfully",
            updatedFolder
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const trainingLinkKnowledge = async (req, res) => {
    const { folder_id, link_id } = req.params;
    
    try {
        const folder = await FolderSchema.findById(folder_id);
        if(!folder) return res.status(404).json({ message: 'Folder not found' });
        const link =await folder.link_knowledge.find(link => link._id == link_id);
        if(!link) return res.status(404).json({ message: 'Link not found' });
        const content = await scrapeWebsite(link.url);
        const { headings, paragraphs, links } = content;

        const updatedFolder = { link_knowledge: folder.link_knowledge.map(link => link._id == link_id ? { ...link, is_training: true, last_training: new Date(), content: paragraphs,
            name: link=='Link' ? headings[0] || 'Link' : link.name,
         } : link) };
        await FolderSchema
            .findByIdAndUpdate(folder_id, updatedFolder, { new: true });
        res.status(200).json({
            ...updatedFolder,
            recommended_links: links
        }
        );

    } catch (error) {
        res.status(409).json({ message: error.message });
    }

}

const multiTrainingLinkKnowledge = async (req, res) => {
    const { folder_id } = req.params;
    const { link_ids } = req.body;

    try {
        const folder = await FolderSchema.findById(folder_id);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        const updatePromises = link_ids.map(async (link_id) => {
            const link = folder.link_knowledge.find(link => link._id.toString() === link_id);
            if (!link) {
                throw new Error(`Link not found: ${link_id}`);
            }
            const { headings, paragraphs, links } = await scrapeWebsite(link.url);
            return {
                ...link.toObject(),
                is_training: true,
                last_training: new Date(),
                content: paragraphs,
                name: link.name === 'Link' ? (headings[0] || 'Link') : link.name,
            };
        });

        const updatedLinks = await Promise.all(updatePromises);

        const updatedFolder = await FolderSchema.findByIdAndUpdate(
            folder_id,
            { $set: { link_knowledge: updatedLinks } },
            { new: true }
        );

        res.status(200).json({
            message: 'Links trained successfully',
            updatedFolder,
            recommended_links: updatedLinks.flatMap(link => link.links || [])
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



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
    deleteImageKnowledge,
    createLinkKnowledge,
    deleteLinkKnowledge,
    multiDeleteLinkKnowledge,
    trainingLinkKnowledge,
    multiTrainingLinkKnowledge,
    getLinkKnowledge,
    getLinkKnowledgeById

    
}