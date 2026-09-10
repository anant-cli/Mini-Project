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
import kycRoutes from './routes/kyc.routes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { initSocket } from './config/socket.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN is required in production');
}

const corsOrigin = process.env.CORS_ORIGIN || '*';
const allowedOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
const apiOrigin = process.env.API_ORIGIN || `http://localhost:${process.env.PORT || 5000}`;
const frontendOrigin = allowedOrigins === '*' ? 'http://localhost:5173' : allowedOrigins[0];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: [
        "'self'", apiOrigin, frontendOrigin,
        apiOrigin.replace(/^http/, 'ws'), frontendOrigin.replace(/^http/, 'ws'),
        'https://tiles.openfreemap.org', 'https://nominatim.openstreetmap.org',
      ],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'parkslot-api' }));
app.get('/api/config', (req, res) => {
  res.json({ platform_commission_percent: Number(process.env.PLATFORM_COMMISSION_PERCENT || 15) });
});

app.use('/api', apiRateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/ev-chargers', evRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/kyc', kycRoutes);

app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`ParkSlot API listening on port ${PORT}`);
});
