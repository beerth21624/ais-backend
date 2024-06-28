const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserSchema = require('../schemas/userSchema');

const createUserController = async (req, res) => {
    const { username, name, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new UserSchema({ username, name, password: hashedPassword });
        await newUser.save();
        res.status(201).json('User created successfully');
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
}

const loginController = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await UserSchema
            .findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ username: user.username, id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const { password: _, ...userInfo } = user._doc;
        res.status(200).json({ ...userInfo, token });



    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


module.exports = {
    createUserController,
    loginController
};                                            