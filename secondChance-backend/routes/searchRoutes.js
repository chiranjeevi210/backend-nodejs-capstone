const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const connectToDatabase = require('../models/db');

// Tasks 1-4: Implement search filters with fallback connection handling
router.get('/', async (req, res) => {
    try {
        let db;
        // Attempt to get db instance from the lab's wrapper helper
        const dbHelperResult = await connectToDatabase();
        
        // Safe check: if helper doesn't return the db instance directly, create a fallback connection context
        if (dbHelperResult && typeof dbHelperResult.collection === 'function') {
            db = dbHelperResult;
        } else {
            const client = new MongoClient(process.env.MONGO_URL || "mongodb://root:PukY918RJF8gJr9yCf8vXi8V@172.21.24.52:27017");
            await client.connect();
            db = client.db(process.env.MONGO_DB || "secondChance");
        }

        // Use the proper collection name specified in your environment config
        const collectionName = process.env.MONGO_COLLECTION || "secondChanceItems";
        const collection = db.collection(collectionName);

        let query = {};

        // Task 2: Check if the name exists and is not empty
        if (req.query.name && req.query.name.trim() !== "") {
            query.name = { $regex: req.query.name, $options: "i" };
        }

        // Task 3: Add the remaining three filters to the query if they exist
        if (req.query.category) {
            query.category = req.query.category;
        }

        if (req.query.condition) {
            query.condition = req.query.condition;
        }

        if (req.query.age_years) {
            query.age_years = parseInt(req.query.age_years, 10);
        }

        // Task 4: Fetch filtered items
        const filteredItems = await collection.find(query).toArray();

        // Return the items in a JSON array response
        res.status(200).json(filteredItems);

    } catch (error) {
        console.error("Error during search execution:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
