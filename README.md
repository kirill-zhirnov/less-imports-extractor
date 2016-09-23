# less-imports-extractor

* Extract .less files @imports recursively with content
* Considers include paths when looking for an import file

## How to use?

```java-script
var extractor = require('less-imports-extractor');

extractor.getImportsByPath('./main.less', ['./global_includes', './another/'])
.then(function(result) {
	console.log(result);
})
.catch(function(e) {
	console.log("Err:", e);
})
.done()
```

### Result:

```json
{ tree:
   { content: '@import "./less/setup";\n\nbody {\n\tbackgound: #fff;\n}@IMpORT\'bootstrap\';\n\n//  @import "ignore.less";\ndiv {\n\tsome: rule; //aaa\n}\n\n/*\n @import "ignore.less";\n @import "ignore.less";\n*/\n\n@import (optional) "optional.less";\n@import (reference, optional, reference) "otherOptional.less";\n@import \'second.less\' ;\n//end comment',
     imports: [ [Object], [Object], [Object] ],
     absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/main.less' },
  flat:
   [ { absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/main.less',
       content: '@import "./less/setup";\n\nbody {\n\tbackgound: #fff;\n}@IMpORT\'bootstrap\';\n\n//  @import "ignore.less";\ndiv {\n\tsome: rule; //aaa\n}\n\n/*\n @import "ignore.less";\n @import "ignore.less";\n*/\n\n@import (optional) "optional.less";\n@import (reference, optional, reference) "otherOptional.less";\n@import \'second.less\' ;\n//end comment' },
     { importFile: './less/setup',
       absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/less/setup.less',
       importOptions: [],
       content: '#my {\n\tcolor: green;\n}\n\n@import "anotherFW.less";\n\n.rule {\n\tfont-size: 10px;\n}' },
     { importFile: 'anotherFW.less',
       absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/another/anotherFW.less',
       importOptions: [],
       content: 'anotherFwRule {\n\ttest: b;\n}' },
     { importFile: 'bootstrap',
       absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/global_includes/bootstrap.less',
       importOptions: [],
       content: '' },
     { importFile: 'second.less',
       absolutePath: '/Users/kirillzirnov/Projects/less-imports-extractor/examples/second.less',
       importOptions: [],
       content: 'div {\n\tcolor: green;\n}' } ] }
```

## API

### getImportsByPath(lessPath, includePaths)

* lessPath - path to less file
* includePaths - an array with path where to search for an import file