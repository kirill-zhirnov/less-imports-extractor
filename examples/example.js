var extractor = require('../index');

extractor.getImportsByPath('./main.less', ['./global_includes', './another/'])
.then(function(result) {
	console.log(result);
})
.catch(function(e) {
	console.log("Err:", e);
})
.done()