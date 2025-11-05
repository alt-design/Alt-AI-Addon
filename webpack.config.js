const path = require('path');

module.exports = {
    entry: './resources/js/alt-ai.js',
    output: {
        path: path.resolve(__dirname, 'dist/js'),
        filename: 'alt-ai.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    externals: {
        '@tiptap/core': 'TiptapCore'
    },
    resolve: {
        extensions: ['.js']
    }
};
