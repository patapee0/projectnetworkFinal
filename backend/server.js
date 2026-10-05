/**
 * KKU Dating — Main Server
 * Node.js + Express + MongoDB (Mongoose) + Socket.IO
 */
require('dotenv').config();

// This legacy Express/Socket.IO backend uses mock KKU authentication and
// accepts client-supplied user IDs. It is not the production Firebase app.
// Exit before opening any HTTP/Socket.IO handles unless explicitly opted in.
if (process.env.ENABLE_UNSAFE_LEGACY_DEMO !== 'true') {
  console.error('Legacy demo backend is disabled. Use kku_dating_flutter for the Firebase app.');
  console.error('For isolated local coursework only, opt in with ENABLE_UNSAFE_LEGACY_DEMO=true.');
  process.exit(1);
}

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const { connectDB } = require('./config/db');
const setupSocketHandlers = require('./socket/socketHandler');

// Import Routes
const profileRoutes = require('./routes/profileRoutes');
const swipeRoutes = require('./routes/swipeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const authRoutes = require('./routes/authRoutes');
const privacyRoutes = require('./routes/privacyRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 1e7
});

app.set('io', io);

const PORT = process.env.PORT || 3000;

// Network Traffic Metrics Collector (For Computer Networking Inspection)
let totalRequestCount = 0;
const startTime = Date.now();

app.use((req, res, next) => {
  totalRequestCount++;
  next();
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// This legacy API no longer serves the retired web demo. The current web app
// is built and hosted separately from kku_dating_flutter/.
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'KKU Dating legacy API',
    webApp: 'Build and host kku_dating_flutter/ separately.',
  });
});

// Network Inspector API Endpoint for Networking Course Presentation
app.get('/api/network/stats', (req, res) => {
  const connectedSockets = io.sockets.sockets.size;
  const connectedClients = Array.from(io.sockets.sockets.values()).map(s => ({
    id: s.id,
    profileId: s.profileId || 'Anonymous',
    ip: s.handshake.address,
    transport: s.conn.transport.name,
    connectedAt: new Date(s.handshake.time).toLocaleTimeString()
  }));

  res.json({
    success: true,
    serverUptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    totalRequestsHandled: totalRequestCount,
    activeSocketConnections: connectedSockets,
    protocols: {
      restApi: 'HTTP/1.1 (TCP)',
      realtimeChat: 'WebSocket (Full-Duplex TCP)',
      voiceCall: 'WebRTC P2P (UDP Stream via STUN/ICE)'
    },
    activeClients: connectedClients,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (before API routes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'KKU Dating Backend',
    version: '2.0.0',
    techStack: 'Node.js + Express + MongoDB + Socket.IO',
    timestamp: new Date().toISOString()
  });
});

// REST API Routes
app.use('/api/profiles', profileRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/messages', chatRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/privacy', privacyRoutes);

// Setup Socket.IO Real-Time Handlers
setupSocketHandlers(io);

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start Server
async function startServer() {
  // เชื่อมต่อ MongoDB
  await connectDB();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use by another process.`);
      console.error(`💡 Tip: Close the other server or kill process using port ${PORT}`);
    } else {
      console.error('❌ Server error:', err.message);
    }
  });

  // The mock backend must remain loopback-only even when explicitly enabled.
  server.listen(PORT, '127.0.0.1', () => {
    console.log('=======================================================');
    console.log(` 🔥 KKU Dating Backend Server is LIVE!`);
    console.log(` 📍 http://localhost:${PORT}`);
    console.log(` 📦 Tech Stack: Express + MongoDB + Socket.IO`);
    console.log(` 🔗 API Health: http://localhost:${PORT}/api/health`);
    console.log('=======================================================');
  });
}

startServer();
