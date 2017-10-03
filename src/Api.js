let Verify           = require('./Verify');
let CopyFilesTask    = require('./tasks/CopyFilesTask');
let ConcatFilesTask  = require('./tasks/ConcatenateFilesTask');
let VersionFilesTask = require('./tasks/VersionFilesTask');
let glob             = require('glob');
let _                = require('lodash');

class Api {

    generatePot(options) {

        let wpPot = require('wp-pot');

        options = Object.assign({
            //package        : 'ultimate-page-builder',
            //bugReport      : 'https://github.com/EmranAhmed/ultimate-page-builder/issues',
            lastTranslator : 'Emran Ahmed <emran.bd.08@gmail.com>',
            team           : 'ThemeHippo <themehippo@gmail.com>',
            src            : '*.php',
            //domain         : 'ultimate-page-builder',
            //destFile       : `languages/ultimate-page-builder.pot`
        }, options);

        wpPot(options);

        return this;
    }

    setAssetPath(path) {
        Config.assetPublicPath = path;

        return this;
    }

    notification(options = {}) {
        options = Object.assign({
            title        : 'WP Mix',
            alwaysNotify : Mix.isUsing('notificationsOnSuccess'),
            contentImage : Mix.paths.root('node_modules/wp-mix/icons/wp.png')
        }, options);

        Config.notificationConfig = options;
        return this;
    }

    setCommonChunkFileName(name) {
        Config.commonChunkFileName = name;

        return this;
    }

    postCssBrowsers(browsers) {
        Config.postCssBrowsers = browsers;
        return this;
    }

    banner(options) {
        options             = Object.assign({}, Config.bannerConfig, options);
        Config.bannerConfig = options;
        Config.bannerPlugin = true;
        return this;
    }

    gzCompression(options = {}) {
        // see https://github.com/webpack-contrib/compression-webpack-plugin
        // see https://browse-tutorials.com/tutorial/serve-static-gzip-webpack-and-nginx
        options                    = Object.assign({}, {
            asset     : "[path].gz[query]",
            algorithm : "gzip",
            test      : /\.(js|css|ttf|svg|eot)$/,
            threshold : 10240,
            minRatio  : 0.8
        }, options);
        Config.gzCompressionConfig = options;
        Config.gzCompression       = true;
        return this;
    }

    modernizr(options) {
        // see https://www.npmjs.com/package/modernizr-webpack-plugin for more config.
        Config.modernizrConfig = options;
        Config.modernizr       = true;
        return this;
    }

    imageLoaderOptions(options) {
        // see https://www.npmjs.com/package/img-loader
        options                 = Object.assign({}, Config.imgLoaderOptions, options);
        Config.imgLoaderOptions = options;

        return this;
    }

    // Sass Resource Loader
    sassAutoload(files = []) {
        files                = Object.assign([], Config.sassResources, files);
        Config.sassResources = files;
        return this;
    }

    scssAutoload(files = []) {
        return this.sassAutoload(files);
    }

    postCss(src, output, postCssPlugins = []) {
        Verify.preprocessor('postCss', src, output);

        src = new File(src);

        output = this._normalizeOutput(new File(output), src.nameWithoutExtension() + '.css');

        Config.preprocessors['postCss'] = (Config.preprocessors['postCss'] || [require('autoprefixer')({browsers : Config.postCssBrowsers})]).concat({
            src, output, postCssPlugins
        });

        return this;
    };

    /**
     * Register the Webpack entry/output paths.
     *
     * @param {string|Array} entry
     * @param {string} output
     */
    js(entry, output) {
        Verify.js(entry, output);

        entry  = [].concat(entry).map(file => new File(file));
        output = new File(output);

        Config.js.push({entry, output});

        return this;
    }

    /**
     * Register support for the React framework.
     *
     * @param {string|Array} entry
     * @param {string} output
     */
    react(entry, output) {
        Config.react = true;

        Verify.dependency(
            'babel-preset-react',
            'npm install babel-preset-react --save-dev'
        );

        return this.js(entry, output);
    };

    /**
     * Register support for the TypeScript.
     */
    ts(entry, output) {
        Config.typeScript = true;

        Verify.dependency(
            'ts-loader',
            'npm install ts-loader typescript --save-dev'
        );

        return this.js(entry, output);
    };

    /**
     * Register support for the TypeScript.
     */
    typeScript(entry, output) {
        return this.ts(entry, output);
    }

    /**
     * Register Sass compilation.
     *
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    sass(src, output, pluginOptions = {}) {
        pluginOptions = Object.assign({
            precision   : 8,
            outputStyle : 'expanded',
            sourceMap   : true
        }, pluginOptions);

        return this.preprocess('sass', src, output, pluginOptions);
    }

    /**
     * Register standalone-Sass compilation that will not run through Webpack.
     *
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    standaloneSass(src, output, pluginOptions = {}) {
        Verify.exists(src);

        return this.preprocess('fastSass', src, output, pluginOptions);
    };

    /**
     * Alias for standaloneSass.
     *
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    fastSass(...args) {
        return this.standaloneSass(...args);
    }

    /**
     * Register Less compilation.
     *
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    less(src, output, pluginOptions) {
        Verify.dependency(
            'less-loader',
            'npm install less-loader less --save-dev'
        );

        return this.preprocess('less', src, output, pluginOptions);
    }

    /**
     * Register Stylus compilation.
     *
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    stylus(src, output, pluginOptions = {}) {
        Verify.dependency(
            'stylus-loader',
            'npm install stylus-loader stylus --save-dev'
        );

        return this.preprocess('stylus', src, output, pluginOptions);
    };

    /**
     * Register a generic CSS preprocessor.
     *
     * @param {string} type
     * @param {string} src
     * @param {string} output
     * @param {object} pluginOptions
     */
    preprocess(type, src, output, pluginOptions = {}) {
        Verify.preprocessor(type, src, output);

        src = new File(src);

        output = this._normalizeOutput(new File(output), src.nameWithoutExtension() + '.css');

        Config.preprocessors[type] = (Config.preprocessors[type] || []).concat({
            src, output, pluginOptions
        });

        if (type === 'fastSass') {
            Mix.addAsset(output);
        }

        return this;
    }

    /**
     * Combine a collection of files.
     *
     * @param {string|Array} src
     * @param {string}       output
     * @param {Boolean}      babel
     */

    combine(src, output, babel = false) {
        output = new File(output || '');

        Verify.combine(src, output);

        if (typeof src === 'string' && File.find(src).isDirectory()) {
            src = _.pull(
                glob.sync(path.join(src, '**/*'), {nodir : true}),
                output.relativePath()
            );
        }

        let task = new ConcatFilesTask({src, output, babel});

        Mix.addTask(task);

        return this;
    };

    /**
     * Alias for this.Mix.combine().
     *
     * @param {string|Array} src
     * @param {string}       output
     */
    scripts(src, output) {
        return this.combine(src, output);
    };

    /**
     * Identical to this.Mix.combine(), but includes Babel compilation.
     *
     * @param {string|Array} src
     * @param {string}       output
     */
    babel(src, output) {
        return this.combine(src, output, true);

        return this;
    };

    /**
     * Alias for this.Mix.combine().
     *
     * @param {string|Array} src
     * @param {string}       output
     */
    styles(src, output) {
        return this.combine(src, output);
    };

    /**
     * Minify the provided file.
     *
     * @param {string|Array} src
     */
    minify(src) {
        if (Array.isArray(src)) {
            src.forEach(file => this.minify(file));

            return this;
        }

        let output = src.replace(/\.([a-z]{2,})$/i, '.min.$1');

        return this.combine(src, output);
    };

    /**
     * Copy one or more files to a new location.
     *
     * @param {string} from
     * @param {string} to
     */
    copy(from, to) {
        let task = new CopyFilesTask({
            from, to : new File(to)
        });

        Mix.addTask(task);

        return this;
    };

    /**
     * Copy a directory to a new location. This is identical
     * to mix.copy().
     *
     * @param {string} from
     * @param {string} to
     */
    copyDirectory(from, to) {
        return this.copy(from, to);
    };

    /**
     * Enable Browsersync support for the project.
     *
     * @param {object} config
     */
    browserSync(config = {}) {
        Verify.dependency(
            'browser-sync-webpack-plugin',
            'npm install browser-sync-webpack-plugin browser-sync --save-dev',
            true
        );

        if (typeof config === 'string') {
            config = {proxy : config};
        }

        Config.browserSync = config;

        return this;
    };

    /**
     * Enable automatic file versioning.
     *
     * @param {Array} files
     */
    version(files = []) {
        Config.versioning = true;

        files = flatten([].concat(files).map(filePath => {
            if (File.find(filePath).isDirectory()) {
                filePath += (path.sep + '**/*');
            }

            if (!filePath.includes('*')) return filePath;

            return glob.sync(
                new File(filePath).forceFromPublic().relativePath(),
                {nodir : true}
            );
        }));

        Mix.addTask(
            new VersionFilesTask({files})
        );

        return this;
    }

    /**
     * Register vendor libs that should be extracted.
     * This helps drastically with long-term caching.
     *
     * @param {Array}  libs
     * @param {string} output
     */
    extract(libs, output) {
        Config.extractions.push({libs, output});

        return this;
    };

    /**
     * Enable sourcemap support.
     *
     * @param {Boolean} productionToo
     */
    sourceMaps(productionToo = true) {
        let type = 'cheap-module-eval-source-map';

        if (Mix.inProduction()) {
            type = productionToo ? 'cheap-source-map' : false;
        }

        Config.sourcemaps = type;

        return this;
    };

    /**
     * Override the default path to your project's public directory.
     *
     * @param {string} path
     */
    setPublicPath(path) {
        Config.publicPath = path;

        return this;
    }

    /**
     * Set a prefix for all generated asset paths.
     *
     * @param {string} path
     */
    setResourceRoot(path) {
        Config.resourceRoot = path;

        return this;
    };

    /**
     * Disable all OS notifications.
     */
    disableNotifications() {
        Config.notifications = false;

        return this;
    };

    /**
     * Disable success notifications.
     */
    disableSuccessNotifications() {
        Config.notificationsOnSuccess = false;
        return this;
    };

    /**
     * Register libraries to automatically "autoload" when
     * the appropriate variable is references in your JS.
     *
     * when you pass exact, it will add same as webpack.ProvidePlugin style like:
     *
     * new webpack.ProvidePlugin({
     *   $: 'jquery',
     *   jQuery: 'jquery',
     *   'window.jQuery': 'jquery',
     *   Popper: ['popper.js', 'default'],
     *   // In case you imported plugins individually, you must also require them here:
     *   Util: "exports-loader?Util!bootstrap/js/dist/util",
     *   Dropdown: "exports-loader?Dropdown!bootstrap/js/dist/dropdown",
     *   ...
     * })
     *
     * @param {Object} libs
     * @param {Boolean} exact
     */
    autoload(libs, exact = false) {
        let aliases = {};

        if (exact) {
            aliases = Object.assign({}, libs);
        }
        else {
            Object.keys(libs).forEach(library => {
                [].concat(libs[library]).forEach(alias => {
                    aliases[alias] = library;
                });
            });
        }

        Config.autoload = aliases;

        return this;
    };

    /**
     * Merge custom config with the provided webpack.config file.
     *
     * @param {object} config
     */
    webpackConfig(config) {
        Config.webpackConfig = config;

        return this;
    }

    /* Set Mix-specific options.
     *
     * @param {object} options
     */
    options(options) {
        if (options.purifyCss) {
            options.purifyCss = require('./PurifyPaths').build(options.purifyCss);

            Verify.dependency(
                'purifycss-webpack',
                'npm install purifycss-webpack purify-css --save-dev',
                true // abortOnComplete
            );
        }

        Config.merge(options);

        return this;
    };

    /**
     * Register a Webpack build event handler.
     *
     * @param {Function} callback
     */
    then(callback) {
        Mix.listen('build', callback);

        return this;
    }

    /**
     * Helper for determining a production environment.
     */
    inProduction() {
        return Mix.inProduction();
    }

    /**
     * Generate a full output path, using a fallback
     * file name, if a directory is provided.
     *
     * @param {Object} output
     * @param {Object} fallbackName
     */
    _normalizeOutput(output, fallbackName) {
        if (output.isDirectory()) {
            output = new File(path.join(output.filePath, fallbackName));
        }

        return output;
    }
}

module.exports = Api;
