# less-imports-extractor

* Extract .less files @imports recursively with content
* Considers include paths when looking for an import file

## How to use?

```javascript
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

```
{
    tree : {
        content: 'file content',
        imports: [ [Object], [Object], [Object] ],
        absolutePath: '/absolute/path.less'
    },

    flat: [
        {
            absolutePath: '/absolute/path.less',
            content: 'less file content'
        },
        {
            importFile : 'path.less',
            importOptions : [],
            absolutePath: '/absolute/path.less',
            content: 'less file content'
        }
    ]
}
```

## API

### getImportsByPath(lessPath, includePaths)

* lessPath - path to less file
* includePaths - an array with path where to search for an import file