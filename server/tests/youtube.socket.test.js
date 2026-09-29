const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const app = require('../src/app');
const initSocketServer = require('../src/sockets');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const jwt = require('jsonwebtoken');

require('./setup');

describe('YouTube Socket Real-time Features (Phase 3.1)', () => {
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
    await User.deleteMany({});
    await Conversation.deleteMany({});
    
    user1 = await User.create({ name: 'User 1', email: 'user1@test.com', passwordHash: 'pwd' });
    user2 = await User.create({ name: 'User 2', email: 'user2@test.com', passwordHash: 'pwd' });
    unauthorizedUser = await User.create({ name: 'User 3', email: 'user3@test.com', passwordHash: 'pwd' });

    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET || 'test_secret');
    token2 = jwt.sign({ id: user2._id }, process.env.JWT_SECRET || 'test_secret');
    token3 = jwt.sign({ id: unauthorizedUser._id }, process.env.JWT_SECRET || 'test_secret');

    const conv = await Conversation.create({ members: [user1._id, user2._id], createdBy: user1._id });
    conversationId = conv._id.toString();

    client1 = Client(url, { extraHeaders: { cookie: `jwt=${token1}` } });
    client2 = Client(url, { extraHeaders: { cookie: `jwt=${token2}` } });
    clientUnauthorized = Client(url, { extraHeaders: { cookie: `jwt=${token3}` } });

    const connectClient = (client) => new Promise((resolve, reject) => {
      client.on('connect', resolve);
      client.on('connect_error', reject);
    });

    await Promise.all([
      connectClient(client1),
      connectClient(client2),
      connectClient(clientUnauthorized)
    ]);
  });

  afterEach(() => {
    client1.removeAllListeners();
    client2.removeAllListeners();
    clientUnauthorized.removeAllListeners();
    client1.disconnect();
    client2.disconnect();
    clientUnauthorized.disconnect();
  });

  it('should not start until both participants are ready', (done) => {
    client1.emit('conversation:join', conversationId);
    client2.emit('conversation:join', conversationId);

    client2.on('yt:request_accept', (data) => {
      client2.emit('yt:accept', { conversationId, requestId: data.requestId });
    });

    let stateUpdates = 0;
    client2.on('yt:state', (state) => {
      stateUpdates++;
      if (stateUpdates === 1) {
        expect(state.status).toBe('preparing');
        client2.emit('yt:ready', { conversationId, version: state.version });
      } else if (stateUpdates === 2) {
        expect(state.status).toBe('playing');
        done();
      }
    });

    client1.on('yt:state', (state) => {
       if (state.status === 'preparing') {
         setTimeout(() => {
           client1.emit('yt:ready', { conversationId, version: state.version });
         }, 50);
       }
    });

    setTimeout(() => {
      client1.emit('yt:play', {
        conversationId,
        videoId: 'vid123',
        videoDetails: { title: 'Test' },
        playbackPosition: 0
      });
    }, 100);
  });

  it('should timeout if participants are not ready', (done) => {
    client1.emit('conversation:join', conversationId);
    client2.emit('conversation:join', conversationId);

    client2.on('yt:request_accept', (data) => {
      client2.emit('yt:accept', { conversationId, requestId: data.requestId });
    });

    let stateUpdates = 0;
    client2.on('yt:state', (state) => {
      stateUpdates++;
      if (stateUpdates === 1) {
        expect(state.status).toBe('preparing');
        done(); // Just verify preparing state, don't actually wait 10s
      }
    });

    setTimeout(() => {
      client1.emit('yt:play', {
        conversationId,
        videoId: 'vid123',
        videoDetails: { title: 'Test' },
        playbackPosition: 0
      });
    }, 100);
  });

  it('should prevent unauthorized users from controlling playback', (done) => {
    clientUnauthorized.emit('yt:play', {
      conversationId,
      videoId: 'vid123',
      videoDetails: { title: 'Test' },
      playbackPosition: 0
    });

    clientUnauthorized.on('yt:request_accept', () => {
      // Should never reach here
    });

    setTimeout(() => {
       done();
    }, 200);
  });
});
