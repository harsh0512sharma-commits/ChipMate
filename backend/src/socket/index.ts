import { Server as SocketIOServer, Socket } from 'socket.io';
import { getTableDetails } from '../services/table.service';

let ioInstance: SocketIOServer | null = null;

export function initSocket(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    // Join table room
    socket.on('join_table_room', (tableId: string) => {
      if (tableId) {
        socket.join(`table:${tableId}`);
      }
    });

    // Leave table room
    socket.on('leave_table_room', (tableId: string) => {
      if (tableId) {
        socket.leave(`table:${tableId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
}

export function broadcastTableUpdate(tableId: string, eventType: string, payload?: any) {
  if (!ioInstance) return;

  ioInstance.to(`table:${tableId}`).emit('table_updated', {
    tableId,
    eventType,
    payload,
    timestamp: new Date().toISOString()
  });
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
