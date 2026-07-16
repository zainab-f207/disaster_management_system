import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAlertStore } from '../store';
import { setActiveConnection } from '../services/signalrConnection';
import toast from 'react-hot-toast';

const HUB_URL = 'https://localhost:7129/hubs/disasters';

export function useSignalR() {
  const connectionRef = useRef(null);
  const connectedRef = useRef(false); // ← prevents double connection in StrictMode
  const [isConnected, setIsConnected] = useState(false);
  const addAlert = useAlertStore((s) => s.addAlert);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const auth = JSON.parse(localStorage.getItem('auth-data') || '{}');
    const token = auth?.state?.token;

    if (!token) {
      connectedRef.current = false;
      setIsConnected(false);
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveDisasterAlert', (alert) => {
      addAlert({ ...alert, type: 'disaster' });
      showDisasterToast(alert);
    });

    connection.on('ReceiveAssignmentUpdate', (update) => {
      addAlert({ ...update, type: 'assignment' });
      toast.success(
        `${update.organizationName} → ${update.status} on Disaster #${update.disasterId}`,
        { duration: 5000, icon: '🚒' }
      );
    });

    connection.on('ReceiveNewReport', (report) => {
      addAlert({ ...report, type: 'report' });
      toast(`New report from ${report.reportedBy}`, { icon: '📩', duration: 4000 });
    });

    connection.on('ReceiveSystemMessage', (msg) => {
      console.log('[SignalR]', msg);
    });
    connection.on('ReceiveLocationUpdate', (update) => {
      useLocationStore.getState().setLocation(update.assignmentId, {
        lat: update.latitude,
        lng: update.longitude,
        updatedAt: update.updatedAt,
        orgName: update.organizationName,
        disasterId: update.disasterId,
      });
    });

    setActiveConnection(connection);

    connection.onreconnecting(() => setIsConnected(false));
    connection.onreconnected(() => setIsConnected(true));
    connection.onclose(() => { setIsConnected(false); connectedRef.current = false; setActiveConnection(null); });

    connection.start()
      .then(() => {
        setIsConnected(true);
        connectionRef.current = connection;
        const cities = ['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Quetta', 'Multan', 'Faisalabad', 'Rawalpindi'];
        cities.forEach(city => connection.invoke('SubscribeToCity', city).catch(() => { }));
      })
      .catch(err => {
        if (!err.message?.includes('stopped during negotiation')) {
          console.warn('SignalR failed to connect.', err.message);
        }
        connectedRef.current = false;
      });

    return () => {
      connectedRef.current = false;
      connection.stop();
    };
  }, []);

  return { isConnected };
}

function showDisasterToast(alert) {
  const severity = alert.severity?.toLowerCase();
  const icons = { critical: '🚨', high: '⚠️', medium: '⚡', low: '📢' };
  const bgColors = { critical: '#e53e3e', high: '#dd6b20', medium: '#d69e2e', low: '#38a169' };

  toast.custom(
    (t) => (
      <div style={{
        background: bgColors[severity] || '#219653',
        color: '#fff', padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxWidth: '360px',
        opacity: t.visible ? 1 : 0,
        transition: 'opacity 0.3s',
      }}>
        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
          {icons[severity]} {alert.disasterType} Alert — {alert.affectedCity}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9 }}>
          {alert.severity} • {alert.assignedOrganization || 'Assigning responder...'}
        </div>
      </div>
    ),
    { duration: severity === 'critical' ? 10000 : 6000, position: 'top-right' }
  );
}