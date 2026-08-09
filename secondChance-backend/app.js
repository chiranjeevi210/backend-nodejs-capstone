/*jshint esversion: 8 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoLogger = require('./logger');
const pinoHttp = require('pino-http');

const connectToDatabase = require('./models/db');
const { loadData } = require("./util/import-mongo/index");

const app = express();

// Global Middleware Configuration
app.use("*", cors());
app.use(express.json()); // Essential to read req.body payloads before hitting routes
app.use(pinoHttp({ logger: pinoLogger })); // Essential to log requests before routing them

// Route files
// Search API Task 1: import the searchRoutes and store in a constant called searchRoutes
const searchRoutes = require('./routes/searchRoutes');

// authRoutes Step 2: import the authRoutes and store in a constant called authRoutes
const authRoutes = require('./routes/authRoutes'); 
// Items API Task 1: import the secondChanceItemsRoutes and store in a constant called secondChanceItemsRoutes
// const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes'); // (Uncomment when you reach this lab step)


// Use Routes
// Search API Task 2: add the searchRoutes to the server by using the app.use() method.
app.use('/api/secondchance/search', searchRoutes);

// authRoutes Step 2: add the authRoutes to the server by using the app.use() method.
app.use('/api/auth', authRoutes); 
// Items API Task 2: add the secondChanceItemsRoutes to the server by using the app.use() method.
// app.use('/api/secondchance/items', secondChanceItemsRoutes); // (Uncomment when you reach this lab step)


// Root Endpoint test
app.get("/", (req, res) => {
    res.send("Inside the server");
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

const port = 3060;

// Connect to MongoDB and start application server
connectToDatabase().then(() => {
    pinoLogger.info('Connected to DB');
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}).catch((e) => {
    console.error('Failed to connect to DB', e);
});
