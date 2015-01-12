mocha 		= ./node_modules/.bin/mocha
jshint		= ./node_modules/.bin/jshint
linelint 	= ./node_modules/.bin/linelint
lintspaces 	= ./node_modules/.bin/lintspaces

srcFiles = $(shell find ./lib -type f -name '*.js' | xargs)

.PHONY : test

default: format

test:format
	$(mocha) -R spec ./test/*.js

format:
	$(linelint) $(srcFiles)
	$(lintspaces) -nt -i js-comments -d spaces -s 2 $(srcFiles)
	$(jshint) $(srcFiles)
	@echo "\nAll formatting checks passed!\n"