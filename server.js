const express = require('express');
const { storage } = require('./storage/storage');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const socketIOMiddleware = require('./middlewares/socketIOMiddleware');

const app = express();
const port = 8080;
const cors = require('cors');
dotenv.config();
app.use(cors());

const multer = require('multer');
const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = socketIOMiddleware(app);


//routes
const characterRoute = require('./routes/characterRoute');
const knowledgeRoute = require('./routes/knowledgeRoute');
const folderRoute = require('./routes/folderRoute');

//routes
app.use('/character', characterRoute);
app.use('/knowledge', knowledgeRoute);
app.use('/folder', folderRoute);


app.post('/upload', upload.single('image'), (req, res) => {
    res.send('Done');
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}
);