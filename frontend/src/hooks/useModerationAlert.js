/**
 * useModerationAlert — subscribes to the user's personal moderation WebSocket topic.
 * On suspension/ban: stores the alert in localStorage so it persists across page loads.
 * On unban: clears the stored alert.
 *
 * Exports:
 *   alert  — { action, reason, suspendedUntil?, message } | null
 *   clear  — fn to dismiss the banner manually (does NOT lift the server-side suspension)
 */
import { useEffect, useState } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { userStorage } from '../services/authService';

const STORAGE_KEY = (userId) => `moderation_alert_${userId}`;

export function getModerationAlert() {
  const user = userStorage.getUser();
  if (!user?.id) return null;
  const stored = localStorage.getItem(STORAGE_KEY(user.id));
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

export function clearModerationAlert() {
  const user = userStorage.getUser();
  if (user?.id) localStorage.removeItem(STORAGE_KEY(user.id));
}

export default function useModerationAlert() {
  const [alert, setAlert] = useState(() => getModerationAlert());

  useEffect(() => {
    const user = userStorage.getUser();
    if (!user?.id) return;

    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace('/api', '');
    const client = new Client({
      webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/moderation-alert/${user.id}`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.action === 'UNBANNED') {
              localStorage.removeItem(STORAGE_KEY(user.id));
              setAlert(null);
            } else {
              localStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(data));
              setAlert(data);
            }
          } catch (e) { console.error('[ModerationAlert WS]', e); }
        });
      },
    });

    client.activate();
    return () => client.deactivate();
  }, []);

  const clear = () => {
    clearModerationAlert();
    setAlert(null);
  };

  return { alert, clear };
}
