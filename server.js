const express = require('express');
const { storage } = require('./storage/storage');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const socketIOMiddleware = require('./middlewares/socketIOMiddleware');
const auth = require('./middlewares/authMiddleware');

const app = express();
const port = 8080;
const cors = require('cors');
dotenv.config();
app.use(cors());

const multer = require('multer');
const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true
}).then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const server = socketIOMiddleware(app);

app.get('/', (req, res) => {
    res.send('Hello World');
}
);


//routes
const characterRoute = require('./routes/characterRoute');
const knowledgeRoute = require('./routes/knowledgeRoute');
const folderRoute = require('./routes/folderRoute');
const userRoute = require('./routes/userRoute');
const newsRoute = require('./routes/newsRoute');
const aiRoute = require('./routes/aiRoute');    

//routes add auth middleware
app.use('/character', characterRoute);
app.use('/knowledge', auth, knowledgeRoute);
app.use('/folder', auth,folderRoute);
app.use('/user', userRoute);
app.use('/news', newsRoute);
app.use('/ai', aiRoute);

app.post('/upload', upload.single('image'), (req, res) => {
    res.send('Done');
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}
);