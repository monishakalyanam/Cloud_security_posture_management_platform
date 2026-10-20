import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet()); // sets several protective HTTP headers
app.use(cors({ origin: env.clientOrigins })); // only the listed frontend origins may call the API from a browser
app.use(express.json({ limit: '1mb' })); // upload size limit

app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
