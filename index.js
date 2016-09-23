var Extractor = require('./lib/extractor');

module.exports.getImportsByPath = function(filePath, includePaths) {
    var extractorInstance = new Extractor(filePath, includePaths);

    return extractorInstance.getImports();
};
