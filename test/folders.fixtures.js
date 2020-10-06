const xss = require('xss');

function makeFoldersArray() {
  return [
    {
      id: 1,
      folder_name: 'First test folder!',
    },
    {
      id: 2,
      folder_name: 'Second test folder!',
    },
    {
      id: 3,
      folder_name: 'Third test folder!',
    },
    {
      id: 4,
      folder_name: 'Fourth test folder!',
    },
    {
      id: 5,
      folder_name: 'Fifth test folder!',
    },
  ];
}

const serializeFolder = (folder) => ({
  id: folder.id,
  folderName: xss(folder.folder_name)
});


function makeMaliciousFolder() {
  const maliciousFolder = {
    id: 911,
    folder_name: 'Naughty naughty very naughty <script>alert("xss");</script>',
  }
  const expectedFolder = {
    ...maliciousFolder,
    folderName: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
  }
  return {
    maliciousFolder,
    expectedFolder,
  }
}

module.exports = {
  makeFoldersArray,
  makeMaliciousFolder,
  serializeFolder
}