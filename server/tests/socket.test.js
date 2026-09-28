const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../src/app');
const initSocketServer = require('../src/sockets');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const jwt = require('jsonwebtoken');

require('./setup');

describe('Socket.IO Real-time Features (Phase 3 Checklist)', () => {
  let io, server, url;
  let user1, user2, unauthorizedUser;
  let token1, token2, token3;
  let client1, client2, clientUnauthorized;
  let conversationId;

  beforeAll((done) => {
    server = http.createServer(app);
    io = initSocketServer(server);
    server.listen(() => {
      url = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  beforeEach(async () => {
    // Setup users
    user1 = await User.create({ name: 'User 1', email: 'user1@test.com', passwordHash: 'pwd' });
    user2 = await User.create({ name: 'User 2', email: 'user2@test.com', passwordHash: 'pwd' });
    unauthorizedUser = await User.create({ name: 'User 3', email: 'user3@test.com', passwordHash: 'pwd' });

    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET || 'test_secret');
    token2 = jwt.sign({ id: user2._id }, process.env.JWT_SECRET || 'test_secret');
    token3 = jwt.sign({ id: unauthorizedUser._id }, process.env.JWT_SECRET || 'test_secret');

    // Create a conversation with only user1 and user2
    const conv = await Conversation.create({ members: [user1._id, user2._id], createdBy: user1._id });
    conversationId = conv._id.toString();

    // The current socket server parses 'jwt' from cookie.
    // For socket.io-client tests in Node, we pass extraHeaders.
    client1 = Client(url, { extraHeaders: { cookie: `jwt=${token1}` } });
    client2 = Client(url, { extraHeaders: { cookie: `jwt=${token2}` } });
    clientUnauthorized = Client(url, { extraHeaders: { cookie: `jwt=${token3}` } });

    await new Promise(r => client1.on('connect', r));
    await new Promise(r => client2.on('connect', r));
    await new Promise(r => clientUnauthorized.on('connect', r));
  });

  afterEach(() => {
    client1.disconnect();
    client2.disconnect();
    clientUnauthorized.disconnect();
  });

  // 1. User 1 message அனுப்பினால் User 2-க்கு உடனே தெரிய வேண்டும்
  it('should deliver messages immediately (User 1 to User 2)', (done) => {
    client1.emit('conversation:join', conversationId);
    client2.emit('conversation:join', conversationId);

    client2.on('message:new', (msg) => {
      expect(msg.content).toBe('Hello from User 1');
      done();
    });

    setTimeout(() => {
      client1.emit('message:send', {
        conversationId,
        content: 'Hello from User 1',
        clientMessageId: 'msg-1'
      });
    }, 50);
  });

  // 2. User 1 song Play செய்தால் User 2-க்கும் play ஆக வேண்டும்
  it('should sync play state from User 1 to User 2', (done) => {
    client1.emit('conversation:join', conversationId);
    client2.emit('conversation:join', conversationId);

    client2.on('music:state', (state) => {
      expect(state.isPlaying).toBe(true);
      expect(state.songId).toBe('song123');
      done();
    });

    setTimeout(() => {
      client1.emit('music:play', {
        conversationId,
        songId: 'song123',
        playbackPosition: 0
      });
    }, 50);
  });

  // 3. Pause மற்றும் Seek எல்லா users-க்கும் sync ஆக வேண்டும்
  it('should sync pause and seek states across all users', (done) => {
    client1.emit('conversation:join', conversationId);
    client2.emit('conversation:join', conversationId);

    let stateUpdates = 0;
    client2.on('music:state', (state) => {
      stateUpdates++;
      if (stateUpdates === 1) { // 1st update: Pause
        expect(state.isPlaying).toBe(false);
        expect(state.playbackPosition).toBe(15);
        // User 1 seeks
        client1.emit('music:seek', { conversationId, playbackPosition: 30 });
      } else if (stateUpdates === 2) { // 2nd update: Seek
        expect(state.playbackPosition).toBe(30);
        done();
      }
    });

    setTimeout(() => {
      client1.emit('music:pause', { conversationId, playbackPosition: 15 });
    }, 50);
  });

  // 4. புதிதாக chat-ல் join செய்பவருக்கு current song state கிடைக்க வேண்டும்
  it('should send current state to newly joined users', (done) => {
    // User 1 plays a song
    client1.emit('music:play', { conversationId, songId: 'song456', playbackPosition: 10 });
    
    // User 2 joins later and requests state
    setTimeout(() => {
      client2.emit('conversation:join', conversationId);
      client2.emit('music:request-state', conversationId, (response) => {
        expect(response.state.songId).toBe('song456');
        expect(response.state.isPlaying).toBe(true);
        expect(response.state.playbackPosition).toBe(10);
        done();
      });
    }, 50);
  });

  // 5. Unauthorized user chat அல்லது music control செய்ய முடியக்கூடாது
  it('should prevent unauthorized users from broadcasting messages or controlling music', (done) => {
    client1.emit('conversation:join', conversationId);
    
    let receivedEvents = 0;
    client1.on('message:new', () => { receivedEvents++; });
    client1.on('music:state', () => { receivedEvents++; });

    // Ensure we are doing basic check logic in chatHandler - wait, currently chatHandler doesn't enforce strict rejection in broadcast, it just relies on the user being in the room. 
    // To strictly test this, we should verify the unauthorized user fails. 
    // We didn't fully implement strict RBAC in the socket handlers for the sake of simplicity, but we can verify they can't join the socket.io room.
    // If they don't join the room, they shouldn't be able to disrupt members.
    
    clientUnauthorized.emit('conversation:join', conversationId);
    clientUnauthorized.emit('music:play', { conversationId, songId: 'hacked', playbackPosition: 0 });

    setTimeout(() => {
      // If our implementation actually doesn't prevent this yet in musicHandler (because we didn't add the DB check there), this test might fail. Let's fix that if it does.
      expect(receivedEvents).toBe(0); // If strict checks exist, this is 0
      done();
    }, 200);
  });

  // 6. Internet reconnect ஆனதும் playback state மீண்டும் sync ஆக வேண்டும்
  it('should resync upon reconnection', (done) => {
    client1.emit('music:play', { conversationId, songId: 'song789', playbackPosition: 50 });
    
    setTimeout(() => {
      client2.disconnect(); // simulate disconnect
      
      setTimeout(() => {
        client2.connect(); // simulate reconnect
        client2.emit('conversation:join', conversationId);
        client2.emit('music:request-state', conversationId, (response) => {
          expect(response.state.songId).toBe('song789');
          done();
        });
      }, 50);
    }, 50);
  });
});
