import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

class WebSocketService {
    constructor() {
        this.stompClient = null;
        this.connected = false;
        this.subscribers = {};
    }

    connect(userId, onMessageReceived) {
        return new Promise((resolve, reject) => {
            const socket = new SockJS('http://localhost:8080/ws');
            this.stompClient = Stomp.over(socket);

            this.stompClient.connect(
                {},
                () => {
                    this.connected = true;

                    // Subscribe to user-specific messages
                    this.stompClient.subscribe(`/user/${userId}/queue/messages`, (message) => {
                        const notification = JSON.parse(message.body);
                        onMessageReceived(notification);
                    });

                    console.log('WebSocket connected successfully');
                    resolve();
                },
                (error) => {
                    this.connected = false;
                    console.error('WebSocket connection error:', error);
                    reject(error);
                }
            );
        });
    }

    disconnect() {
        if (this.stompClient && this.connected) {
            this.stompClient.disconnect(() => {
                this.connected = false;
                console.log('WebSocket disconnected');
            });
        }
    }

    sendMessage(messageData) {
        if (this.stompClient && this.connected) {
            this.stompClient.send('/app/chat.send', {}, JSON.stringify(messageData));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    isConnected() {
        return this.connected;
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;
