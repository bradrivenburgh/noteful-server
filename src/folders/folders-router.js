const path = require('path');
const express = require('express');
const xss = require('xss');
const FoldersService = require('./folders-service');
const { logger } = require('../logger');
const { ValidationService } = require('../ValidationService');
const { requiredFolderDictionary } = require("../callerValidationData");

const foldersRouter = express.Router();
const knex = (req) => req.app.get('db');
const serializeFolder = (folder) => ({
  id: folder.id,
  folder_name: xss(folder.folder_name)
});

foldersRouter
  .route('/folders')
  .get((req, res, next) => {
    FoldersService.getAllFolders(knex(req))
      .then(folders => {
        res
          .status(200)
          .json(folders.map(serializeFolder))
      })
      .catch(next);
  });

foldersRouter
  .route('/folders')
  .post((req, res, next) => {
    const { folder_name } = req.body;
    const newFolder = { folder_name };

    // VALIDATE
    const missingAndInvalidProps = ValidationService.validateProperties(
      req.body, 
      requiredFolderDictionary
    );
    
    if (
      missingAndInvalidProps.invalidProps.length ||
      missingAndInvalidProps.missingProps.length
    ) {
      const validationErrorObj = ValidationService.createValidationErrorObject(
        missingAndInvalidProps
      );
      logger.error(validationErrorObj.error.message);
      return res.status(400).json(validationErrorObj);
    }

    FoldersService.insertFolder(knex(req), newFolder)
      .then(folder => {
        logger.info(`Folder with the id ${folder.id} created`);
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder))
      })
      .catch(next);
  });

  foldersRouter
    .route('/folders/:folder_id')
    .all((req, res, next) => {
      const folderId = req.params.folder_id;
      FoldersService.getById(knex(req), folderId)
        .then(folder => {
          if (!folder) {
            return res.status(404).json({
              error: { message: 'Folder does not exist' }
            });
          }
          res.folder = folder;
          next();
        })
        .catch(next)
    });

  foldersRouter
    .route('/folders/:folder_id')
    .get((req, res, next) => {
      res.json(serializeFolder(res.folder));
    });

  foldersRouter
    .route('/folders/:folder_id')
    .delete((req, res, next) => {
        const folderId = req.params.folder_id;
        FoldersService.deleteFolder(knex(req), folderId)
          .then(() => {
            res
              .status(204)
              .end()
          })
          .catch(next);
    });

  foldersRouter
    .route('/folders/:folder_id')
    .patch((req, res, next) => {
      const { folder_name } = req.body;
      const { folder_id } = req.params;
      const folderToUpdate = { folder_name };

      // Check if required prop is being updated
      const numOfRequiredValues = 
        Object.values(folderToUpdate).filter(Boolean).length;
      if (numOfRequiredValues === 0) {
        return res.status(400).json({
          error: {
            message: 'Request body must contain: folder_name' 
          }
        });
      }

      // If validation passes:
      FoldersService.updateFolder(
        knex(req), 
        folder_id, 
        folderToUpdate
        )
        .then( () => {
          res
            .status(204)
            .end()
        })
    });

  module.exports = foldersRouter;