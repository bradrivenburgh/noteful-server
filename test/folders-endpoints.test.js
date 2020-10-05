const knex = require('knex');
const app = require('../src/app');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');

describe('Folders Endpoints', function () {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });

    app.set('db', db);
  });

  before('clean the table', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));
  
  afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

  after('disconnect from db', () => db.destroy());


  describe(`GET /api/folders`, () => {
    context(`Given no folders`, () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, []);
      });
    });

    context(`Given there are articles in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            // when adding table connected by foreign key, add here
            // return db
            //   .into('noteful_folders')
            //   .insert(testFolders);
          })
      });

      context(`Given an XSS attack folder`, () => {
        const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

        beforeEach("insert malicious folder", () => {
          return db.into("noteful_folders").insert([maliciousFolder]);
        });

        it("removes XSS attack content", () => {
          return supertest(app)
            .get(`/api/folders`)
            .expect(200)
            .expect((res) => {
              const insertedFolder = res.body[res.body.length - 1];
              expect(insertedFolder.folder_name).to.eql(expectedFolder.folder_name);
            });
        });
      });
      
      it(`responds with 200 and all of the folders`, () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders)
      });
    });
  
  });

  describe(`GET /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it(`responds with 404`, () => {
        const folderId = 123456;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .expect(404, { error: {  message: `Folder does not exist` } });
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            // when adding table connected by foreign key, add here
            // return db
            //   .into('noteful_folders')
            //   .insert(testFolders);
          })
      });

      context(`Given an XSS attack folder`, () => {
        const { maliciousFolder, expectedFolder } = makeMaliciousFolder();

        beforeEach("insert malicious folder", () => {
          return db.into("noteful_folders").insert([maliciousFolder]);
        });

        it("removes XSS attack content", () => {
          return supertest(app)
            .get(`/api/folders/${maliciousFolder.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.folder_name).to.eql(expectedFolder.folder_name)
            });
        });
      });

      it(`responds with 200 and the specified folder`, () => {
        const folder_id = 1;
        const expectedFolder = testFolders[folder_id - 1]
        return supertest(app)
          .get(`/api/folders/${folder_id}`)
          .expect(200, expectedFolder)
      });
    });
  });
/*
  describe('POST /api/articles', () => {
    it('creates an article, responding with 201 and the new article', function () {
      this.retries(3);

      const newArticle = {
        folder_name: 'Test new article',
        style: 'Listicle',
        content: 'Test new article content...'
      };

      return supertest(app)
      .post('/api/articles')
      .send(newArticle)
      .expect(201)
      .expect(res => {
        expect(res.body.folder_name).to.eql(newArticle.folder_name);
        expect(res.body.style).to.eql(newArticle.style);
        expect(res.body.content).to.eql(newArticle.content);
        expect(res.body).to.have.property('id');
        expect(res.headers.location).to.eql(`/api/articles/${res.body.id}`);
        
        const expectedDate = new Date().toLocaleString();
        const actualDate = new Date(res.body.date_published).toLocaleString();
        expect(actualDate).to.eql(expectedDate);
      })
      .then(postRes => {
        return supertest(app)
          .get(`/api/articles/${postRes.body.id}`)
          .expect(postRes.body)
      });
    });

    const requiredFields = ['folder_name', 'style', 'content'];
    requiredFields.forEach(field => {
      const newArticle = {
        folder_name: 'Test new article',
        style: 'Listicle',
        content: 'Test new article content...'
      };
  
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newArticle[field];

        return supertest(app)
          .post('/api/articles')
          .send(newArticle)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` }
          });
      });
    });

    context(`Given an XSS attack article`, () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
  
      it("removes XSS attack content", () => {
        return supertest(app)
          .post(`/api/articles`)
          .send(maliciousFolder)
          .expect(201)
          .expect((res) => {
            expect(res.body.folder_name).to.eql(expectedFolder.folder_name);
            expect(res.body.content).to.eql(expectedFolder.content);
          });
      });
    });
  });

  describe('DELETE /api/articles/:article_id', () => {
    context('given no articles in the database', () => {
      it('responds with 404', () => {
        const articleId = 123456;
        return supertest(app)
          .delete(`/api/articles/${articleId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      });
    })

    context('given the are articles in the database', () => {
      const testUsers = makeUsersArray();
      const testArticles = makeFoldersArray();

      beforeEach('insert articles', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db
              .into('blogful_articles')
              .insert(testArticles);
          })
      });

      it('responds with 204 and removes the article', () => {
        const idToRemove = 2;
        const expectedFolders = testArticles
          .filter(article => article.id !== idToRemove);
        return supertest(app)
          .delete(`/api/articles/${idToRemove}`)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get('/api/articles')
              .expect(expectedFolders)
          });
      });
    });
  });

  describe('PATCH /api/articles/:article_id', () => {
    context('Given no articles', () => {
      it('responds with 404', () => {
        const articleId = 123456;
        return supertest(app)
          .patch(`/api/articles/${articleId}`)
          .expect(404, { error: { message: `Article doesn't exist` } })
      });
    });

    context('Given there are articles in the database', () => {
      const testUsers = makeUsersArray();
      const testArticles = makeFoldersArray();

      beforeEach('insert articles', () => {
        return db
          .into('blogful_users')
          .insert(testUsers)
          .then(() => {
            return db
              .into('blogful_articles')
              .insert(testArticles);
          })
      });

      it('responds with 204 and updates the article', () => {
        const idToUpdate = 2;
        const updateArticle = {
          folder_name: 'updated article folder_name',
          style: 'Interview',
          content: 'updated article content',
        };
        const expectedFolder = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle
        }

        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send(updateArticle)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/articles/${idToUpdate}`)
              .expect(expectedFolder)
          });
      });

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'folder_name', 'style' or 'content'`
            }
          });
      });

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2;
        const updateArticle = {
          folder_name: 'updated article folder_name',
          content: 'updated article content'
        };
        const expectedFolder = {
          ...testArticles[idToUpdate - 1],
          ...updateArticle
        }

        return supertest(app)
          .patch(`/api/articles/${idToUpdate}`)
          .send({...updateArticle, fieldToIgnore: 'should not be in GET response'})
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/articles/${idToUpdate}`)
              .expect(expectedFolder)
          });
      });
    });
  });
*/
 });