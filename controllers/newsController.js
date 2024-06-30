const NewsSchema = require('../schemas/newsSchema');
const { storage, CloudinayRemoveImage } = require('../storage/storage');
const multer = require('multer');
const upload = multer({ storage });


const createNews = async (req, res) => {
    upload.single('image')(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err.message);
        }

        const { title, content, record_status='A' } = req.body;
        const image_name = req.file.filename;
        const image_url = req.file.path;
        const newNews = new NewsSchema({ title, content, image_name, image_url, record_status });
        try {
            await newNews.save();
            res.status(201).json(newNews);
        } catch (error) {
            res.status(409).json({ message: error.message });
        }
    });
}

const getNews = async (req, res) => {
    const {record_status} = req.query;
    if(record_status){
        try {
            const news = await NewsSchema.find({record_status});
            res.status(200).json(news);
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
        return;
    }
    try {
        const news = await NewsSchema.find();
        res.status(200).json(news);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const getNewsById = async (req, res) => {
    const { id } = req.params;
    try {
        const news = await NewsSchema.findById (id);
        res.status(200).json(news);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

const updateNews = async (req, res) => {
    const { id } = req.params;
    const { title, content, record_status } = req.body;

        try {
            const updatedNews = await NewsSchema.findByIdAndUpdate
                (id, { title, content, record_status }, { new: true });
            res.json(updatedNews);
        }
        catch (error) {
            res.status(404).json({ message: error.message });
        }
        return;

}

const deleteNews = async (req, res) => {
    const { id } = req.params;
    try {
        const news = await NewsSchema.findByIdAndRemove(id);
        CloudinayRemoveImage(news.image_name);
        res.status(200).json(news);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
}

module.exports = { createNews, getNews, getNewsById, updateNews, deleteNews };



    


