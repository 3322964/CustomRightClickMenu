module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		copy: {
			build: {
				files: [
					{ expand: true, cwd: 'Custom Right-Click Menu/app/build/website/', src: ['./**'], dest: './' }
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');

	//Moves the website to the main directory
	grunt.registerTask('moveWebsite', ['copy']);
}