# Chat Feature Implementation Guide

## Overview
A real-time one-to-one chat system has been successfully integrated into the Movie Tracker website. Users can now communicate with each other in real-time using WebSocket technology.

## Backend Implementation

### 1. Entities
- **Message**: Stores individual chat messages with sender, content, timestamps, and read status
- **Conversation**: Manages conversations between users with support for both one-to-one and group chats

### 2. Repositories
- **MessageRepository**: Handles message persistence and queries
- **ConversationRepository**: Manages conversation data and participant lookups

### 3. Services
- **ChatService**: Core business logic for:
  - Sending messages
  - Creating/retrieving conversations
  - Marking messages as read
  - Counting unread messages

### 4. Controllers
- **ChatController** (REST): HTTP endpoints for chat operations
  - `GET /api/chat/conversations` - Get all user conversations
  - `GET /api/chat/conversations/{id}/messages` - Get messages for a conversation
  - `POST /api/chat/messages/send` - Send a message
  - `PUT /api/chat/conversations/{id}/read` - Mark messages as read
  - `GET /api/chat/unread-count` - Get total unread count

- **WebSocketChatController**: WebSocket endpoint for real-time messaging
  - `/app/chat.send` - Send messages via WebSocket

### 5. Configuration
- **WebSocketConfig**: Configures WebSocket with SockJS and STOMP
  - Endpoint: `ws://localhost:8080/ws`
  - User destination prefix: `/user`
  - Application destination prefix: `/app`

- **SecurityConfig**: Updated to allow WebSocket and chat endpoints

### 6. DTOs
- **SendMessageRequestDto**: Request payload for sending messages
- **MessageResponseDto**: Message data with sender information
- **ConversationResponseDto**: Conversation summary with last message and unread count
- **ChatNotificationDto**: Real-time notification payload

## Frontend Implementation

### 1. Services
- **chatService.js**: HTTP API calls for chat operations
  - Get conversations
  - Get messages
  - Send messages
  - Mark as read
  - Get unread count

- **webSocketService.js**: WebSocket connection management
  - Connect/disconnect to WebSocket
  - Subscribe to user-specific message queue
  - Send messages via STOMP
  - Handle incoming message notifications

### 2. Pages
- **Chat.jsx**: Main chat interface with:
  - Conversation list sidebar
  - Message display area
  - Message input and send functionality
  - Real-time message updates
  - Unread message badges
  - Search conversations
  - Auto-scroll to latest messages

### 3. Navigation
- **Navbar.jsx**: Updated with chat icon
  - Desktop: Message icon in top navigation
  - Mobile: Chat button in bottom navigation bar
  - Only visible for authenticated users

### 4. Styling
- Consistent dark theme matching the website (#071427 background)
- Purple accent color (#361087) for branding consistency
- Responsive design for mobile and desktop
- Smooth animations and transitions

## How to Use

### Starting the Backend
1. Ensure Java 21 is installed and JAVA_HOME is set correctly
2. Navigate to the projection directory
3. Run: `.\mvnw.cmd spring-boot:run`
4. Backend will start on `http://localhost:8080`

### Starting the Frontend
1. Navigate to the frontend directory
2. Install dependencies (if not already): `npm install`
3. Run: `npm run dev`
4. Frontend will start on `http://localhost:5173`

### Using the Chat
1. **Login**: Users must be authenticated to access chat
2. **Access Chat**: Click the message icon in the navbar or navigate to `/chat`
3. **Start Conversation**: 
   - Visit another user's profile (when implemented)
   - Click "Send Message" button
   - Or use URL parameter: `/chat?recipientId=123`
4. **Send Messages**: Type and press Send or Enter
5. **Real-time Updates**: Messages appear instantly for both users
6. **Read Receipts**: Messages are automatically marked as read when viewed

## Technical Details

### WebSocket Connection Flow
1. User logs in and navigates to chat page
2. WebSocket connection established to `/ws`
3. Client subscribes to `/user/{userId}/queue/messages`
4. When a message is sent:
   - Saved to database via REST API
   - Notification sent via WebSocket to recipient
   - Both users see the message in real-time

### Database Schema
- **messages**: Stores all chat messages
  - id (UUID)
  - conversation_id (UUID)
  - sender_id (Long)
  - content (TEXT)
  - is_read (Boolean)
  - sent_at (Timestamp)

- **conversations**: Manages chat conversations
  - id (UUID)
  - is_group (Boolean)
  - created_at (Timestamp)

- **conversation_participants**: Junction table for users in conversations

### Dependencies Added
**Backend:**
- spring-boot-starter-websocket (already present)
- jackson-databind (for JSON serialization)

**Frontend:**
- sockjs-client: WebSocket fallback support
- @stomp/stompjs: STOMP protocol over WebSocket

## Future Enhancements
- [ ] Group chat support
- [ ] File/image sharing
- [ ] Typing indicators
- [ ] Message reactions
- [ ] Delete/edit messages
- [ ] Voice/video calls
- [ ] Push notifications
- [ ] Message search
- [ ] Chat history pagination
- [ ] Emoji picker
- [ ] Message delivery status

## Security Considerations
- All endpoints require authentication
- Users can only access their own conversations
- WebSocket connections are authenticated
- CORS configured for local development
- SQL injection prevention via JPA

## Troubleshooting

### WebSocket Connection Issues
- Verify backend is running on port 8080
- Check browser console for connection errors
- Ensure CORS settings allow frontend origin
- Check firewall settings

### Messages Not Appearing
- Verify WebSocket connection is established
- Check that sender and recipient IDs are correct
- Ensure database tables are created
- Review backend logs for errors

### Build Errors
- Ensure Java 21 is installed
- Set JAVA_HOME to Java 21 directory
- Run `.\mvnw.cmd clean install` to rebuild

## Contact
For issues or questions about the chat implementation, please refer to the code comments or contact the development team.
