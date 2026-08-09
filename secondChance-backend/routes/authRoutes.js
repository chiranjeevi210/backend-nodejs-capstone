const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const connectToDatabase = require('../models/db');
const logger = require('../logger');

router.post('/register', async (req, res) => {
    try {
        // Extract both possible sets of naming properties from request context
        const { name, firstName, lastName, email, password } = req.body;

        // Build a combined value fallback option if firstName/lastName properties arrive instead
        const finalName = name || `${firstName || ''} ${lastName || ''}`.trim();

        // Basic validation checking fields
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

        const payload = {
            user: {
                id: newUserResult.insertedId
            }
        };

        const jwtSecret = process.env.JWT_SECRET || 'setasecret';
        const authtoken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        logger.info(`Successfully registered new user: ${email}`);
        return res.status(201).json({ email, authtoken });

    } catch (e) {
        logger.error(`Error encountered during user registration: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});
// Step 1: Implement the /login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic validation check
        if (!email || !password) {
            logger.error("Login attempt missing email or password");
            return res.status(400).json({ error: "Email and password are required fields." });
        }

        let db;
        const dbHelperResult = await connectToDatabase();
        
        // Task 1 & 2: Dynamic database failover connection context tracking
        if (dbHelperResult && typeof dbHelperResult.collection === 'function') {
            db = dbHelperResult;
        } else {
            const client = new MongoClient(process.env.MONGO_URL || "mongodb://root:PukY918RJF8gJr9yCf8vXi8V@172.21.24.52:27017");
            await client.connect();
            db = client.db(process.env.MONGO_DB || "secondChance");
        }

        const collection = db.collection("users");

        // Task 3 & 5: Check for user credentials and fetch user details from the database
        const theUser = await collection.findOne({ email: email });
        
        // Task 7: Send an appropriate message if the user is not found
        if (!theUser) {
            logger.warn(`Login failed: User with email ${email} not found.`);
            return res.status(404).json({ error: "User not found. Please check your credentials." });
        }

        // Task 4: Check if the password entered matches the stored encrypted password
        const isMatch = await bcrypt.compare(password, theUser.password);
        if (!isMatch) {
            logger.warn(`Login failed: Incorrect password for user ${email}.`);
            return res.status(400).json({ error: "Invalid credentials. Incorrect password." });
        }

        // Task 6: Create JWT authentication if passwords match with user._id as payload
        const payload = {
            user: {
                id: theUser._id
            }
        };

        const jwtSecret = process.env.JWT_SECRET || 'setasecret';
        const authtoken = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        // Return properties required by Task 6 code template schema
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

module.exports = router;
