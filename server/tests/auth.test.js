const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

require('./setup');

describe('Auth Endpoints', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.name).toEqual('Test User');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should not register with existing email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'User 2',
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(res.statusCode).toEqual(400);
  });

  it('should login an existing user', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id');
    expect(res.headers['set-cookie']).toBeDefined();
  });
});
