const path = require('path');

module.exports = {
    entry: './resources/js/tiptap-ai-agent.js',
    output: {
        path: path.resolve(__dirname, 'dist/js'),
        filename: 'tiptap-ai-agent.js',
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
