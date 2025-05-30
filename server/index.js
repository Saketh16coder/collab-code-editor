const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://16saketh05:Mongodatabase@collabcode.xyybhoz.mongodb.net/collabdb?retryWrites=true&w=majority&appName=CollabCode';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const CodeSchema = new mongoose.Schema({
  documentId: { type: String, required: true, default: "main" },
  code: { type: String, required: true }
});
const Code = mongoose.model('Code', CodeSchema);

const MessageSchema = new mongoose.Schema({
  documentId: { type: String, required: true, default: "main" },
  username: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);

// --- User Presence & Typing ---
let onlineUsers = {};
let typingUsers = {}; // socket.id -> username

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', async (socket) => {
  console.log('Client connected, fetching code and chat...');

  // --- User Presence ---
  socket.on('register-username', (username) => {
    socket.username = username;
    onlineUsers[socket.id] = username;
    io.emit('online-users', Object.values(onlineUsers));
  });

  // --- Typing Indicator ---
  socket.on('chat-typing', () => {
    if (socket.username) {
      typingUsers[socket.id] = socket.username;
      io.emit('typing-users', Object.values(typingUsers));
    }
  });

  socket.on('chat-stop-typing', () => {
    if (typingUsers[socket.id]) {
      delete typingUsers[socket.id];
      io.emit('typing-users', Object.values(typingUsers));
    }
  });

  // --- Cleanup on disconnect ---
  socket.on('disconnect', () => {
    if (onlineUsers[socket.id]) {
      delete onlineUsers[socket.id];
      io.emit('online-users', Object.values(onlineUsers));
    }
    if (typingUsers[socket.id]) {
      delete typingUsers[socket.id];
      io.emit('typing-users', Object.values(typingUsers));
    }
  });

  // --- Initial Data Push (existing) ---
  try {
    const codeDoc = await Code.findOne({ documentId: "main" });
    const messages = await Message.find({ documentId: "main" }).sort({ timestamp: 1 }).limit(100);
    socket.emit('init', {
      code: codeDoc ? codeDoc.code : '',
      messages: messages.map(m => ({
        username: m.username,
        text: m.text
      }))
    });
    // Send current online users and typing users to this new socket
    socket.emit('online-users', Object.values(onlineUsers));
    socket.emit('typing-users', Object.values(typingUsers));
  } catch (err) {
    socket.emit('init', { code: '', messages: [] });
  }

  // --- Save code to DB on change ---
  socket.on('code-change', async (newCode) => {
    await Code.findOneAndUpdate(
      { documentId: "main" },
      { code: newCode },
      { upsert: true, new: true }
    );
    socket.broadcast.emit('code-update', newCode);
  });

  // --- Save chat to DB on message ---
  socket.on('send-message', async (message) => {
    await Message.create({
      documentId: "main",
      username: message.username,
      text: message.text
    });
    io.emit('receive-message', message);
  });

  // --- Run Python code as before ---
  socket.on('run-python', (code, callback) => {
    try {
      const { spawn } = require('child_process');
      const pyProcess = spawn('python', ['-c', code]);
      let output = '';
      let error = '';

      pyProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      pyProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      pyProcess.on('close', () => {
        if (error) {
          callback({ error });
        } else {
          callback({ output });
        }
      });
    } catch (err) {
      callback({ error: err.message });
    }
  });
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

server.listen(4000, () => {
  console.log('Server running on port 4000');
});
