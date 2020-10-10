const knex = require('knex');
const app = require('../src/app');
const { 
  makeNotesArray, 
  makeMaliciousNote,
  camelCaseKeys
} = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');

describe('Notes Endpoints', function () {
  let db;

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    });

    app.set('db', db);
  });

  before('clean the table', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));
  
  afterEach('cleanup', () => db.raw('TRUNCATE noteful_folders, noteful_notes RESTART IDENTITY CASCADE'));

  after('disconnect from db', () => db.destroy());


  describe(`GET /api/noteful/notes`, () => {
    context(`Given no notes`, () => {
      it('responds with 200 and an empty list', () => {
        return supertest(app)
          .get('/api/noteful/notes')
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
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
            .get(`/api/noteful/notes`)
            .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect((res) => {
              const insertedNote = res.body[res.body.length - 1];
              expect(insertedNote.noteName).to.eql(expectedNote.noteName);
              expect(insertedNote.content).to.eql(expectedNote.content);
            });
        });
      });
      
      it(`responds with 200 and all of the notes`, () => {
        return supertest(app)
          .get('/api/noteful/notes')
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testNotes.map(camelCaseKeys))
      });
    });
  
  });

  describe(`GET /api/noteful/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it(`responds with 404`, () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/noteful/notes/${noteId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
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
            .get(`/api/noteful/notes/${maliciousNote.id}`)
            .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect((res) => {
              expect(res.body.noteName).to.eql(expectedNote.noteName);
              expect(res.body.content).to.eql(expectedNote.content);
            });
        });
      });

      it(`responds with 200 and the specified note`, () => {
        const noteId = 1;
        const expectedNote = camelCaseKeys(testNotes[noteId - 1]);
        return supertest(app)
          .get(`/api/noteful/notes/${noteId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedNote)
      });
    });
  });

  describe('POST /api/noteful/notes', () => {
    const testFolders = makeFoldersArray();

    beforeEach('insert folders', () => {
      return db
        .into('noteful_folders')
        .insert(testFolders)
    });

    it('creates a note, responding with 201 and the new note', function () {
      this.retries(3);

      const newNote = {
        noteName: 'Test new note',
        content: 'Test new content',
        folderId: 1
      };

      return supertest(app)
      .post('/api/noteful/notes')
      .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
      .send(newNote)
      .expect(201)
      .expect(res => {
        expect(res.body.noteName).to.eql(newNote.noteName);
        expect(res.body.content).to.eql(newNote.content);
        expect(res.body.folderId).to.eql(newNote.folderId);
        expect(res.body).to.have.property('id');
        expect(res.headers.location).to.eql(`/api/noteful/notes/${res.body.id}`);

        const expectedDate = new Date().toLocaleString();
        const actualDate = new Date(res.body.modified).toLocaleString();
        expect(actualDate).to.eql(expectedDate);
      })
      .then(postRes => {
        return supertest(app)
          .get(`/api/noteful/notes/${postRes.body.id}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(postRes.body)
      });
    });

    const requiredFields = ['noteName', 'folderId'];
    requiredFields.forEach(field => {
      const newNote = {
        noteName: 'New test folder',
        content: 'New test content',
        folderId: 1
      };
  
      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newNote[field];

        return supertest(app)
          .post('/api/noteful/notes')
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(newNote)
          .expect(400, {
            error: { message: `Required properties are missing: ${field}` }
          });
      });
    });

    context(`Given an XSS attack note`, () => {
      let { maliciousNote, expectedNote } = makeMaliciousNote();
      maliciousNote = camelCaseKeys(maliciousNote);

      it('removes XSS attack content', () => {
        return supertest(app)
          .post(`/api/noteful/notes`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(maliciousNote)
          .expect(201)
          .expect((res) => {
            expect(res.body.noteName).to.eql(expectedNote.noteName);
            expect(res.body.content).to.eql(expectedNote.content);
          });
      });
    });
  });

  describe('DELETE /api/noteful/notes/:notes_id', () => {
    context('given no notes in the database', () => {
      it('responds with 404', () => {
        const notesId = 123456;
        return supertest(app)
          .delete(`/api/noteful/notes/${notesId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
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

      it('responds with 204 and removes the note', () => {
        const idToRemove = 2;
        const serializedTestNotes = testNotes.map(camelCaseKeys);
        const expectedNotes = serializedTestNotes
          .filter(note => note.id !== idToRemove);
        return supertest(app)
          .delete(`/api/noteful/notes/${idToRemove}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get('/api/noteful/notes')
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedNotes)
          });
      });
    });
  });

  describe('PATCH /api/noteful/notes/:note_id', () => {
    context('Given no notes', () => {
      it('responds with 404', () => {
        const noteId = 123456;
        return supertest(app)
          .patch(`/api/noteful/notes/${noteId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
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
          noteName: 'updated noteName',
          content: 'updated content'
        };
        const serializedTestNote = camelCaseKeys(testNotes[idToUpdate - 1]);
        const expectedNote = {
          ...serializedTestNote,
          ...updateNote
        };

        return supertest(app)
          .patch(`/api/noteful/notes/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(updateNote)
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/noteful/notes/${idToUpdate}`)
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedNote)
          });
      });

      it('responds with 400 when no required fields supplied', () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/noteful/notes/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: 'Request body must contain either: noteName or folderId'
            }
          });
      });

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2;
        const updateNote = {
          noteName: 'updated note_name'
        };
        const serializedTestNote = camelCaseKeys(testNotes[idToUpdate - 1]);
        const expectedNote = {
          ...serializedTestNote,
          ...updateNote
        };

        return supertest(app)
          .patch(`/api/noteful/notes/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send({...updateNote, fieldToIgnore: 'should not be in GET response'})
          .expect(204)
          .then(res => {
            return supertest(app)
              .get(`/api/noteful/notes/${idToUpdate}`)
              .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedNote)
          });
      });
    });
  });

 });