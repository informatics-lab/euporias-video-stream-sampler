'use strict';

var gulp            = require('gulp'),
    source          = require('vinyl-source-stream'),
    rename          = require('gulp-rename'),
    browserify      = require('browserify'),
    glob            = require('glob'),
    es              = require('event-stream'),
    del             = require('del'),
    htmlmin         = require('gulp-htmlmin'),
    sass            = require('gulp-sass'),
    sourcemaps      = require('gulp-sourcemaps'),
    buffer          = require('vinyl-buffer'),
    uglify          = require('gulp-uglify'),
    browserSync     = require('browser-sync').create();

const BUILD_DEST = "./build";


//CLEAN
gulp.task('clean', ['clean:html', 'clean:js', 'clean:css']);

gulp.task('clean:html', function () {
    return del([BUILD_DEST + "/*.html"]);
});

gulp.task('clean:js', function () {
    return del([BUILD_DEST + "/js"]);
});

gulp.task('clean:css', function () {
    return del([BUILD_DEST + "/css"]);
});


//BUILD
gulp.task('build:html', function () {
    return gulp.src('./src/html/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest(BUILD_DEST));
});

/*browserify and merge multiple js files together. See 
https://fettblog.eu/gulp-browserify-multiple-bundles/ */
gulp.task('build:js', function(done) {
    glob('./src/js/**.js', function(err, files) {
        if(err) done(err);

        var tasks = files.map(function(entry) {
            return browserify({ entries: [entry] })
                .bundle()
                .pipe(source(entry))
                .pipe(rename({
                    dirname : './',
                    extname : '.min.js'
                }))
                .pipe(buffer())
                .pipe(sourcemaps.init({loadMaps: true}))
                // Add transformation tasks to the pipeline here.
                .pipe(uglify())       //minify
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest(BUILD_DEST+'/js/'));
            });
        es.merge(tasks).on('end', done);
    })
});

/*gulp.task('build:js', function () {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './src/js/main.js'
    });

    return b.bundle()
        .pipe(source('app.min.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())       //minify
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(BUILD_DEST+'/js/'));
});*/

gulp.task('build:css', function () {
    return gulp.src('./src/sass/*')
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(gulp.dest(BUILD_DEST + '/css'));
});

gulp.task('build:images', function () {
    return gulp.src('./src/images/*')
        .pipe(gulp.dest(BUILD_DEST + '/images'));
});

gulp.task('build', ['build:html', 'build:css', 'build:js', 'build:images']);


//SERVE
gulp.task('serve', ['clean', 'build', 'watch'], function() {
    browserSync.init({
        server: {
            baseDir: BUILD_DEST
        }
    });
});


//WATCH
gulp.task('watch:css', function() {
    gulp.watch('./src/sass/**/*', ['clean:css', 'build:css']).on('change', browserSync.reload);
});
gulp.task('watch:js', function() {
    gulp.watch('./src/js/**/*', ['clean:js', 'build:js']).on('change', browserSync.reload);
});
gulp.task('watch:html', function() {
    gulp.watch('./src/html/**/*', ['clean:html', 'build:html']).on('change', browserSync.reload);
});
gulp.task('watch', ['watch:html', 'watch:css', 'watch:js']);



//DEFAULT
gulp.task('default', function () {
    console.log('Useage is as follows with one or more of the configured tasks:\n' +
        '$ gulp <task> [<task2> ...] \n' +
        'available options:\n' +
        '\t* clean - cleans the built project\n' +
        '\t\t-clean:html - cleans just the html\n' +
        '\t\t-clean:css - cleans just the css\n' +
        '\t\t-clean:js - cleans just the js\n' +
        '\t* build - build the entire project\n' +
        '\t\t-build:html - builds just the html\n' +
        '\t\t-build:css - builds just the css\n' +
        '\t\t-build:js - builds just the js\n' +
        '\t* serve - cleans, builds and serves the project watching for any changes\n');
});
