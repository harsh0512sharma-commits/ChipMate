import { io, Socket } from 'socket.io-client';
import { getDefaultApiBase } from './client';

let socket: Socket | null = null;
let currentTableId: string | null = null;
let connectionListeners: Array<(connected: boolean) => void> = [];
let tableUpdateListeners: Array<(data: any) => void> = [];

export function initSocketClient(): Socket {
  if (socket) return socket;

  const apiBase = getDefaultApiBase();
  let socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL;
  if (!socketUrl) {
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      socketUrl = apiBase.replace(/\/api\/?$/, '');
    } else {
      socketUrl = 'https://api.chipmate.online';
    }
  }

  if (socketUrl && socketUrl.includes('chipmate-h96z.onrender.com')) {
    socketUrl = 'https://api.chipmate.online';
  }

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', () => {
    connectionListeners.forEach(cb => cb(true));
    if (currentTableId) {
      socket?.emit('join_table_room', currentTableId);
    }
  });

  socket.on('disconnect', () => {
    connectionListeners.forEach(cb => cb(false));
  });

  socket.on('connect_error', () => {
    connectionListeners.forEach(cb => cb(false));
  });

  socket.on('table_updated', (data: any) => {
    tableUpdateListeners.forEach(cb => cb(data));
  });

  return socket;
}

export function joinTableRoom(tableId: string) {
  currentTableId = tableId;
  const s = initSocketClient();
  s.emit('join_table_room', tableId);
}

export function leaveTableRoom(tableId: string) {
  if (currentTableId === tableId) {
    currentTableId = null;
  }
  if (socket) {
    socket.emit('leave_table_room', tableId);
  }
}

export function onConnectionChange(cb: (connected: boolean) => void): () => void {
  connectionListeners.push(cb);
  if (socket) {
    cb(socket.connected);
  }
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== cb);
  };
}

export function onTableUpdated(cb: (data: any) => void): () => void {
  tableUpdateListeners.push(cb);
  return () => {
    tableUpdateListeners = tableUpdateListeners.filter(l => l !== cb);
  };
}
