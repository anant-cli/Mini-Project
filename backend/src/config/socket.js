import { Server } from 'socket.io';

let io;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_WATCHED = 200;

const cleanLocationIds = (value) => (Array.isArray(value) ? value : [])
  .filter((id) => typeof id === 'string' && UUID_RE.test(id))
  .slice(0, MAX_WATCHED);

export const initSocket = (httpServer) => {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.on('connection', (socket) => {
    socket.on('watch_area', (locationIds) => {
      cleanLocationIds(locationIds).forEach((id) => socket.join(`location:${id}`));
    });

    socket.on('unwatch_area', (locationIds) => {
      cleanLocationIds(locationIds).forEach((id) => socket.leave(`location:${id}`));
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const emitSlotUpdate = (locationId, payload) => {
  if (!io) return;
  io.to(`location:${locationId}`).emit('slot_updated', payload);
};

export const emitBookingEvent = (bookingId, payload) => {
  if (!io) return;
  io.to(`booking:${bookingId}`).emit('booking_updated', payload);
};

export const getIO = () => io;
