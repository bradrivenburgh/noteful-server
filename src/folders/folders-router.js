const path = require('path');
const express = require('express');
const xss = require('xss');
const FoldersService = require('./folders-service');

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

  module.exports = foldersRouter;