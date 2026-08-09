const { body, validationResult } = require('express-validator');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// 1. /register Endpoint
router.post('/register', async (req, res) => {
    try {
        const { name, firstName, lastName, email, password } = req.body;
        const finalName = name || `${firstName || ''} ${lastName || ''}`.trim();

        if (!email || !password || !finalName) {
            return res.status(400).json({ error: 'Name, email, and password are required fields.' });
        }

        let db;
        const dbHelperResult = await connectToDatabase();
        if (dbHelperResult && typeof dbHelperResult.collection === 'function') {
            db = dbHelperResult;
        } else {
            const client = new MongoClient(process.env.MONGO_URL || "mongodb://root:PukY918RJF8gJr9yCf8vXi8V@172.21.24.52:27017");
            await client.connect();
            db = client.db(process.env.MONGO_DB || "secondChance");
        }

        const collection = db.collection("users");

        const existingUser = await collection.findOne({ email: email });
        if (existingUser) {
            logger.warn(`Registration rejected: User with email ${email} already exists.`);
            return res.status(400).json({ error: 'User credentials already exist in the database.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserResult = await collection.insertOne({
            name: finalName,
            email,
            password: hashedPassword,
            createdAt: new Date()
        });

        const payload = { user: { id: newUserResult.insertedId } };
        const jwtSecret = process.env.JWT_SECRET || 'setasecret';
        const authtoken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        logger.info(`Successfully registered new user: ${email}`);
        return res.status(201).json({ email, authtoken });

    } catch (e) {
        logger.error(`Error encountered during user registration: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});

// 2. /login Endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            logger.error("Login attempt missing email or password");
            return res.status(400).json({ error: "Email and password are required fields." });
        }

        let db;
        const dbHelperResult = await connectToDatabase();
        if (dbHelperResult && typeof dbHelperResult.collection === 'function') {
            db = dbHelperResult;
        } else {
            const client = new MongoClient(process.env.MONGO_URL || "mongodb://root:PukY918RJF8gJr9yCf8vXi8V@172.21.24.52:27017");
            await client.connect();
            db = client.db(process.env.MONGO_DB || "secondChance");
        }

        const collection = db.collection("users");
        const theUser = await collection.findOne({ email: email });
        
        if (!theUser) {
            logger.warn(`Login failed: User with email ${email} not found.`);
            return res.status(404).json({ error: "User not found. Please check your credentials." });
        }

        const isMatch = await bcrypt.compare(password, theUser.password);
        if (!isMatch) {
            logger.warn(`Login failed: Incorrect password for user ${email}.`);
            return res.status(400).json({ error: "Invalid credentials. Incorrect password." });
        }

        const payload = { user: { id: theUser._id } };
        const jwtSecret = process.env.JWT_SECRET || 'setasecret';
        const authtoken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        logger.info(`Successfully logged in user: ${email}`);
        return res.status(200).json({ 
            authtoken, 
            userName: theUser.name, 
            userEmail: theUser.email 
        });

    } catch (e) {
        logger.error(`Error encountered during user login execution: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});

// 3. /update Endpoint
router.put('/update', [
    body('name').notEmpty().withMessage('Name cannot be empty')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error('Validation errors in update request', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const email = req.headers.email;
        if (!email) {
            logger.error('Email not found in the request headers');
            return res.status(400).json({ error: "Email not found in the request headers" });
        }

        let db;
        const dbHelperResult = await connectToDatabase();
        if (dbHelperResult && typeof dbHelperResult.collection === 'function') {
            db = dbHelperResult;
        } else {
            const client = new MongoClient(process.env.MONGO_URL || "mongodb://root:PukY918RJF8gJr9yCf8vXi8V@172.21.24.52:27017");
            await client.connect();
            db = client.db(process.env.MONGO_DB || "secondChance");
        }

        const collection = db.collection("users");
        const existingUser = await collection.findOne({ email });
        
        if (!existingUser) {
            logger.error('User not found');
            return res.status(404).json({ error: "User not found" });
        }

        existingUser.name = req.body.name || existingUser.name;
        existingUser.updatedAt = new Date();

        const updatedUserResult = await collection.findOneAndUpdate(
            { email },
            { $set: existingUser },
            { returnDocument: 'after' }
        );

        const updatedUser = updatedUserResult.value || updatedUserResult;
        const payload = { user: { id: (updatedUser._id || existingUser._id).toString() } };
        const jwtSecret = process.env.JWT_SECRET || 'setasecret';
        const authtoken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        logger.info('User updated successfully');
        return res.status(200).json({ authtoken });

    } catch (e) {
        logger.error(`Error encountered during user profile update: ${e.message}`);
        return res.status(500).send("Internal server error");
    }
});

module.exports = router;
