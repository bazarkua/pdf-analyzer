const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

//const port = process.env.PORT || 3000;
const port = 3000;

module.exports = {
    mode: "development",
    entry: "./src/index.js",
    devtool: "inline-source-map",
    output: {
        filename: "bundle.[hash].js"
    },
    devServer: {
        //compress: true,
        port: port,
        historyApiFallback: true/*,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }*/ 
    },
    plugins: [new HtmlWebpackPlugin({
        template: "public/index.html"
    })],
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                        "@babel/preset-env", 
                        "@babel/preset-react"
                    ],
                    plugins: [
                        "@babel/plugin-syntax-dynamic-import",
                        "@babel/plugin-proposal-class-properties"
                    ]
                  }
                }
            },
            {
                test: /\.css$/,
                use: [
                    {
                        loader: "style-loader"
                    },
                    {
                        loader: "css-loader"
                    }
                    
                ]
            }
        ]
    }
};
