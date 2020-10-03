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

  module.exports = foldersRouter;