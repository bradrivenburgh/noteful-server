    // Define invalid values for caller's required properties;
    // pass this to ValidationService
    const requiredFolderDictionary = {
      folder_name: (value) => {
        if (!value) { 
          return false;
        }
      },
    };

    // Custom validation messages here
    const customInvalidPropsMessages = {
      prop: 'custom message',
    };

    module.exports = {
      requiredFolderDictionary,
      customInvalidPropsMessages
    };