const FoldersService = {
  getAllFolders(knex) {
    return knex
      .select('*')
      .from('noteful_folders');
  },
  insertFolder(knex, newFolder) {
    return knex
      .insert(newFolder)
      .into('noteful_folders')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex
      .select('*')
      .from('noteful_folders')
      .where({ id })
      .first();
  },
  deleteFolder(knex, id) {
    return knex
      .select('*')
      .from('noteful_folders')
      .where({ id })
      .delete();
  },
  updateFolder(knex, id, newFolderData) {
    return knex
      .select('*')
      .from('noteful_folders')
      .where({ id })
      .update(newFolderData)
  }
};

module.exports = FoldersService;