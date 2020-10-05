const path = require('path');
const express = require('express');
const xss = require('xss');
const NotesService = require('./notes-service');
const { logger } = require('../logger');
const { ValidationService } = require('../ValidationService');
const { requiredNoteDictionary, customInvalidPropsMessages } = require("../callerValidationData");

const notesRouter = express.Router();
const knex = (req) => req.app.get('db');
const serializeNote = (note) => ({
  id: note.id,
  modified: note.modified,
  note_name: xss(note.note_name),
  content: xss(note.content),
  folder_id: note.folder_id
});

notesRouter
  .route('/notes')
  .get((req, res, next) => {
    NotesService.getAllNotes(knex(req))
      .then(notes => {
        res
          .status(200)
          .json(notes.map(serializeNote))
      })
      .catch(next);
  });

notesRouter
  .route('/notes')
  .post((req, res, next) => {
    const { note_name, content, folder_id } = req.body;
    const newNote = { note_name, content, folder_id };

    // VALIDATE
    const missingAndInvalidProps = ValidationService.validateProperties(
      req.body, 
      requiredNoteDictionary
    );
    
    if (
      missingAndInvalidProps.invalidProps.length ||
      missingAndInvalidProps.missingProps.length
    ) {
      const validationErrorObj = ValidationService.createValidationErrorObject(
        missingAndInvalidProps,
        customInvalidPropsMessages
      );
      logger.error(validationErrorObj.error.message);
      return res.status(400).json(validationErrorObj);
    }

    NotesService.insertNote(knex(req), newNote)
      .then(note => {
        logger.info(`Note with the id ${note.id} created`);
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note))
      })
      .catch(next);
  });

  notesRouter
    .route('/notes/:note_id')
    .all((req, res, next) => {
      const noteId = req.params.note_id;
      NotesService.getById(knex(req), noteId)
        .then(note => {
          if (!note) {
            return res.status(404).json({
              error: { message: 'Note does not exist' }
            });
          }
          res.note = note;
          next();
        })
        .catch(next)
    });

  notesRouter
    .route('/notes/:note_id')
    .get((req, res, next) => {
      res.json(serializeNote(res.note));
    });

  notesRouter
    .route('/notes/:note_id')
    .delete((req, res, next) => {
        const noteId = req.params.note_id;
        NotesService.deleteNote(knex(req), noteId)
          .then(() => {
            res
              .status(204)
              .end()
          })
          .catch(next);
    });

  notesRouter
    .route('/notes/:note_id')
    .patch((req, res, next) => {
      const { note_name, content, folder_id } = req.body;
      const { note_id } = req.params;
      const noteToUpdate = { note_name, content, folder_id };

      // Check if required prop is being updated
      const numOfRequiredValues = 
        Object.values(noteToUpdate).filter(Boolean).length;
      if (numOfRequiredValues === 0) {
        res.status(400).json({
          error: {
            message: 'Request body must contain either: note_name, content, or folder_id' 
          }
        });
      }

      // If validation passes:
      NotesService.updateNote(
        knex(req), 
        note_id, 
        noteToUpdate
        )
        .then( () => {
          res
            .status(204)
            .end()
        })
    });

  module.exports = notesRouter;