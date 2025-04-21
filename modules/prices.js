
const axios = require('axios');

class PriceManager {
    constructor() {
        this.endpoint = 'https://data-api.binance.vision'

        this.prices = {}

        this.updatePrices(); 
        setInterval(() => this.updatePrices(), 60000); 
    }

    async updatePrices() {
        try {
            const response = await axios.get(this.endpoint + `/api/v3/ticker/price`);
        
            if (!response || !response.data) return null

            const wantedPairs = ['SOLUSDT', 'ETHUSDT', 'BNBUSDT', 'AVAXUSDT', 'POLUSDT', 'VIRTUALUSDT'];

            for (const pair of wantedPairs) {
                 const found = response.data.find(item => item.symbol === pair);
                 
                this.prices[pair.replace('USDT', '')] = found ? parseFloat(found.price) : 0;
            }

            // console.log(this.prices)
        } catch (error) {
            console.error('Ошибка обновления цен:', error);
        }
    }

    getPrice(symbol) {
        return this.prices[symbol] || 0;
    }
}

module.exports = new PriceManager();
