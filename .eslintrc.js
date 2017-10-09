module.exports = {
	root: true,
	extends: [
		'airbnb-base',
	],
	env: {
		node: true,
	},
	parser: 'babel-eslint',
	parserOptions: {
		ecmaVersion: 2017,
		sourceType: 'module',
	},
	rules: {
		indent: ['error', 'tab'],
		'no-await-in-loop': 'off',
		'no-continue': 'off',
		'no-console': 'off',
		'no-tabs': 'off',
		'no-restricted-syntax': 'off',
	},
};
