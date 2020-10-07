    // Define invalid values for caller's required properties;
    // pass this to ValidationService
    const requiredFolderDictionary = {
      folderName: (value) => {
        if (!value) { 
          return false;
        }
      },
    };

    const requiredNoteDictionary = {
      noteName: (value) => {
        if (!value) { 
          return false;
        }
      },
      folderId: (value) => {
        if (!value || typeof value !== 'number') {
          return false;
        }
      },
    };

    // Custom validation messages here
    const customInvalidPropsMessages = {
      folder_id: 'Invalid property provided: folder_id -- must be a number',
    };

    module.exports = {
      requiredFolderDictionary,
      requiredNoteDictionary,
      customInvalidPropsMessages
    };