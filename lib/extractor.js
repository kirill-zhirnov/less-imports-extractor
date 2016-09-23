(function() {
  var LessImportsExtractor, Q, _, commentsRegExp, existsFile, fs, iOptions, importRegExp, optionRegExp, path, stripCssComments;

  fs = require('fs');

  Q = require('q');

  path = require('path');

  _ = require('underscore');

  stripCssComments = require('strip-css-comments');

  existsFile = require("exists-file");

  iOptions = "(?:\\(([^\\(]+)\\)\\s*)?";

  importRegExp = new RegExp("@import\\s*" + iOptions + "('|\")((?!\\2).+)\\2\\s*;", "gi");

  commentsRegExp = /\/\/.*(\n|\r|$)/gi;

  optionRegExp = /[a-z]+/ig;

  LessImportsExtractor = (function() {
    function LessImportsExtractor(filePath, includePaths) {
      this.filePath = filePath;
      this.includePaths = includePaths != null ? includePaths : [];
      if (!_.isArray(this.includePaths)) {
        this.includePaths = typeof this.includePaths === 'string ' ? [this.includePaths] : [];
      }
      this.resolveIncludePaths();
    }

    LessImportsExtractor.prototype.getImports = function() {
      var absolutePath, deferred;
      deferred = Q.defer();
      absolutePath = path.resolve(this.filePath);
      this.includePaths.push(path.dirname(absolutePath));
      this.includePaths = _.uniq(this.includePaths);
      this.extractImports(absolutePath).then((function(_this) {
        return function(tree) {
          _.extend(tree, {
            absolutePath: absolutePath
          });
          return deferred.resolve({
            tree: tree,
            flat: _this.getFlatByTree([tree])
          });
        };
      })(this))["catch"](function(e) {
        return deferred.reject(e);
      }).done();
      return deferred.promise;
    };

    LessImportsExtractor.prototype.extractImports = function(absolutePath) {
      var currentDir, deferred, out;
      out = {
        content: null,
        imports: []
      };
      deferred = Q.defer();
      currentDir = path.dirname(absolutePath);
      Q.nfcall(fs.readFile, absolutePath, {
        encoding: 'utf-8'
      }).then((function(_this) {
        return function(result) {
          var f, funcs, queue, regExpRes, strippedContent;
          out.content = result;
          funcs = [];
          strippedContent = _this.stripComments(result);
          while ((regExpRes = importRegExp.exec(strippedContent)) !== null) {
            f = (function(regExpRes) {
              return function() {
                var deferredItem, importAbsolutePath, importFile, importOptions;
                deferredItem = Q.defer();
                importFile = regExpRes[3];
                importAbsolutePath = null;
                importOptions = regExpRes[1] ? _this.parseImportOptions(regExpRes[1]) : [];
                _this.findImportFile(importFile, currentDir).then(function(result) {
                  importAbsolutePath = result;
                  if (result) {
                    return _this.extractImports(importAbsolutePath);
                  } else if (_.indexOf(importOptions, 'optional') === -1) {
                    return Q.reject("Import file '" + importFile + "' not found in file " + absolutePath);
                  }
                }).then(function(result) {
                  if (result) {
                    out.imports.push(_.extend(result, {
                      importFile: importFile,
                      absolutePath: importAbsolutePath,
                      importOptions: importOptions
                    }));
                  }
                  return deferredItem.resolve();
                })["catch"](function(e) {
                  return deferredItem.reject(e);
                }).done();
                return deferredItem.promise;
              };
            })(regExpRes);
            funcs.push(f);
          }
          queue = Q();
          funcs.forEach(function(f) {
            return queue = queue.then(f);
          });
          return queue;
        };
      })(this)).then((function(_this) {
        return function() {
          return deferred.resolve(out);
        };
      })(this))["catch"]((function(_this) {
        return function(e) {
          return deferred.reject(e);
        };
      })(this)).done();
      return deferred.promise;
    };

    LessImportsExtractor.prototype.findImportFile = function(importFile, currentDir) {
      var deferred, ext;
      deferred = Q.defer();
      ext = path.extname(importFile);
      if (!ext) {
        importFile += ".less";
      }
      Q().then((function(_this) {
        return function() {
          if (/^\./.test(importFile)) {
            return path.resolve(currentDir, importFile);
          } else {
            return _this.findFileInIncludePaths(importFile);
          }
        };
      })(this)).then(function(absolutePath) {
        return deferred.resolve(absolutePath);
      })["catch"](function(e) {
        return deferred.reject(e);
      }).done();
      return deferred.promise;
    };

    LessImportsExtractor.prototype.findFileInIncludePaths = function(fileName) {
      var deferred, f, funcs, i, includePath, len, queue, ref;
      deferred = Q.defer();
      funcs = [];
      ref = this.includePaths;
      for (i = 0, len = ref.length; i < len; i++) {
        includePath = ref[i];
        f = (function(_this) {
          return function(includePath) {
            return function(found) {
              var absolutePath, deferredItem;
              if (found) {
                return found;
              }
              deferredItem = Q.defer();
              absolutePath = path.resolve(includePath, fileName);
              Q.nfcall(existsFile, absolutePath).then(function(result) {
                if (result) {
                  return deferredItem.resolve(absolutePath);
                } else {
                  return deferredItem.resolve(found);
                }
              })["catch"](function(e) {
                return deferredItem.reject(e);
              }).done();
              return deferredItem.promise;
            };
          };
        })(this)(includePath);
        funcs.push(f);
      }
      queue = Q(false);
      funcs.forEach(function(f) {
        return queue = queue.then(f);
      });
      queue.then((function(_this) {
        return function(result) {
          return deferred.resolve(result);
        };
      })(this))["catch"](function(e) {
        return deferred.reject(e);
      }).done();
      return deferred.promise;
    };

    LessImportsExtractor.prototype.getFlatByTree = function(imports) {
      var i, item, len, out;
      out = [];
      for (i = 0, len = imports.length; i < len; i++) {
        item = imports[i];
        out.push(_.pick(item, ['importFile', 'absolutePath', 'importOptions', 'content']));
        if (_.size(item.imports) > 0) {
          out = out.concat(this.getFlatByTree(item.imports));
        }
      }
      return out;
    };

    LessImportsExtractor.prototype.parseImportOptions = function(optionsStr) {
      var options, regExpRes;
      options = [];
      while ((regExpRes = optionRegExp.exec(optionsStr)) !== null) {
        options.push(regExpRes[0]);
      }
      return options;
    };

    LessImportsExtractor.prototype.resolveIncludePaths = function() {
      var i, key, len, ref, results, val;
      ref = this.includePaths;
      results = [];
      for (key = i = 0, len = ref.length; i < len; key = ++i) {
        val = ref[key];
        results.push(this.includePaths[key] = path.resolve(val));
      }
      return results;
    };

    LessImportsExtractor.prototype.stripComments = function(content) {
      content = stripCssComments(content, {
        preserve: false
      });
      content = content.replace(commentsRegExp, '');
      return content;
    };

    return LessImportsExtractor;

  })();

  module.exports = LessImportsExtractor;

}).call(this);
