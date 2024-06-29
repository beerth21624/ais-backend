const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'CloudinaryDemo',
        allowedFormats: ['jpeg', 'png', 'jpg'],
        transformation: [
            { width: 800, height: 600, crop: 'limit' }, 
            { quality: 'auto:low' }, 
            { fetch_format: 'auto' }
        ]
    }
});

function CloudinayRemoveImage(image_name) {
    cloudinary.uploader.destroy(image_name, function (error, result) {
        console.log(result, error);
    });
}

module.exports = {
    storage,
    CloudinayRemoveImage
};
