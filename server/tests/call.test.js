const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const jwt = require('jsonwebtoken');

require('./setup');

describe('Call API Endpoints', () => {
  let user1, user2, unauthorizedUser, token1, tokenUnauthorized, conversationId;

  beforeEach(async () => {
    user1 = await User.create({ name: 'User 1', email: 'u1@test.com', passwordHash: 'pwd' });
    user2 = await User.create({ name: 'User 2', email: 'u2@test.com', passwordHash: 'pwd' });
    unauthorizedUser = await User.create({ name: 'User 3', email: 'u3@test.com', passwordHash: 'pwd' });

    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET || 'test_secret');
    tokenUnauthorized = jwt.sign({ id: unauthorizedUser._id }, process.env.JWT_SECRET || 'test_secret');

    const conv = await Conversation.create({ members: [user1._id, user2._id], createdBy: user1._id });
    conversationId = conv._id.toString();
  });

  it('should return 403 for unauthorized call history access', async () => {
    const res = await request(app)
      .get(`/api/calls/history/${conversationId}`)
      .set('Cookie', `jwt=${tokenUnauthorized}`);
    
    expect(res.status).toBe(403);
  });

  it('should allow authorized access to call history', async () => {
    const res = await request(app)
      .get(`/api/calls/history/${conversationId}`)
      .set('Cookie', `jwt=${token1}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('should return 403 for unauthorized LiveKit token request', async () => {
    const res = await request(app)
      .get(`/api/calls/token/${conversationId}`)
      .set('Cookie', `jwt=${tokenUnauthorized}`);
    
    expect(res.status).toBe(403);
  });
  
  it('should return 503 for LiveKit token request if LiveKit is not configured', async () => {
    delete process.env.LIVEKIT_API_KEY;
    
    const res = await request(app)
      .get(`/api/calls/token/${conversationId}`)
      .set('Cookie', `jwt=${token1}`);
    
    expect(res.status).toBe(503);
  });
});
