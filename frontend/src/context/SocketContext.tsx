import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { VitalReading, Alert, DeviceStatus } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  latestVitalUpdate: VitalReading | null;
  latestAlert: Alert | null;
  deviceStatuses: Record<string, { status: DeviceStatus; lastSeen: string }>;
  latestEmergency: any | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [latestVitalUpdate, setLatestVitalUpdate] = useState<VitalReading | null>(null);
  const [latestAlert, setLatestAlert] = useState<Alert | null>(null);
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, { status: DeviceStatus; lastSeen: string }>>({});
  const [latestEmergency, setLatestEmergency] = useState<any | null>(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket.IO connected [Client ID:', newSocket.id, ']');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('vital:update', (data: VitalReading) => {
      console.log('📈 Real-time vital update received:', data);
      setLatestVitalUpdate(data);
    });

    newSocket.on('alert:new', (alertData: Alert) => {
      console.log('🚨 New Real-time alert received:', alertData);
      setLatestAlert(alertData);
    });

    newSocket.on('alert:updated', (alertData: Alert) => {
      setLatestAlert(alertData);
    });

    newSocket.on('device:status', (deviceData: { deviceId: string; status: DeviceStatus; lastSeen: string }) => {
      setDeviceStatuses((prev) => ({
        ...prev,
        [deviceData.deviceId]: { status: deviceData.status, lastSeen: deviceData.lastSeen },
      }));
    });

    newSocket.on('emergency:new', (emergencyData: any) => {
      console.log('🔴 Emergency SOS event received:', emergencyData);
      setLatestEmergency(emergencyData);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        latestVitalUpdate,
        latestAlert,
        deviceStatuses,
        latestEmergency,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
