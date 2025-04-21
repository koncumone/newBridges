const   fs              = require('fs'),
        path            = require('path'),
        Sequelize       = require('sequelize');

class Database {
    constructor() {
        if (Database.instance) {
            return Database.instance
        }

        this.sequelize = new Sequelize("bridges", "kncmn", "koncumone", {dialect: "mysql", host: "185.234.247.178", logging: false});

        this.authenticate()
        this.models = this.loadModels()

        Database.instance = this

    }

    async authenticate() {
        try {
            await this.sequelize.authenticate()
            console.log('Connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }
    }

    loadModels() {
        const models = {};
        const modelsPath = path.join(__dirname, 'models');

        fs.readdirSync(modelsPath).filter((file) => {
            return (file.indexOf('.') !== 0) && (file !== 'index.js');
        }).forEach((file) => {
            const model = require(`${modelsPath}/${file.split('.')[0]}`)(this.sequelize, Sequelize);
            models[file.split('.')[0]] = model;
        });

        models.Op = Sequelize.Op;
        this.sequelize.sync({ alter: true });

        return models;
    }
}

module.exports = new Database().models
