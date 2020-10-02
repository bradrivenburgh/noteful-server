const NotesService = {
  getAllNotes(knex) {
    return knex
      .select('*')
      .from('noteful_notes');
  },
  insertFolder(knex, newNote) {
    return knex
      .insert(newNote)
      .into('noteful_notes')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  getById(knex, id) {
    return knex
      .select('*')
      .from('noteful_notes')
      .where({ id })
      .first();
  },
  deleteFolder(knex, id) {
    return knex
      .select('*')
      .from('noteful_notes')
      .where({ id })
      .delete();
  },
  updateFolder(knex, id, newNoteData) {
    return knex
      .select('*')
      .from('noteful_notes')
      .where({ id })
      .update(newNoteData)
  }
};

module.exports = NotesService;