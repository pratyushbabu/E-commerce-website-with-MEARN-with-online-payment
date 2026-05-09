import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5005`;

let socket = null;

export const connectSocket = (userId, role) => {
  if (socket?.connected) return socket;
  socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('join', { userId, role });
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const getSocket = () => socket;

export default socket;
