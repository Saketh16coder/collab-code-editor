import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Editor from "@monaco-editor/react";

const socket = io('https://collab-code-editor-pock.onrender.com');


function App() {
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [output, setOutput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Load username from localStorage if available (runs only once)
  useEffect(() => {
    const storedUsername = localStorage.getItem('collab_username');
    if (storedUsername) {
      setUsername(storedUsername);
      setUsernameInput(storedUsername);
    }
  }, []);

  // Socket events (runs when username is available)
  useEffect(() => {
    if (!username) return;

    socket.emit('register-username', username);

    socket.on('init', ({ code, messages }) => {
      setCode(code);
      setMessages(messages);
    });

    socket.on('code-update', (newCode) => {
      setCode(newCode);
    });

    socket.on('receive-message', (message) => {
      setMessages((msgs) => [...msgs, message]);
    });

    socket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    socket.on('typing-users', (users) => {
      setTypingUsers(users.filter(u => u !== username));
    });

    return () => {
      socket.off('init');
      socket.off('code-update');
      socket.off('receive-message');
      socket.off('online-users');
      socket.off('typing-users');
    };
  }, [username]);

  const handleCodeChange = (value) => {
    setCode(value);
    socket.emit('code-change', value);
  };

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const message = { text: chatInput, username };
      socket.emit('send-message', message);
      setChatInput('');
      socket.emit('chat-stop-typing');
    }
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      setUsername(usernameInput.trim());
      localStorage.setItem('collab_username', usernameInput.trim());
    }
  };

  // Logout button: clear localStorage and reset username
  const handleLogout = () => {
    localStorage.removeItem('collab_username');
    setUsername('');
    setUsernameInput('');
  };

  const handleRunPython = () => {
    setOutput('');
    socket.emit('run-python', code, (result) => {
      if (result.error) {
        setOutput(result.error);
      } else {
        setOutput(result.output);
      }
    });
  };

  // Username modal
  if (!username) {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: '#23272b'
      }}>
        <form onSubmit={handleUsernameSubmit} style={{
          textAlign: 'center',
          background: '#181a1b',
          border: '1px solid #222',
          boxShadow: '0 4px 24px #0004',
          padding: 40,
          borderRadius: 10
        }}>
          <h2 style={{ color: '#fff', letterSpacing: 1 }}>Enter your username to join</h2>
          <input
            type="text"
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            placeholder="Username"
            style={{
              padding: 12,
              fontSize: 17,
              width: 220,
              borderRadius: 6,
              border: '1px solid #555',
              marginTop: 20,
              marginBottom: 18,
              background: '#222',
              color: '#fff',
              outline: 'none'
            }}
            autoFocus
          />
          <br />
          <button type="submit" style={{
            padding: 12,
            fontSize: 17,
            width: 110,
            borderRadius: 6,
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}>Join</button>
        </form>
      </div>
    );
  }

  // Main UI
  return (
    <div style={{
      minHeight: '100vh',
      background: '#23272b',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        width: '100%',
        background: '#181a1b',
        padding: '16px 20px 14px 20px',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box'
      }}>
        <div style={{
          fontWeight: 'bold',
          color: '#3b82f6',
          fontSize: 26,
          letterSpacing: 1.2,
          textShadow: '0 2px 6px #3b82f662'
        }}>
          CollabCode
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <div style={{
            color: "#fff",
            background: "#23272b",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 16,
            boxShadow: "0 2px 6px #0003",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 220
          }}>
            Welcome, <span style={{ color: "#3b82f6" }}>{username}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content: side by side */}
      <div style={{
        display: 'flex',
        flex: 1,
        minWidth: 0,
        width: '100vw',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Editor and output */}
        <div style={{
          flex: 1,
          minWidth: 0,
          padding: 30,
          boxSizing: "border-box",
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            background: '#181a1b',
            padding: 16,
            borderRadius: 14,
            marginBottom: 18,
            boxShadow: '0 2px 12px #0002',
            border: '1px solid #23272b',
            height: '100%'
          }}>
            <h2 style={{
              color: "#fff",
              marginBottom: 14,
              fontWeight: 600,
              letterSpacing: 1.1
            }}>
              Python Collaborative Code Editor
            </h2>
            <Editor
              height="46vh"
              defaultLanguage="python"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 17,
                minimap: { enabled: false },
                fontFamily: 'Fira Mono, monospace',
                wordWrap: 'on',
                theme: 'vs-dark',
                scrollBeyondLastLine: false,
                scrollbar: { vertical: "visible", horizontal: "visible" },
                lineNumbers: "on"
              }}
            />
            <div style={{ margin: '14px 0', textAlign: 'right' }}>
              <button
                onClick={handleRunPython}
                style={{
                  padding: '10px 22px',
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: 17,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 7,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px #3b82f661',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
                onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
              >
                Run Python
              </button>
            </div>
            <div style={{
              background: '#111214',
              color: '#eee',
              minHeight: 50,
              padding: 14,
              borderRadius: 8,
              border: '1px solid #23272b',
              marginBottom: 8,
              fontSize: 15,
              fontFamily: 'Fira Mono, monospace',
              transition: 'background 0.2s'
            }}>
              <strong style={{ color: '#3b82f6', fontSize: 16 }}>Output:</strong>
              <pre style={{ margin: 0, fontSize: 15, color: '#fff', whiteSpace: 'pre-wrap' }}>
                {output || ' '}
              </pre>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div style={{
          width: 350,
          minWidth: 260,
          borderLeft: '1px solid #23272b',
          padding: '24px 20px 24px 20px',
          background: '#23272b',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          {/* Online users indicator */}
          <div style={{
            marginBottom: 10,
            color: "#3b82f6",
            fontWeight: 500,
            fontSize: 16
          }}>
            Online ({onlineUsers.length}): {onlineUsers.join(', ')}
          </div>
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div style={{
              color: '#3b82f6',
              marginBottom: 7,
              fontStyle: "italic",
              fontSize: 15
            }}>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing…`
                : `${typingUsers.join(', ')} are typing…`}
            </div>
          )}
          <h3 style={{
            color: "#fff",
            fontWeight: 600,
            marginBottom: 16,
            fontSize: 22,
            letterSpacing: 1.1
          }}>Live Chat</h3>
          <div style={{
            flex: 1,
            height: '63vh',
            overflowY: 'auto',
            marginBottom: 12,
            border: '1px solid #222',
            padding: 10,
            background: '#181a1b',
            color: "#fff",
            borderRadius: 10,
            boxShadow: '0 2px 10px #0002'
          }}>
            {messages.length === 0 && <div style={{ color: "#999", fontSize: 15 }}>No messages yet.</div>}
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                margin: '10px 0',
                padding: 10,
                background: msg.username === username ? "#3b82f6" : "#2c2f34",
                color: "#fff",
                borderRadius: 7,
                alignSelf: msg.username === username ? "flex-end" : "flex-start",
                maxWidth: "90%",
                wordBreak: "break-word",
                fontWeight: msg.username === username ? 600 : 400,
                boxShadow: msg.username === username ? '0 2px 8px #3b82f661' : 'none',
                transition: 'background 0.2s'
              }}>
                <strong>{msg.username === username ? 'You' : msg.username}:</strong> {msg.text}
              </div>
            ))}
          </div>
          <input
            value={chatInput}
            onChange={e => {
              setChatInput(e.target.value);
              if (e.target.value.trim() !== "") {
                socket.emit('chat-typing');
              } else {
                socket.emit('chat-stop-typing');
              }
            }}
            onBlur={() => socket.emit('chat-stop-typing')}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSendMessage();
                socket.emit('chat-stop-typing');
              }
            }}
            placeholder="Type a message"
            style={{
              width: '100%',
              marginBottom: 10,
              padding: 11,
              fontSize: 16,
              borderRadius: 7,
              border: '1px solid #555',
              background: '#181a1b',
              color: "#fff",
              outline: 'none',
              transition: 'border 0.2s'
            }}
          />
          <button
            onClick={handleSendMessage}
            style={{
              width: '100%',
              padding: 12,
              fontWeight: 700,
              fontSize: 17,
              borderRadius: 7,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 6,
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}
          >Send</button>
        </div>
      </div>
    </div>
  );
}

export default App;
