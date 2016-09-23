fs = require 'fs'
Q = require 'q'
path = require 'path'
_ = require 'underscore'
stripCssComments = require('strip-css-comments')
existsFile = require("exists-file")

iOptions = "(?:\\(([^\\(]+)\\)\\s*)?"
importRegExp = new RegExp("@import\\s*#{iOptions}('|\")((?!\\2).+)\\2\\s*;", "gi")
commentsRegExp = /\/\/.*(\n|\r|$)/gi
optionRegExp = /[a-z]+/ig

class LessImportsExtractor
	constructor : (@filePath, @includePaths = []) ->
		if !_.isArray(@includePaths)
			@includePaths = if typeof(@includePaths) == 'string ' then [@includePaths] else []

		@resolveIncludePaths()

	getImports : () ->
		deferred = Q.defer()

		absolutePath = path.resolve @filePath
		@includePaths.push path.dirname(absolutePath)

		@includePaths = _.uniq @includePaths

		@extractImports absolutePath
		.then (tree) =>
			_.extend tree, {
				absolutePath : absolutePath
			}

			deferred.resolve {
				tree : tree
				flat : @getFlatByTree [tree]
			}
		.catch (e) ->
			deferred.reject e
		.done()

		return deferred.promise

	extractImports : (absolutePath) ->
		out = content : null, imports : []

		deferred = Q.defer()
		currentDir = path.dirname absolutePath

		Q.nfcall fs.readFile, absolutePath, {encoding : 'utf-8'}
		.then (result) =>
			out.content = result

			funcs = []
			strippedContent = @stripComments result
			while ((regExpRes = importRegExp.exec(strippedContent)) isnt null)
				f = do (regExpRes) =>
					return () =>
						deferredItem = Q.defer()

						importFile = regExpRes[3]
						importAbsolutePath = null
						importOptions = if regExpRes[1] then @parseImportOptions(regExpRes[1]) else []

						@findImportFile importFile, currentDir
						.then (result) =>
							importAbsolutePath = result

							if result
								return @extractImports importAbsolutePath
							else if _.indexOf(importOptions, 'optional') == -1
								return Q.reject("Import file '#{importFile}' not found in file #{absolutePath}")

						.then (result) =>
							if result
								out.imports.push _.extend(result, {
									importFile : importFile
									absolutePath : importAbsolutePath
									importOptions : importOptions
								})

							deferredItem.resolve()
						.catch (e) ->
							deferredItem.reject e
						.done()

						return deferredItem.promise

				funcs.push f

			queue = Q()
			funcs.forEach (f) ->
				queue = queue.then(f)

			return queue
		.then () =>
			deferred.resolve out
		.catch (e) =>
			deferred.reject e
		.done()
		
		return deferred.promise

	findImportFile : (importFile, currentDir) ->
		deferred = Q.defer()

		ext = path.extname importFile
		if !ext
			importFile += ".less"

		Q()
		.then () =>
			if /^\./.test(importFile)
				return path.resolve currentDir, importFile
			else
				return @findFileInIncludePaths importFile
		.then (absolutePath) ->
			deferred.resolve absolutePath
		.catch (e) ->
			deferred.reject e
		.done()

		return deferred.promise
	
	findFileInIncludePaths : (fileName) ->
		deferred = Q.defer()

		funcs = []
		for includePath in @includePaths
			f = do (includePath) =>
				return (found) =>					
					if found
						return found

					deferredItem = Q.defer()

					absolutePath = path.resolve(includePath, fileName)
					Q.nfcall existsFile, absolutePath
					.then (result) =>
						if result
							deferredItem.resolve absolutePath
						else
							deferredItem.resolve found
					.catch (e) =>
						deferredItem.reject e
					.done()

					return deferredItem.promise

			funcs.push f

		queue = Q(false)
		funcs.forEach (f) ->
			queue = queue.then(f)

		queue
		.then (result) =>
			deferred.resolve result
		.catch (e) ->
			deferred.reject e
		.done()

		return deferred.promise

	getFlatByTree : (imports) ->
		out = []

		for item in imports
			out.push _.pick(item, ['importFile', 'absolutePath', 'importOptions', 'content'])

			if _.size(item.imports) > 0
				out = out.concat @getFlatByTree item.imports

		return out

	parseImportOptions : (optionsStr) ->
		options = []
		while ((regExpRes = optionRegExp.exec(optionsStr)) isnt null)
			options.push regExpRes[0]

		return options

	resolveIncludePaths : ->
		for val, key in @includePaths
			@includePaths[key] = path.resolve val

	stripComments : (content) ->
		content = stripCssComments content, {preserve: false}
		content = content.replace commentsRegExp, ''

		return content

module.exports = LessImportsExtractor