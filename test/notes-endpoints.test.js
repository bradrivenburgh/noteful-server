const knex = require('knex');
const app = require('../src/app');
const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

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


  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, []);
      });
    });

    context(`Given there are notes in the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          })
      });

      context(`Given an XSS attack note`, () => {
        const { maliciousNote, expectedNote } = makeMaliciousNote();

        beforeEach("insert malicious note", () => {
          return db.into("noteful_notes").insert([maliciousNote]);
        });

        it("removes XSS attack content", () => {
          return supertest(app)
            .get(`/api/notes`)
            .expect(200)
            .expect((res) => {
              const insertedNote = res.body[res.body.length - 1];
              expect(insertedNote.note_name).to.eql(expectedNote.note_name);
              expect(insertedNote.content).to.eql(expectedNote.content);
            });
        });
      });
      
      it(`responds with 200 and all of the notes`, () => {
        return supertest(app)
          .get('/api/notes')
          .expect(200, testNotes)
      });
    });
  
  });

  describe(`GET /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .expect(404, { error: {  message: `Note does not exist` } });
      });
    });

    context(`Given there are notes in the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes= makeNotesArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          })
      });

      context(`Given an XSS attack note`, () => {
        const { maliciousNote, expectedNote } = makeMaliciousNote();

        beforeEach("insert malicious note", () => {
          return db.into("noteful_notes").insert([maliciousNote]);
        });

        it("removes XSS attack content", () => {
          return supertest(app)
            .get(`/api/notes/${maliciousNote.id}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.note_name).to.eql(expectedNote.note_name);
              expect(res.body.content).to.eql(expectedNote.content);
            });
        });
      });

      it(`responds with 200 and the specified note`, () => {
        const note_id = 1;
        const expectedNote = testNotes[note_id - 1]
        return supertest(app)
          .get(`/api/notes/${note_id}`)
          .expect(200, expectedNote)
      });
    });
  });

  describe('POST /api/notes', () => {
    const testFolders = makeFoldersArray();

    beforeEach('insert folders', () => {
      return db
        .into('noteful_folders')
        .insert(testFolders)
    });

    it('creates a note, responding with 201 and the new note', function () {
      this.retries(3);

      const newNote = {
        note_name: 'Test new note',
        content: 'Test new content',
        folder_id: 1
      };

      return supertest(app)
      .post('/api/notes')
      .send(newNote)
      .expect(201)
      .expect(res => {
        expect(res.body.note_name).to.eql(newNote.note_name);
        expect(res.body.content).to.eql(newNote.content);
        expect(res.body.folder_id).to.eql(newNote.folder_id);
        expect(res.body).to.have.property('id');
        expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);

        const expectedDate = new Date().toLocaleString();
        const actualDate = new Date(res.body.modified).toLocaleString();
        expect(actualDate).to.eql(expectedDate);
      })
      .then(postRes => {
        return supertest(app)
          .get(`/api/notes/${postRes.body.id}`)
          .expect(postRes.body)
      });
    });

    const requiredFields = ['note_name', 'content', 'folder_id'];
    requiredFields.forEach(field => {
      const newNote = {
        note_name: 'New test folder',
        content: 'New test content',
        folder_id: 1
      };
  
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newNote[field];

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(400, {
            error: { message: `Required properties are missing: ${field}` }
          });
      });
    });

    context(`Given an XSS attack note`, () => {
      const { maliciousNote, expectedNote } = makeMaliciousNote();

      it('removes XSS attack content', () => {
        return supertest(app)
          .post(`/api/notes`)
          .send(maliciousNote)
          .expect(201)
          .expect((res) => {
            expect(res.body.note_name).to.eql(expectedNote.note_name);
            expect(res.body.content).to.eql(expectedNote.content);
          });
      });
    });
  });

  describe('DELETE /api/notes/:notes_id', () => {
    context('given no notes in the database', () => {
      it('responds with 404', () => {
        const notesId = 123456;
        return supertest(app)
          .delete(`/api/notes/${notesId}`)
          .expect(404, { error: { message: `Note does not exist` } })
      });
    })

    context('given the are notes in the database', () => {
      const testFolders = makeFoldersArray();
      const testNotes= makeNotesArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          })
      });

      it('responds with 204 and removes the folder', () => {
        const idToRemove = 2;
        const expectedNotes = testNotes
          .filter(folder => folder.id !== idToRemove);
        return supertest(app)
          .delete(`/api/notes/${idToRemove}`)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get('/api/notes')
              .expect(expectedNotes)
          });
      });
    });
  });

  describe('PATCH /api/notes/:note_id', () => {
    context('Given no notes', () => {
      it('responds with 404', () => {
        const noteId = 123456;
        return supertest(app)
          .patch(`/api/notes/${noteId}`)
          .expect(404, { error: { message: `Note does not exist` } })
      });
    });

    context('Given there are notes in the database', () => {
      const testFolders = makeFoldersArray();
      const testNotes= makeNotesArray();

      beforeEach('insert folders and notes', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
          .then(() => {
            return db
              .into('noteful_notes')
              .insert(testNotes);
          })
      });

      it('responds with 204 and updates the folder', () => {
        const idToUpdate = 2;
        const updateNote = {
          note_name: 'updated note_name',
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send(updateNote)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          });
      });

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: 'Request body must contain either: note_name, content, or folder_id'
            }
          });
      });

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2;
        const updateNote = {
          note_name: 'updated note_name'
        };
        const expectedNote = {
          ...testNotes[idToUpdate - 1],
          ...updateNote
        }

        return supertest(app)
          .patch(`/api/notes/${idToUpdate}`)
          .send({...updateNote, fieldToIgnore: 'should not be in GET response'})
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/notes/${idToUpdate}`)
              .expect(expectedNote)
          });
      });
    });
  });

 });