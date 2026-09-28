const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Conversation = require('../src/models/Conversation');
const Song = require('../src/models/Song');

require('./setup');

jest.mock('../src/services/storageService', () => ({
  getUploadUrl: jest.fn().mockResolvedValue('https://mock-upload-url.com'),
  getPlaybackUrl: jest.fn().mockResolvedValue('https://mock-playback-url.com'),
  checkObjectExists: jest.fn().mockResolvedValue(true),
  deleteObject: jest.fn().mockResolvedValue(),
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

  it('should generate an upload URL', async () => {
    const res = await request(app)
      .post('/api/songs/upload-url')
      .set('Cookie', userCookie)
      .send({
        conversationId: convId,
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 5000000
      });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('uploadUrl', 'https://mock-upload-url.com');
    expect(res.body).toHaveProperty('objectKey');
  });

  it('should confirm an upload and save song', async () => {
    const objectKey = 'songs/mock/test.mp3';
    const res = await request(app)
      .post('/api/songs/confirm-upload')
      .set('Cookie', userCookie)
      .send({
        conversationId: convId,
        objectKey,
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 120,
        originalFileName: 'test.mp3',
        fileSize: 5000000,
        contentType: 'audio/mpeg'
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.title).toEqual('Test Song');
    
    const dbSong = await Song.findOne({ objectKey });
    expect(dbSong).not.toBeNull();
  });

  it('should not allow access to a conversation the user is not in', async () => {
    const user2Res = await request(app).post('/api/auth/register').send({
      name: 'Hacker',
      email: 'hacker@example.com',
      password: 'password123'
    });
    const hackerCookie = user2Res.headers['set-cookie'];

    const res = await request(app)
      .post('/api/songs/upload-url')
      .set('Cookie', hackerCookie)
      .send({
        conversationId: convId,
        fileName: 'test.mp3',
        contentType: 'audio/mpeg',
        fileSize: 5000000
      });
      
    expect(res.statusCode).toEqual(403);
  });
});
