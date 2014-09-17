test:
		@node node_modules/lab/bin/lab -t 100 -m 20000
test-no-cov:
		@node node_modules/lab/bin/lab
test-cov-html:
		@node node_modules/lab/bin/lab -r html -o coverage.html
complexity:
		@node node_modules/complexity-report/src/index.js -o complexity.md -f markdown index.js

.PHONY: test test-no-cov test-cov-html complexity
