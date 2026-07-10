import { useEffect } from 'react';
import { useAuthStore } from '../store';
import api from '../services/api';

export function usePushNotifications() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setupPush();
  }, [isAuthenticated]);

  const setupPush = async () => {
    try {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        console.log('Push: requires HTTPS, skipping.');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready; 

      const keyRes = await api.get('/push/vapid-public-key');
      const publicKey = keyRes.data?.publicKey;

      if (!publicKey || publicKey === 'BAbbr3lFSU3vv6AHdccCQYgvFDVslvfUxqaq98-AMB5N9eaGEeTYBLJfXdF8Ow4OSpk8WKyvHPlAJP5srg6TvnE') {
        console.log('Push: VAPID key not configured yet.');
        return;
      }

      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subJson = sub.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh) return;

      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        p256dh:   subJson.keys.p256dh,
        auth:     subJson.keys.auth,
      });

      console.log('✅ Push notifications enabled');
    } catch (err) {
      console.log('Push setup skipped:', err.message);
    }
  };
}

function urlBase64ToUint8Array(base64String) {
  if (!base64String) return new Uint8Array();
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}