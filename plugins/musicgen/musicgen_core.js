const midi = require("quick-midi");

const _test_score
	= '\\bpm{200}'
	+ '\\track{1}\\instrument{40}\\v{1}{12345671\'7654321}__'
	+ '\\track{2}\\instrument{0}\\major{E}{1,3,5}{2,4,6}{1,3,5}{7,2,4}{1,3,5}';