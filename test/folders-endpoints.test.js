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

  describe('POST /api/folders', () => {
    it('creates a folder, responding with 201 and the new folder', function () {
      // Enable for endpoints where dates are being generated
      // this.retries(3);

      const newFolder = {
        folder_name: 'Test new folder',
      };

      return supertest(app)
      .post('/api/folders')
      .send(newFolder)
      .expect(201)
      .expect(res => {
        expect(res.body.folder_name).to.eql(newFolder.folder_name);
        expect(res.body).to.have.property('id');
        expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
      })
      .then(postRes => {
        return supertest(app)
          .get(`/api/folders/${postRes.body.id}`)
          .expect(postRes.body)
      });
    });

    const requiredFields = ['folder_name'];
    requiredFields.forEach(field => {
      const newFolder = {
        folder_name: 'Test new folder',
      };
  
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newFolder[field];

        return supertest(app)
          .post('/api/folders')
          .send(newFolder)
          .expect(400, {
            error: { message: `Required properties are missing: ${field}` }
          });
      });
    });

    context(`Given an XSS attack folder`, () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
  
      it("removes XSS attack content", () => {
        return supertest(app)
          .post(`/api/folders`)
          .send(maliciousFolder)
          .expect(201)
          .expect((res) => {
            expect(res.body.folder_name).to.eql(expectedFolder.folder_name);
          });
      });
    });
  });

  describe('DELETE /api/folders/:folder_id', () => {
    context('given no folders in the database', () => {
      it('responds with 404', () => {
        const folderId = 123456;
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder does not exist` } })
      });
    })

    context('given the are folders in the database', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            // return db
            //   .into('noteful_folders')
            //   .insert(testFolders);
          })
      });

      it('responds with 204 and removes the folder', () => {
        const idToRemove = 2;
        const expectedFolders = testFolders
          .filter(folder => folder.id !== idToRemove);
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get('/api/folders')
              .expect(expectedFolders)
          });
      });
    });
  });

  describe('PATCH /api/folders/:folder_id', () => {
    context('Given no folders', () => {
      it('responds with 404', () => {
        const folderId = 123456;
        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .expect(404, { error: { message: `Folder does not exist` } })
      });
    });

    context('Given there are folders in the database', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            // return db
            //   .into('noteful_folders')
            //   .insert(testFolders);
          })
      });

      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 2;
        const updateFolder = {
          folder_name: 'updated folder folder_name',
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }

        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send(updateFolder)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          });
      });

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain: folder_name`
            }
          });
      });

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2;
        const updateFolder = {
          folder_name: 'updated folder folder_name'
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        }

        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .send({...updateFolder, fieldToIgnore: 'should not be in GET response'})
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/folders/${idToUpdate}`)
              .expect(expectedFolder)
          });
      });
    });
  });

 });