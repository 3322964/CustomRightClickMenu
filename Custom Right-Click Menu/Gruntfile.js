module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		copy: {
			moveWebsite: {
				files: [
					{ expand: true, cwd: 'build/website/', src: ['./**'], dest: '../' }
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');

	//Moves the website to the main directory
	grunt.registerTask('moveWebsite', ['copy']);
}