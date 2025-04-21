const axios = require('axios')


class SpreadsManager {
    constructor(bot, database, utils) {
        this.bot      = bot
        this.utils    = utils
        this.database = database

        this.batchSize = 30
        this.requestDelay = 1000 // Задержка между запросами к API в мс
    }

    async start() {
        while (true) {
            try {
                const tokens = await this.getTokens();

                const chainGroups = this.utils.groupTokensByChain(tokens)

                const batches = this.utils.createBatches(chainGroups, this.batchSize)

                const dexScreenerResults = await this.fetchDexScreenerData(batches)

                const enrichedTokens = this.utils.mergeTokenDataWithDexScreener(tokens, dexScreenerResults)
                
                const spreadsResult = this.utils.findAllSpreads(enrichedTokens);

                console.log(`Обработано ${enrichedTokens.length} токенов, найдено ${spreadsResult.spreads.length} спредов`);
                
                if (spreadsResult.spreads.length > 0) 
                    spreadsResult.spreads.forEach(async(spread) => await this.processSignal(spread))

                await this.sleep(10000)
            } catch (error) {
                console.error('Ошибка при обработке токенов:', error);
            }
        }
    }


    async processSignal(data) {
        try {

            const lastSignal  = await this.database.signals.findOne({
                where: { 
                    tokenSymbol: data.token.symbol,
                    tokenEvmChain: data.token.evm.chain,
                    tokenSolanaAddress: data.token.solana.address,
                    direction: data.adjustedPrices.direction
                },
                order: [['lastSent', 'DESC']]
            });

            const cooldownMinutes = 15; 
            const now = new Date();

            if (lastSignal) {
                const lastSent = new Date(lastSignal.lastSent);
                const minutesSinceLastSent = (now - lastSent) / (1000 * 60);
                
                if (minutesSinceLastSent < cooldownMinutes) {
                    console.log(`Сигнал для ${data.token.symbol} уже был отправлен ${minutesSinceLastSent.toFixed(1)} минут назад. Пропускаем.`);
                    return;
                }
            }

            await this.database.signals.create({
                tokenSymbol: data.token.symbol,
                tokenEvmChain: data.token.evm.chain,
                tokenSolanaAddress: data.token.solana.address,
                direction: data.adjustedPrices.direction,
                profitPercent: parseFloat(data.profitability.netProfitPercent),
                lastSent: now
            });

            const message = this.utils.spreadMessage(data);
            
            await this.bot.sendMessage(-1002354384321, message.text, { 
                message_thread_id: 207126,
                parse_mode: 'HTML', 
                disable_web_page_preview: true, 
                ...message.keyboard
            });
            
            console.log(`Отправлен сигнал для ${data.token.symbol} (${data.adjustedPrices.direction})`);

        } catch (error) {
            console.log(error)
        }
    }


    async getTokens() {
        try {
            const tokens = await this.database.bridges.findAll({where: {blackList: false}})
            return this.utils.aggregateTokensArr(tokens)
        } catch (error) {
            console.log(error)
            return []
        }
    }

    async fetchDexScreenerData(batches) {
        const results = [];
        
        for (const batch of batches) {
            try {
                const url = this.utils.generateDexScreenerUrl(batch);

                const response = await axios.get(url);
                if (response.status !== 200) {
                    throw new Error(`DexScreener API error: ${response.status}`);
                }
                
                const data = response.data;

                results.push({
                    chainId: batch.chainId,
                    tokens: batch.tokens,
                    data: { pairs: data }
                });

            } catch (error) {
                console.error(`Ошибка при запросе данных DexScreener для ${batch.chainId}:`, error);
                results.push({
                    chainId: batch.chainId,
                    tokens: batch.tokens,
                    data: { pairs: [] }
                });
                await this.sleep(this.requestDelay * 3);
            }
        }
        
        return results;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}


module.exports = SpreadsManager