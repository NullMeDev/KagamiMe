import { setupStatusApi } from './api/status';
import express from 'express';
import path from 'path';
import cors from 'cors';

// Start the status API
const API_PORT = 3000;
const corsOptions = {
    origin: ['https://status.nullme.lol', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};

setupStatusApi(API_PORT);

// Serve the static status page
const STATIC_PORT = 3001;
const app = express();
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, '../status-page/public')));

app.listen(STATIC_PORT, () => {
    console.log(`Status page running on port ${STATIC_PORT}`);
});
