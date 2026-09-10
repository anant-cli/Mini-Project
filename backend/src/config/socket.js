import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.on('connection', (socket) => {
    socket.on('watch_area', (locationIds = []) => {
      locationIds.forEach((id) => socket.join(`location:${id}`));
    });

    socket.on('unwatch_area', (locationIds = []) => {
      locationIds.forEach((id) => socket.leave(`location:${id}`));
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
  io.emit(`booking:${bookingId}`, payload);
};

export const getIO = () => io;
