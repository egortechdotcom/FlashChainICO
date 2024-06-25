module.exports = {
	plugins: ["prettier-plugin-solidity"],
	tabWidth: 4,
	overrides: [
		{
			files: "*.sol",
			options: {
				tabWidth: 4,
				printWidth: 80,
				bracketSpacing: true,
				compiler: "0.8.25",
			},
		},
	],
};
