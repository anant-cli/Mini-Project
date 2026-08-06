import { io } from 'socket.io-client';

// The backend serves both REST and Socket.io from the same origin, so we
// derive the socket URL from the API URL by stripping the /api suffix.
const apiBase = import.meta.env.VITE_API_URL || '/api';
const socketUrl = apiBase.startsWith('http')
  ? apiBase.replace(/\/api\/?$/, '')
  : window.location.origin;

let socket;

export function getSocket() {
  if (!socket) {
    socket = io(socketUrl, { transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socket;
}

export function watchLocations(locationIds = []) {
  if (!locationIds.length) return;
  getSocket().emit('watch_area', locationIds);
}

export function unwatchLocations(locationIds = []) {
  if (!locationIds.length) return;
  getSocket().emit('unwatch_area', locationIds);
}

export function onSlotUpdated(handler) {
  getSocket().on('slot_updated', handler);
}
