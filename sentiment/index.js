const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const logger = require('./logger');
const expressPinoLogger = require('express-pino-logger');

// Task 1: Import the Natural library
const natural = require('natural');

dotenv.config();

// Task 2: Initialize the Express server
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(expressPinoLogger({ logger: logger }));

// Task 3: Create a POST /sentiment endpoint
app.post('/sentiment', async (req, res) => {
    try {
        // Task 4: Extract the sentence parameter from the request body
        const { sentence } = req.body;

        if (!sentence || sentence.trim() === "") {
            logger.error("No sentence provided in request body");
            return res.status(400).json({ error: "Sentence parameter is required inside the request body." });
        }

        // Initialize Natural's Sentiment Analyzer
        const Analyzer = natural.SentimentAnalyzer;
        const stemmer = natural.PorterStemmer;
        const analyzer = new Analyzer("English", stemmer, "afinn");

        // Tokenize the input string sentence into individual clean words
        const tokenizer = new natural.WordTokenizer();
        const words = tokenizer.tokenize(sentence);

        // Calculate the raw sentiment metric score
        const score = analyzer.getSentiment(words);

        // Task 5: Process the response by assigning classification tiers
        let sentiment = 'positive';
        if (score < 0) {
            sentiment = 'negative';
        } else if (score >= 0 && score <= 0.33) {
            sentiment = 'neutral';
        }

        // Task 6: Implement success return state
        logger.info(`Successfully analyzed sentiment. Score: ${score}, Label: ${sentiment}`);
        return res.status(200).json({ 
            sentimentScore: parseFloat(score.toFixed(2)), 
            sentiment: sentiment 
        });

    } catch (error) {
        // Task 7: Implement error return state
        logger.error(`Error during sentiment process analysis execution: ${error.message}`);
        return res.status(500).json({ error: "Internal server error during sentiment analysis execution." });
    }
});

app.listen(port, () => {
    logger.info(`Sentiment service running smoothly on port ${port}`);
});
