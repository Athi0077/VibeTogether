const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Song = require('../src/models/Song');

require('./setup');

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, cb) => {
        const stream = require('stream');
        const pass = new stream.PassThrough();
        pass.on('data', () => {});
        pass.on('end', () => {
          cb(null, {
            public_id: 'mock_public_id',
            secure_url: 'https://mock-url.com/song.mp3',
            duration: 120,
            format: 'mp3',
            bytes: 5000000
          });
        });
        return pass;
      })
    }
  }
}));

describe('Song Endpoints', () => {
  let userCookie;
  let userId;
  let convId;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    userCookie = res.headers['set-cookie'];
    userId = res.body._id;

    const conv = await Conversation.create({ members: [userId], createdBy: userId });
    convId = conv._id.toString();
  });

  it('should not allow access to a conversation the user is not in', async () => {
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'Hacker',
      email: 'hacker@example.com',
      password: 'password123'
    });
    const hackerCookie = user2Res.headers['set-cookie'];

    const res = await request(app)
      .post('/api/songs/upload')
      .set('Cookie', hackerCookie)
      .field('conversationId', convId)
      .attach('file', Buffer.from('mock audio content'), 'test.mp3');
      
    expect(res.statusCode).toEqual(403);
  });
});
