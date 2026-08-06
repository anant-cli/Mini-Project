import { Server } from 'socket.io';

let io;

export const initSocket = (httpServer) => {
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const allowedOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.on('connection', (socket) => {
    // Drivers join a "room" per map viewport / location cluster so we only
    // broadcast slot changes to people who are actually looking at that area.
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

// Emit a slot_updated event to everyone currently viewing that location.
export const emitSlotUpdate = (locationId, payload) => {
  if (!io) return;
  io.to(`location:${locationId}`).emit('slot_updated', payload);
};

// Emit check-in / check-out confirmation directly to the driver + host.
export const emitBookingEvent = (bookingId, payload) => {
  if (!io) return;
  io.emit(`booking:${bookingId}`, payload);
};

export const getIO = () => io;
