// ==================== server.js ====================
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const code = require('./pair.js');
const { EventEmitter } = require('events');

const app = express();
const __path = process.cwd();
const PORT = process.env.PORT || 8000;

// Correction : utiliser EventEmitter directement avec require
EventEmitter.defaultMaxListeners = 500;

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/code', code);
app.use('/', async (req, res, next) => {
    res.sendFile(__path + '/pair.html');
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

module.exports = app;