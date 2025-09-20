import { NextRequest } from 'next/server';
import { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { flightEngine } from '@/services/flightEngine';
import { FlightProgress } from '@/types';

// WebSocket message types
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  messageId?: string;
  userId?: string;
  data?: unknown;
}

interface WebSocketResponse {
  type: 'flight.progress' | 'flight.delivered' | 'error' | 'pong' | 'subscribed' | 'unsubscribed';
  messageId?: string;
  data?: unknown;
  error?: string;
}

// Store active WebSocket connections
const connections = new Map<string, {
  ws: any;
  userId?: string;
  subscribedFlights: Set<string>;
  lastPing: number;
}>();

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Initialize WebSocket server
function initializeWebSocketServer() {
  if (wss) return wss;

  wss = new WebSocketServer({ 
    port: 0, // Let the system assign a port
    perMessageDeflate: false,
    clientTracking: true
  });

  wss.on('connection', (ws: any, request: IncomingMessage) => {
    const connectionId = generateConnectionId();
    const connection = {
      ws,
      subscribedFlights: new Set<string>(),
      lastPing: Date.now()
    };

    connections.set(connectionId, connection);
    console.log(`WebSocket connection established: ${connectionId}`);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        handleWebSocketMessage(connectionId, message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        sendError(connectionId, 'Invalid message format');
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log(`WebSocket connection closed: ${connectionId}`);
      const conn = connections.get(connectionId);
      if (conn) {
        // Unsubscribe from all flights
        conn.subscribedFlights.forEach(messageId => {
          flightEngine.removeFlightCallback(messageId);
        });
        connections.delete(connectionId);
      }
    });

    // Handle connection errors
    ws.on('error', (error: Error) => {
      console.error(`WebSocket error for connection ${connectionId}:`, error);
      connections.delete(connectionId);
    });

    // Send initial connection confirmation
    sendMessage(connectionId, {
      type: 'subscribed',
      data: { connectionId }
    });
  });

  // Cleanup inactive connections
  setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 60 seconds

    for (const [connectionId, connection] of connections.entries()) {
      if (now - connection.lastPing > timeout) {
        console.log(`Cleaning up inactive connection: ${connectionId}`);
        connection.ws.terminate();
        connections.delete(connectionId);
      }
    }
  }, 30000); // Check every 30 seconds

  return wss;
}

// Handle WebSocket messages
function handleWebSocketMessage(connectionId: string, message: WebSocketMessage) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  connection.lastPing = Date.now();

  switch (message.type) {
    case 'subscribe':
      if (message.messageId) {
        handleFlightSubscription(connectionId, message.messageId, message.userId);
      }
      break;

    case 'unsubscribe':
      if (message.messageId) {
        handleFlightUnsubscription(connectionId, message.messageId);
      }
      break;

    case 'ping':
      sendMessage(connectionId, { type: 'pong' });
      break;

    default:
      sendError(connectionId, `Unknown message type: ${message.type}`);
  }
}

// Handle flight subscription
function handleFlightSubscription(connectionId: string, messageId: string, userId?: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  // Store user ID if provided
  if (userId) {
    connection.userId = userId;
  }

  // Add to subscribed flights
  connection.subscribedFlights.add(messageId);

  // Register flight progress callback
  flightEngine.onFlightProgress(messageId, (progress: FlightProgress) => {
    sendMessage(connectionId, {
      type: 'flight.progress',
      messageId,
      data: progress
    });

    // Check if flight is completed
    if (progress.progress_percentage >= 100) {
      sendMessage(connectionId, {
        type: 'flight.delivered',
        messageId,
        data: progress
      });
      
      // Auto-unsubscribe from completed flights
      connection.subscribedFlights.delete(messageId);
      flightEngine.removeFlightCallback(messageId);
    }
  });

  // Send current flight status if available
  const currentProgress = flightEngine.getFlightProgress(messageId);
  if (currentProgress) {
    sendMessage(connectionId, {
      type: 'flight.progress',
      messageId,
      data: currentProgress
    });
  }

  sendMessage(connectionId, {
    type: 'subscribed',
    messageId,
    data: { status: 'subscribed' }
  });
}

// Handle flight unsubscription
function handleFlightUnsubscription(connectionId: string, messageId: string) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  connection.subscribedFlights.delete(messageId);
  flightEngine.removeFlightCallback(messageId);

  sendMessage(connectionId, {
    type: 'unsubscribed',
    messageId,
    data: { status: 'unsubscribed' }
  });
}

// Send message to specific connection
function sendMessage(connectionId: string, message: WebSocketResponse) {
  const connection = connections.get(connectionId);
  if (!connection || connection.ws.readyState !== 1) return; // 1 = OPEN

  try {
    connection.ws.send(JSON.stringify(message));
  } catch (error) {
    console.error(`Error sending message to ${connectionId}:`, error);
    connections.delete(connectionId);
  }
}

// Send error message
function sendError(connectionId: string, error: string) {
  sendMessage(connectionId, {
    type: 'error',
    error
  });
}

// Generate unique connection ID
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Broadcast message to all connections subscribed to a flight
export function broadcastFlightUpdate(messageId: string, progress: FlightProgress) {
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.subscribedFlights.has(messageId)) {
      sendMessage(connectionId, {
        type: 'flight.progress',
        messageId,
        data: progress
      });
    }
  }
}

// Broadcast flight delivery notification
export function broadcastFlightDelivery(messageId: string, progress: FlightProgress) {
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.subscribedFlights.has(messageId)) {
      sendMessage(connectionId, {
        type: 'flight.delivered',
        messageId,
        data: progress
      });
      
      // Auto-unsubscribe from completed flights
      connection.subscribedFlights.delete(messageId);
    }
  }
}

// Get connection statistics
export function getConnectionStats() {
  return {
    totalConnections: connections.size,
    activeSubscriptions: Array.from(connections.values())
      .reduce((total, conn) => total + conn.subscribedFlights.size, 0)
  };
}

// HTTP handler for WebSocket upgrade
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const upgrade = request.headers.get('upgrade');

  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // Initialize WebSocket server if not already done
  const server = initializeWebSocketServer();

  // Return WebSocket server info
  return new Response(JSON.stringify({
    message: 'WebSocket server initialized',
    port: server.options.port,
    stats: getConnectionStats()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Send message to specific user
export function sendToUser(userId: string, message: { type: string; data: unknown }) {
  for (const [connectionId, connection] of connections.entries()) {
    if (connection.userId === userId) {
      sendMessage(connectionId, {
        type: message.type as any,
        data: message.data
      });
    }
  }
}

// Handle WebSocket upgrade (this is a simplified approach for Next.js)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'broadcast' && body.messageId && body.progress) {
      broadcastFlightUpdate(body.messageId, body.progress);
      return new Response(JSON.stringify({ success: true }));
    }

    if (body.action === 'sendToUser' && body.userId && body.message) {
      sendToUser(body.userId, body.message);
      return new Response(JSON.stringify({ success: true }));
    }

    if (body.action === 'stats') {
      return new Response(JSON.stringify(getConnectionStats()));
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}