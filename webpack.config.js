const path = require('path');
const webpack = require('webpack');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
    const mode = argv.mode || 'development';
    const shouldAnalyze = env && env.ANALYZE === 'true';

    const plugins = [
        new webpack.IgnorePlugin({
            checkResource(resource) {
                return /.*\/wordlists\/(?!english).*\.json/.test(resource);
            },
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser',
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(mode),
        }),
    ];

    if (shouldAnalyze) {
        plugins.push(new BundleAnalyzerPlugin());
    }

    return {
        mode: mode,
        devtool: mode === 'development' ? 'inline-source-map' : false, // 生产模式下不生成 Source Map
        entry: {
            background: path.resolve(__dirname, './src/background.ts'),
            home: path.resolve(__dirname, './src/home.ts'),
            main: path.resolve(__dirname, './src/main.ts'),
            compose: path.resolve(__dirname, './src/compose.ts'),
            inject: path.resolve(__dirname, './src/inject.ts'),
            content: path.resolve(__dirname, './src/content.ts'),
            content_google: path.resolve(__dirname, './src/content_google.ts'),
            content_outlook: path.resolve(__dirname, './src/content_outlook.ts'),
            content_qq: path.resolve(__dirname, './src/content_qq.ts'),
            content_netease: path.resolve(__dirname, './src/content_netease.ts'),
        },
        output: {
            filename: 'js/[name].js',
            path: path.resolve(__dirname, 'extension'),
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        optimization: {
            minimize: mode === 'production',
            usedExports: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        compress: {
                            drop_console: true, // 可选：移除 console.log
                            unused: true,  // 启用删除未使用的代码
                        },
                        format: {
                            comments: false, // 移除注释
                        },
                    },
                    extractComments: false,
                }),
            ],
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
            fallback: {
                buffer: false,
                crypto: false,
                stream: false,
                vm: false,
                process: false,
            },
        },
        plugins: plugins,
    };
};
