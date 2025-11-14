// ==================== server.js ====================
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import code from './pair.js';
import { EventEmitter } from 'events';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __path = process.cwd();
const PORT = process.env.PORT || 8000;

// Correction : utiliser EventEmitter directement avec import
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

export default app;