module.exports = function (sequelize, DataTypes) {

    const model = sequelize.define('bridges', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }, 
        
        status: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        tx: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        symbol: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        
        evmChain: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        evmAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        solanaAddress: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        liquidity: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },

        creator: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },

        message: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        },

        liqEvents: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },

        blackList: {
            type: DataTypes.BOOLEAN,
            allowNull: true,
            defaultValue: false
        }

    }, {
        tableName: 'bridges',
        timestamps: false,
    });

    return model
};