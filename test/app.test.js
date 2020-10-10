const app = require('../src/app');

describe('App', () => {
  it('GET / responds with 200 containing "Hello, noteful!"', () => {
    return supertest(app)
      .get('/api/noteful')
      .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
      .expect(200, 'Hello, noteful!');
  });
});