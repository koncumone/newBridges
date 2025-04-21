module.exports = function (sequelize, DataTypes) {

    const model = sequelize.define('signals', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        tokenSymbol: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        tokenEvmChain: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        tokenSolanaAddress: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        direction: {
            type: DataTypes.STRING,
            allowNull: false
        },
        
        profitPercent: {
            type: DataTypes.FLOAT
        },

        lastSent: {
            type: DataTypes.DATE,
            allowNull: false
        }
        
    }, {
        tableName: 'signals',
        timestamps: false,
    });

    return model
};