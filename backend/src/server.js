import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import listingsRoutes from './routes/listings.routes.js';
import bookingsRoutes from './routes/bookings.routes.js';
import evRoutes from './routes/ev.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import adminRoutes from './routes/admin.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import favoritesRoutes from './routes/favorites.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initSocket } from './config/socket.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
const apiOrigin = process.env.API_ORIGIN || `http://localhost:${process.env.PORT || 5000}`;
const frontendOrigin = corsOrigin === '*' ? 'http://localhost:5173' : corsOrigin;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", apiOrigin, frontendOrigin, apiOrigin.replace(/^http/, 'ws'), frontendOrigin.replace(/^http/, 'ws')],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'parkshare-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/ev-chargers', evRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/favorites', favoritesRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`ParkShare API listening on port ${PORT}`);
});
