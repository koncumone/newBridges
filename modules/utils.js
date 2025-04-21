const { PublicKey, Connection }           = require('@solana/web3.js'),
      { TOKEN_PROGRAM_ID, AccountLayout } = require('@solana/spl-token'),
      { deserializeMetadata }             = require('@metaplex-foundation/mpl-token-metadata'),
      { wormhole, Wormhole }              = require('@wormhole-foundation/sdk');
      
const { exec }                            = require('child_process');

const axios                               = require('axios')

const solana                              = require('@wormhole-foundation/sdk/solana').default,
      evm                                 = require('@wormhole-foundation/sdk/evm').default

const connection                          = new Connection('http://basic.swqos.solanavibestation.com/?api_key=b93e13b927bde65c6d43538edabec783', { confirmTransactionInitialTimeout: 20000, commitment: 'confirmed'})

const MPL_TOKEN_METADATA_PROGRAM_ID       = new PublicKey(`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`)

const priceManager                        = require('./prices')


class UTILS {
    static liqPatterns = [
        'OpenPositionV2',
        'InitializeMint2',
        'increaseLiquidityV2',
        'increaseLiquidity',
        'AddLiquidityByStrategy',
        'InitializePosition'
    ];

    static swapPatterns = [
        'Swap',
        'Route',
        'SwapV2'
    ]

    static delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    static threads = {
        all: 2,
        new: 5,
        potential: 129540,
        liq: 137198
    }

    constructor(connection, priceManager) {
        this.connection = connection

        this.priceManager = priceManager

        this.chains = {
            1 : { name: 'Solana',    explorer: 'https://solscan.io/',                  screener: 'solana',     },
            2 : { name: 'Ethereum',  explorer: 'https://etherscan.io/',                screener: 'ethereum',   apiKey: `NGZQGGWMZ8VMGRJ1T5KFBKZNVM6IEETF5W`, endpoint: 'https://api.etherscan.io/api' }, //+
            4 : { name: 'Bsc',       explorer: 'https://bscscan.com/',                 screener: 'bsc',        apiKey: `38CY77AN46S3YXNJQP96I96Z2KB6NMPENU`, endpoint: 'https://api.bscscan.com/api' },  //+
            5 : { name: 'Polygon',   explorer: 'https://polygonscan.com/',             screener: 'polygon',    apiKey: `I8J93Y14PF2N9Z1VW5A62PDP78JUA4PT7I`, endpoint: 'https://api.polygonscan.com/api' }, //+
            6 : { name: 'Avalanche', explorer: 'https://snowscan.xyz/',                screener: 'avalanche',  apiKey: `I57PNYDAMZSJRQXCDBRSPVZ9WVT7RX5BPH`, endpoint: 'https://api.snowscan.xyz/api' },  //+
            23: { name: 'Arbitrum',  explorer: 'https://arbiscan.io/',                 screener: 'arbitrum',   apiKey: `2GSBS4HY384U13MQ4C7CTBUWUH6SRTJZST`, endpoint: 'https://api.arbiscan.io/api' }, //+
            24: { name: 'Optimism',  explorer: 'https://optimistic.etherscan.io/',     screener: 'optimism',   apiKey: `DFWQXP9BAQMPRCMUBYKTE6SHD3X62MTI45`, endpoint: 'https://api-optimistic.etherscan.io/api' }, //+
            30: { name: 'Base',      explorer: 'https://basescan.org/',                screener: 'base',       apiKey: `7TT4X4TSQ8C175512H42UPNVM5RTXR7ERY`, endpoint: 'https://api.basescan.org/api' }, //+
        }

        this.blackMint = [
            'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM',
            '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
            'Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1',
            '9dzSzFvPsKDoY2gdWErsuz2H1o4tbzvgBhrNZ9cvkD2j',
            '9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa',
            '5goWRao6a3yNC4d6UjMdQxonkCMvKBwdpubU3qhfcdf1',
            'KgV1GvrHQmRBY8sHQQeUKwTm2r2h8t4C8qt12Cw1HVE',
            '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
            'CLV6gB88nQtnuo3akGLSVRFaiFPTXaBXV4EDaFxV7iRq',
            'CSD6JQMvLi46psjHdpfFdr826mF336pEVMJgjwcoS1m4',
            'HAxCJjnmgkdXhwZYeJiUvBgm4NdQvqhGJCS3KxCnCxWs',
            'FCqfQSujuPxy6V42UvafBhsysWtEq1vhjfMN1PUbgaxA',
            'CR4xnGrhsu1fWNPoX4KbTUUtqGMF3mzRLfj4S6YEs1Yo',
            'Kz1csQA91WUGcQ2TB3o5kdGmWmMGp8eJcDEyHzNDVCX',
            '8qJSyQprMC57TWKaYEmetUR3UUiTP2M3hXdcvFhkZdmv',
            'E2VmbootbVCBkMNNxKQgCLMS1X3NoGMaYAsufaAsf7M',
            'Gz7VkD4MacbEB6yC5XD3HcumEiYx2EtDYYrfikGsvopG',
            'GUsnJVen6A92ybwjibp6eZM6XyQhqVFtLnfpbiQWPEj8',
            'GRiPkJTaibVTRM7Gv7FLHoj72naANpgiCkfJk1tRUjkS',
            'AU3muMMYmSAG9th4JVgRRpiU4xPzWyYgBh6sGJRahaiU',
            '2gpNX7Qd3SenYm75FDAqHGGWctKXMLWP65hurv8cCnCq',
            'CdC6jsYRRyHy9gXZX3SaS2rf6qa218XhXjEhaiANkBYT'
        ]

        this.dexUrl = `https://dexscreener.com/`
        this.chatId = `-1002354384321`
    }

    alert() {
        try {
            exec('powershell -c (New-Object Media.SoundPlayer "./modules/alert.wav").PlaySync();', (error) => {
                if (error) {
                    console.error(`Ошибка воспроизведения: ${error.message}`);
                }
            });
        } catch (error) {
            console.log(error)
        }
    }
    

    async initWormhole() {
        this.wh = await wormhole('Mainnet', [ evm, solana ])
    }

    async getOriginalAsset(database, address) {
        try {
                const asset = await database.bridges.findOne({where: { solanaAddress: address }})

                if (!asset)
                    return await this.getOnchainOriginalAsset(address)

                return {
                    chain: asset.evmChain,
                    address: asset.evmAddress
                }
        } catch (error) {
            console.log(error)
            return null
        }
    }

    async getOnchainOriginalAsset(address) {
        const maxRetries = 10;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const originalAssetData = await this.wh.getOriginalAsset(Wormhole.tokenId('Solana', address));

                if (!originalAssetData) {
                    throw new Error('Original asset not found');
                }

                return {
                    chain: originalAssetData.chain,
                    address: Wormhole.canonicalAddress(originalAssetData)
                };
            } catch (error) {

                if (attempt < maxRetries) {
                    await UTILS.delay(3000)
                } else {
                    console.error('All attempts failed. Returning null.');
                    return null;
                }
            }
        }
    }


    async prepareCompleteData(session, isNew) {
        const { bridge, mint, originalAsset, symbol, evmData = {} } = session,
              { evmHash, sender, creator } = evmData

        const targetChain = Object.values(this.chains).find(chain => chain.name == originalAsset.chain) || null
        
        if (!targetChain) return null

        const text = `<b>$${symbol} | ${creator? '🛑 BRIDGED BY DEPLOYER' : 'BRIDGE'}</b>

<b>Transfer to chain:</b> Solana

<b>EVM Address:</b> <code>${originalAsset.address}</code>

<b>Solana Address:</b> <code>${mint}</code>

<b>Token EVM original:</b> ${originalAsset.chain}
        `

        const keyboard = [
            evmHash 
                ? [{text: targetChain.name + ' tx', url: targetChain.explorer + 'tx/' + evmHash}, {text: 'Solana tx', url: this.chains[1].explorer + 'tx/' + bridge.signature}] 
                : [{text: 'Solana tx', url: this.chains[1].explorer + 'tx/' + bridge.signature}],

            sender  
                ? [{text: 'Sender', url: targetChain.explorer + 'address/' + sender}, {text: 'Recipient', url: this.chains[1].explorer + 'address/' + bridge.parsedInstruction.namedAccounts.payer}] 
                : [{text: 'Recipient', url: this.chains[1].explorer + 'address/' + bridge.parsedInstruction.namedAccounts.payer}],

            [
                {text: targetChain.name + ' contract', url: targetChain.explorer + 'token/' + originalAsset.address}, 
                {text: 'Solana contract', url: this.chains[1].explorer + 'account/' + mint}
            ],
   
            [
                {text: targetChain.name + ' chart', url: this.dexUrl + targetChain.screener + '/' + originalAsset.address}, 
                {text: 'Solana chart', url: this.dexUrl + this.chains[1].screener + '/' + mint}
            ]
        ]

        return { text, keyboard: {reply_markup: { inline_keyboard: keyboard }}, thread_id: isNew ? UTILS.threads.new : UTILS.threads.all}
    }


    async prepareTransferData(bridge, originalAsset, symbol = 'Undefinited') {

        const { 
            signature, 
            parsedInstruction: { 
                wormholeDecoded: { data }, 
                namedAccounts:   { payer, mint } 
            } 
        } = bridge;

        const recipient = this.getRecipient(data.targetAddress, data.targetChain)

        const text = `<b>$${symbol} | BRIDGE</b>

<b>Transfer to chain:</b> ${this.chains[data.targetChain].name.toUpperCase()}

<b>EVM Address:</b> <code>${originalAsset.address}</code>

<b>Solana Address:</b> <code>${mint}</code>

<b>Token EVM original:</b> ${originalAsset.chain.toUpperCase()}
`

        const keyboard = [
            [{text: 'Sender', url: this.chains[1].explorer + 'account/' + payer}, {text: 'Tx link', url: this.chains[1].explorer + 'tx/' + signature}, {text: 'Recipient', url: this.chains[data.targetChain].explorer + 'address/' + recipient}],
            [{text: 'Solana contract', url: this.chains[1].explorer + 'account/' + mint},  {text: this.chains[data.targetChain].name + ' contract', url: this.chains[data.targetChain].explorer + 'token/' + originalAsset.address}],
            [{text: 'Solana chart', url: this.dexUrl + this.chains[1].screener + '/' + mint}, {text: this.chains[data.targetChain].name + ' chart', url: this.dexUrl + this.chains[data.targetChain].screener + '/' + originalAsset.address}]
        ]

        return { text, keyboard: {reply_markup: { inline_keyboard: keyboard }}, thread_id: UTILS.threads.all}
    }

    async prepareCreateData(bridge, originalAsset, symbol = 'Undefinited') {
        const { 
            signature, 
            parsedInstruction: { 
                namedAccounts:   { payer, mint } 
            } 
        } = bridge;

        const targetChain = Object.values(this.chains).find(chain => chain.name == originalAsset.chain) || null

        if (!targetChain)
            return null

        const text = `<b>$${symbol} | SOL TOKEN CREATE</b>

<b>EVM Address:</b> <code>${originalAsset.address || 'undefinited'}</code>

<b>Solana Address:</b> <code>${mint}</code>

<b>Token EVM original:</b> ${originalAsset.chain.toUpperCase() || 'undefinited'}
`

       const keyboard = [
            [{text: 'Tx link', url: this.chains[1].explorer + 'tx/' + signature}, {text: 'User', url: this.chains[1].explorer + 'address/' + payer}],
            [{text: targetChain.name + ' contract', url: targetChain.explorer + 'token/' + originalAsset.address}, {text: 'Solana contract', url: this.chains[1].explorer + 'account/' + mint}],
            [{text: targetChain.name + ' chart', url: this.dexUrl + targetChain.screener + '/' + originalAsset.address}, {text: 'Solana chart', url: this.dexUrl + this.chains[1].screener + '/' + mint}]
        ]

        return { text, keyboard: {reply_markup: { inline_keyboard: keyboard }}, thread_id: UTILS.threads.potential}
    }

    async prepareLiqData(session, signature, type) {
        const { mint, symbol, originalAsset } = session

        const targetChain = Object.values(this.chains).find(chain => chain.name == originalAsset.chain) || null

        if (!targetChain) return null

        const text = `<b>$${symbol} | ${type == 'swap' ? 'SWAP' : 'SOL LIQ ADDED'}</b>
        
<b>EVM Address:</b> <code>${originalAsset.address || 'undefinited'}</code>

<b>Solana Address:</b> <code>${mint}</code>

<b>Token EVM original:</b> ${originalAsset.chain.toUpperCase() || 'undefinited'}

${this.swapLinks(mint)}
`
        const keyboard = [
            [{text: 'Tx link', url: this.chains[1].explorer + 'tx/' + signature}],
            [{text: targetChain.name + ' contract', url: targetChain.explorer + 'token/' + originalAsset.address}, {text: 'Solana contract', url: this.chains[1].explorer + 'account/' + mint}],
            [{text: targetChain.name + ' chart', url: this.dexUrl + targetChain.screener + '/' + originalAsset.address}, {text: 'Solana chart', url: this.dexUrl + this.chains[1].screener + '/' + mint}]
        ]

        return { text, keyboard: {reply_markup: { inline_keyboard: keyboard }}, thread_id: UTILS.threads.liq}
    }

    swapLinks(mint) {
        return `<a href="https://bullx.io/terminal?chainId=1399811149&address=${mint}&r=QG7LT1M831E">BullX</a> | <a href="https://jup.ag/swap/SOL-${mint}?referrer=8q4X9PSrYiVemcBjBBbLUu51Vm4fDsWbzVGhFKpRm7aW&feeBps=100">Jupiter</a> | <a href="https://photon-sol.tinyastro.io/en/r/@kncmn/${mint}">Photon</a>`
    }

    async checkForSolLiq(mint) { 
        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.get(`https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=${mint}&amount=100000000&slippageBps=50`);

                if (!response || !response.data) {
                    throw new Error('Invalid response data');
                }

                return true
            } catch (error) {
                console.warn(`Attempt ${attempt} of ${maxRetries} failed:`, error.message);

                if (error.response?.data?.errorCode === 'TOKEN_NOT_TRADABLE') {
                    console.error('Token not tradable.', mint);
                }

                if (error.response?.data?.errorCode === 'COULD_NOT_FIND_ANY_ROUTE') {
                    console.error('COULD_NOT_FIND_ANY_ROUTE.', mint);
                    return true
                }

                if (attempt < maxRetries) {
                    await UTILS.delay(1000)
                } else {
                    console.error('All attempts failed. Returning null.', mint);
                    return false;
                }
            }
        }
    }

    getRecipient(address, targetChain) {
        const chain = this.chains[targetChain].name || null

        const parsedAddress = Wormhole.chainAddress(chain, address)

        return parsedAddress.address.address
    }

    async getTokenSymbol(address) {
        try {
            const [ metadataPda ] = PublicKey.findProgramAddressSync(
                [
                    Buffer.from('metadata'),
                    MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                    new PublicKey(address).toBuffer()
                ],
                MPL_TOKEN_METADATA_PROGRAM_ID
            )

            const mintAccount = await this.connection.getAccountInfo(metadataPda),
                  metadata    = deserializeMetadata(mintAccount)

            return metadata.symbol
        } catch (error) {
            console.log(error)
            return null
        }
    }

    async checkHolders(address) {
        const maxRetries = 5;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const holders = await this.connection.getProgramAccounts(
                    TOKEN_PROGRAM_ID,
                    {
                        filters: [
                            { dataSize: AccountLayout.span },
                            { memcmp: { offset: AccountLayout.offsetOf('mint'), bytes: new PublicKey(address).toBase58() }},
                        ],
                    }
                );

                const trueHolders = holders.map(holder => {
                    const holderData = AccountLayout.decode(holder.account.data);

                    if (holderData.amount != BigInt(0)) {
                        return holder;
                    }
                }).filter(Boolean);

                return trueHolders.length <= 5;
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);

                if (attempt >= maxRetries) {
                    console.error('All attempts holders failed. Returning null.');
                    return true;
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }

    async evmData(tx, originalAsset) {
        const maxRetries = 60;

        for (let counter = 1; counter <= maxRetries; counter++) {
            try {
                const response = await axios.get(`http://api.wormholescan.io/api/v1/operations?txHash=${tx}`)

                if (!response || !response.data || !response.data.operations.length) {
                    throw new Error('Invalid response data');
                }

                
                const transaction = response.data.operations.find(
                    (transaction) => transaction.targetChain.transaction.txHash == tx
                )

                if (!transaction) 
                    return null

                const targetChain = Object.values(this.chains).find(chain => chain.name == originalAsset.chain) || null

                if (!targetChain)
                    return null

                const creatorResponse = await axios.get(`${targetChain.endpoint}?module=contract&action=getcontractcreation&contractaddresses=${originalAsset.address}&apikey=${targetChain.apiKey}`);

                if (!creatorResponse || !creatorResponse.data || !creatorResponse.data.result) {
                    throw new Error('Invalid response data');
                }

                const contract = creatorResponse.data.result.find(
                    (token) => token.contractAddress.toLowerCase() == originalAsset.address.toLowerCase()
                );

                const isCreatorMatch = contract?.contractCreator.toLowerCase() == transaction.sourceChain.from.toLowerCase();

                return {
                    evmHash: transaction.sourceChain.transaction.txHash,
                    sender: transaction.sourceChain.from,
                    creator: isCreatorMatch
                }

            } catch (error) {
                if (counter >= maxRetries) {
                    console.error('Max retries reached. Returning null.');
                    return null;
                }

                await UTILS.delay(10000)
            }
        }
    }

    async isTokenCreator(chain, address, dev) {
        try {
                const info = this.chains[chain];
                if (!info?.access) return null;

                const response = await axios.get(`${info.endpoint}?module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${info.apiKey}`)

                if (!response || !response.data || !response.data.result) return null

                const contract = response.data.result.find(
                    (token) => token.contractAddress.toLowerCase() === address.toLowerCase()
                );
        
                return contract?.contractCreator.toLowerCase() === dev.toLowerCase() || null;
        } catch (error) {
            console.log(error)
            return null
        }
    }

    subscribeMessage(mint) {
        return {
            jsonrpc: "2.0",
            id: 1,
            method: "logsSubscribe",
            params: [
                {
                    mentions: [mint],
                },
                {
                    commitment: "confirmed",
                },
            ],
        }
    }

    checkLogsForPatterns(logs) {
        for (const log of logs) {
            if (UTILS.liqPatterns.some(pattern => log.includes(pattern))) {
                return { type: 'liquidity' }
            }
        
            if (UTILS.swapPatterns.some(pattern => log.includes(pattern))) {
                return { type: 'swap' }
            }
        }

        return { type: 'none' }
    }
    
    aggregateTokensArr(arr) {
        return arr.map(token => ({
            symbol: token.symbol,
            evm: {
                chain: token.evmChain.toLowerCase(),
                address: token.evmAddress,
            },
            solana: {
                chain: 'solana',
                address: token.solanaAddress
            }
        }))
    }

    groupTokensByChain(tokens) {
        const chainGroups = {};
        const allowedChains = ['solana', 'arbitrum', 'ethereum', 'polygon', 'bsc', 'avalanche', 'base'];
    
        tokens.forEach(token => {
            if (token.evm && allowedChains.includes(token.evm.chain)) {
                const chain = token.evm.chain;
                
                if (!chainGroups[chain]) {
                    chainGroups[chain] = [];
                }
                
                chainGroups[chain].push({
                    symbol: token.symbol,
                    address: token.evm.address,
                    type: 'evm'
                });
            }
            
            if (token.solana && allowedChains.includes('solana')) {
                const chain = token.solana.chain;
                
                if (!chainGroups[chain]) {
                    chainGroups[chain] = [];
                }

                chainGroups[chain].push({
                    symbol: token.symbol,
                    address: token.solana.address,
                    type: 'solana'
                });
            }
        });
        
        return chainGroups;
    }

    createBatches(chainGroups, batchSize = 30) {
        const batches = [];
        
        for (const [chain, tokens] of Object.entries(chainGroups)) {
            const chainId = this.getDexScreenerChainId(chain);
            
            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const addresses = batch.map(token => token.address);
                
                batches.push({
                    chainId,
                    addresses,
                    tokens: batch,
                });
            }
        }
        
        return batches;
    }
    
    getDexScreenerChainId(chain) {
        const chainMapping = {
            'ethereum': 'ethereum',
            'avalanche': 'avalanche',
            'bsc': 'bsc',
            'polygon': 'polygon',
            'optimism': 'optimism',
            'arbitrum': 'arbitrum',
            'base': 'base',
            'solana': 'solana',
        };
        
        return chainMapping[chain] || chain;
    }

    mergeTokenDataWithDexScreener(originalTokens, dexScreenerResults) {
        const resultTokens = JSON.parse(JSON.stringify(originalTokens));
        
        const tokenMap = new Map();
        
        resultTokens.forEach(token => {
            if (token.evm) {
                const key = `${token.evm.chain}:${token.evm.address.toLowerCase()}`;
                tokenMap.set(key, { token, type: 'evm' });
            }
            if (token.solana) {
                const key = `${token.solana.chain}:${token.solana.address.toLowerCase()}`;
                tokenMap.set(key, { token, type: 'solana' });
            }
        });
        
        // Обрабатываем каждый результат из DexScreener
        dexScreenerResults.forEach(result => {
            const { chainId, data } = result;
            
            if (data && data.pairs && data.pairs.length > 0) {
                // Для каждой пары проверяем, соответствует ли она одному из наших токенов
                data.pairs.forEach(pairData => {
                    if (pairData.baseToken && pairData.baseToken.address) {
                        const tokenAddress = pairData.baseToken.address.toLowerCase();
                        const key = `${chainId}:${tokenAddress}`;
                        
                        if (tokenMap.has(key)) {
                            const { token, type } = tokenMap.get(key);
                            
                            // Добавляем данные DexScreener в соответствующий объект цепочки
                            if (type === 'evm' && token.evm.chain === chainId) {
                                token.evm.screener = {
                                    url: pairData.url,
                                    baseToken: pairData.baseToken,
                                    quoteToken: pairData.quoteToken,
                                    priceUsd: pairData.priceUsd,
                                    priceNative: pairData.priceNative,
                                    liquidity: pairData.liquidity,
                                    volume: pairData.volume,
                                    isBase: true // всегда true, так как обрабатываем только baseToken
                                };

                                // Цена уже правильная, так как это baseToken
                                token.evm.screener.calculatedPriceUsd = pairData.priceUsd;
                                token.evm.screener.calculatedPriceNative = pairData.priceNative;
                            } else if (type === 'solana' && token.solana.chain === chainId) {
                                token.solana.screener = {
                                    url: pairData.url,
                                    baseToken: pairData.baseToken,
                                    quoteToken: pairData.quoteToken,
                                    priceUsd: pairData.priceUsd,
                                    priceNative: pairData.priceNative,
                                    liquidity: pairData.liquidity,
                                    volume: pairData.volume,
                                    isBase: true // всегда true, так как обрабатываем только baseToken
                                };

                                // Цена уже правильная, так как это baseToken
                                token.solana.screener.calculatedPriceUsd = pairData.priceUsd;
                                token.solana.screener.calculatedPriceNative = pairData.priceNative;
                            }
                        }
                    }
                });
            }
        });
        
        return resultTokens;
    }

    calculateSpread(token, tradingAmountUsd = 1000) {
        // Проверяем, есть ли у токена данные скринера для обеих сетей
        if (!token.evm?.screener || !token.solana?.screener) {
            return {
                hasSpread: false,
                reason: 'Отсутствуют данные по цене в одной из сетей'
            };
        }
        
        // Получаем цены в USD из обеих сетей
        const evmPriceUsd = parseFloat(token.evm.screener.priceUsd);
        const solanaPriceUsd = parseFloat(token.solana.screener.priceUsd);
        
        // Проверяем, что цены действительны
        if (isNaN(evmPriceUsd) || isNaN(solanaPriceUsd) || evmPriceUsd <= 0 || solanaPriceUsd <= 0) {
            return {
                hasSpread: false,
                reason: 'Некорректные данные по цене',
                evmPrice: token.evm.screener.priceUsd,
                solanaPrice: token.solana.screener.priceUsd
            };
        }
        
        // ------------- Извлечение данных о базовом токене и пуле -------------
        
        // Получаем информацию о quote токенах
        const evmQuoteSymbol = token.evm.screener.quoteToken?.symbol || 'UNKNOWN';
        const solanaQuoteSymbol = token.solana.screener.quoteToken?.symbol || 'UNKNOWN';
        
        // Маппинг символов токенов к нашим ценам
        const symbolMap = {
            'WETH': 'ETH',
            'ETH': 'ETH',
            'WSOL': 'SOL',
            'SOL': 'SOL',
            'WBNB': 'BNB',
            'BNB': 'BNB',
            'WAVAX': 'AVAX',
            'AVAX': 'AVAX',
            'WPOL': 'POL',
            'POL': 'POL',
            'USDC': 1,
            'USDT': 1,
            'DAI': 1,
            'BUSD': 1,
            'TUSD': 1
        };
        
        // Получаем цены quote токенов с помощью PriceManager
        let evmQuotePrice = 1.0;  // По умолчанию предполагаем стейблкоин
        if (evmQuoteSymbol in symbolMap) {
            if (typeof symbolMap[evmQuoteSymbol] === 'number') {
                evmQuotePrice = symbolMap[evmQuoteSymbol];
            } else {
                evmQuotePrice = this.priceManager.getPrice(symbolMap[evmQuoteSymbol]) || 1.0;
            }
        }
        
        let solanaQuotePrice = 1.0;  // По умолчанию предполагаем стейблкоин
        if (solanaQuoteSymbol in symbolMap) {
            if (typeof symbolMap[solanaQuoteSymbol] === 'number') {
                solanaQuotePrice = symbolMap[solanaQuoteSymbol];
            } else {
                solanaQuotePrice = this.priceManager.getPrice(symbolMap[solanaQuoteSymbol]) || 1.0;
            }
        }
        
        // ------------- Извлечение и нормализация данных о ликвидности -------------
        

        let evmLiquidityUsd = parseFloat(token.evm.screener.liquidity.usd) || 0;
        let evmLiquidityBase = parseFloat(token.evm.screener.liquidity.base) || 0;
        let evmLiquidityQuote = parseFloat(token.evm.screener.liquidity.quote) || 0;

        let solanaLiquidityUsd = parseFloat(token.solana.screener.liquidity.usd) || 0;
        let solanaLiquidityBase = parseFloat(token.solana.screener.liquidity.base) || 0;
        let solanaLiquidityQuote = parseFloat(token.solana.screener.liquidity.quote) || 0;

        
        // Вычисляем base и quote ликвидность, если они не предоставлены, но есть USD ликвидность
        if (evmLiquidityUsd > 0 && evmLiquidityBase === 0 && evmPriceUsd > 0) {
            // Приблизительно половина USD ликвидности состоит из base токенов
            evmLiquidityBase = (evmLiquidityUsd / 2) / evmPriceUsd;
            // Другая половина - из quote токенов, учитываем цену quote токена
            evmLiquidityQuote = (evmLiquidityUsd / 2) / evmQuotePrice;
        }
        
        if (solanaLiquidityUsd > 0 && solanaLiquidityBase === 0 && solanaPriceUsd > 0) {
            // Приблизительно половина USD ликвидности состоит из base токенов
            solanaLiquidityBase = (solanaLiquidityUsd / 2) / solanaPriceUsd;
            // Другая половина - из quote токенов, учитываем цену quote токена
            solanaLiquidityQuote = (solanaLiquidityUsd / 2) / solanaQuotePrice;
        }
        
        // Рассчитываем фактическую USD ликвидность quote токенов
        const evmQuoteLiquidityUsd = evmLiquidityQuote * evmQuotePrice;
        const solanaQuoteLiquidityUsd = solanaLiquidityQuote * solanaQuotePrice;
        
        const MIN_LIQUIDITY_THRESHOLD_USD = 1000
        if (evmLiquidityUsd < MIN_LIQUIDITY_THRESHOLD_USD || solanaLiquidityUsd < MIN_LIQUIDITY_THRESHOLD_USD) {
            return {
                hasSpread: false,
                reason: 'Недостаточная общая ликвидность для торговли',
                evmLiquidity: evmLiquidityUsd,
                solanaLiquidity: solanaLiquidityUsd,
                minLiquidityRequired: MIN_LIQUIDITY_THRESHOLD_USD
            };
        }
        
        // Проверка минимальной ликвидности quote токенов
        const MIN_QUOTE_LIQUIDITY_USD = 500; // Минимум $500 ликвидности в quote токенах
        if (evmQuoteLiquidityUsd < MIN_QUOTE_LIQUIDITY_USD || solanaQuoteLiquidityUsd < MIN_QUOTE_LIQUIDITY_USD) {
            return {
                hasSpread: false,
                reason: 'Недостаточная ликвидность quote токенов для арбитража',
                evmQuoteLiquidity: {
                    symbol: evmQuoteSymbol,
                    amount: evmLiquidityQuote,
                    valueUsd: evmQuoteLiquidityUsd
                },
                solanaQuoteLiquidity: {
                    symbol: solanaQuoteSymbol,
                    amount: solanaLiquidityQuote,
                    valueUsd: solanaQuoteLiquidityUsd
                },
                minQuoteLiquidityRequired: MIN_QUOTE_LIQUIDITY_USD
            };
        }
        
        // ------------- Определение направления арбитража и расчет параметров -------------
        
        // Определение направления спреда
        const isBuyFromSolana = evmPriceUsd > solanaPriceUsd;
        
        // Определение пулов для покупки и продажи
        const buyNetwork = isBuyFromSolana ? 'solana' : 'evm';
        const sellNetwork = isBuyFromSolana ? 'evm' : 'solana';
        
        const buyPrice = isBuyFromSolana ? solanaPriceUsd : evmPriceUsd;
        const sellPrice = isBuyFromSolana ? evmPriceUsd : solanaPriceUsd;
        
        const buyQuoteSymbol = isBuyFromSolana ? solanaQuoteSymbol : evmQuoteSymbol;
        const sellQuoteSymbol = isBuyFromSolana ? evmQuoteSymbol : solanaQuoteSymbol;
        
        const buyQuotePrice = isBuyFromSolana ? solanaQuotePrice : evmQuotePrice;
        const sellQuotePrice = isBuyFromSolana ? evmQuotePrice : solanaQuotePrice;
        
        const buyLiquidityQuote = isBuyFromSolana ? solanaLiquidityQuote : evmLiquidityQuote;
        const sellLiquidityQuote = isBuyFromSolana ? evmLiquidityQuote : solanaLiquidityQuote;
        
        const buyQuoteLiquidityUsd = isBuyFromSolana ? solanaQuoteLiquidityUsd : evmQuoteLiquidityUsd;
        const sellQuoteLiquidityUsd = isBuyFromSolana ? evmQuoteLiquidityUsd : solanaQuoteLiquidityUsd;
        
        // ------------- Расчет максимально возможного объема арбитража -------------
        
        // С учетом цены quote токенов, рассчитываем максимальный объем арбитража в USD
        // Мы можем использовать до 50% quote ликвидности
        const maxBuyAmountUsd = buyQuoteLiquidityUsd * 0.5;
        const maxSellAmountUsd = sellQuoteLiquidityUsd * 0.5;
        
        const maxArbitrageAmountUsd = Math.min(maxBuyAmountUsd, maxSellAmountUsd);
        
        // Если максимальная сумма арбитража слишком мала, арбитраж невозможен
        const MIN_ARBITRAGE_AMOUNT_USD = 10; // Минимум $10 для арбитража
        if (maxArbitrageAmountUsd < MIN_ARBITRAGE_AMOUNT_USD) {
            return {
                hasSpread: false,
                reason: 'Недостаточная ликвидность для арбитража на минимальную сумму',
                maxArbitrageAmountUsd,
                minRequiredAmount: MIN_ARBITRAGE_AMOUNT_USD,
                quoteTokens: {
                    buy: {
                        network: buyNetwork,
                        symbol: buyQuoteSymbol,
                        price: buyQuotePrice,
                        amount: buyLiquidityQuote,
                        valueUsd: buyQuoteLiquidityUsd
                    },
                    sell: {
                        network: sellNetwork,
                        symbol: sellQuoteSymbol,
                        price: sellQuotePrice,
                        amount: sellLiquidityQuote,
                        valueUsd: sellQuoteLiquidityUsd
                    }
                }
            };
        }
        
        // Проверяем, достаточно ли ликвидности для запрошенной суммы
        const effectiveTradeAmount = Math.min(tradingAmountUsd, maxArbitrageAmountUsd);
        
        // Рассчитываем, сколько базовых токенов мы можем купить
        const tokensToBuy = effectiveTradeAmount / buyPrice;
        
        // ------------- Расчет влияния арбитража на цену (price impact) -------------
        
        // Расчет price impact для покупки токенов
        // При покупке base токенов за quote токены
        
        // Начальные данные пула для покупки
        const buyPoolBaseTokens = isBuyFromSolana ? solanaLiquidityBase : evmLiquidityBase;
        const buyPoolQuoteTokens = buyLiquidityQuote;
        
        // Начальная цена в пуле (quote/base)
        const initialBuyPrice = buyPoolQuoteTokens / buyPoolBaseTokens;
        
        // Константа пула k = x * y
        const buyK = buyPoolBaseTokens * buyPoolQuoteTokens;
        
        // Расчет required quote tokens для покупки tokensToBuy base токенов
        // dy = k/(x-dx) - y, где x - base токены, y - quote токены
        
        // Ограничиваем tokensToBuy до 99% пула, чтобы избежать деления на ноль
        const maxBuyTokens = buyPoolBaseTokens * 0.99;
        const effectiveBuyTokens = Math.min(tokensToBuy, maxBuyTokens);
        
        // Рассчитываем количество quote токенов, необходимое для покупки
        const quoteTokensRequired = (buyK / (buyPoolBaseTokens - effectiveBuyTokens)) - buyPoolQuoteTokens;
        
        // Средняя цена покупки с учетом price impact
        const avgBuyPrice = quoteTokensRequired / effectiveBuyTokens;
        
        // Price impact для покупки в процентах
        const buyPriceImpactPercent = ((avgBuyPrice - initialBuyPrice) / initialBuyPrice) * 100;
        
        // Цена покупки с учетом price impact (в USD)
        const effectiveBuyPriceUsd = buyPrice * (1 + buyPriceImpactPercent / 100);
        
        // ------------- Аналогично для продажи -------------
        
        // Начальные данные пула для продажи
        const sellPoolBaseTokens = isBuyFromSolana ? evmLiquidityBase : solanaLiquidityBase;
        const sellPoolQuoteTokens = sellLiquidityQuote;
        
        // Начальная цена в пуле (quote/base)
        const initialSellPrice = sellPoolQuoteTokens / sellPoolBaseTokens;
        
        // Константа пула k = x * y
        const sellK = sellPoolBaseTokens * sellPoolQuoteTokens;
        
        // Рассчитываем количество quote токенов, получаемое при продаже tokensToBuy base токенов
        // dy = y - k/(x+dx), где x - base токены, y - quote токены
        const quoteTokensReceived = sellPoolQuoteTokens - (sellK / (sellPoolBaseTokens + effectiveBuyTokens));
        
        // Средняя цена продажи с учетом price impact
        const avgSellPrice = quoteTokensReceived / effectiveBuyTokens;
        
        // Price impact для продажи в процентах
        const sellPriceImpactPercent = ((initialSellPrice - avgSellPrice) / initialSellPrice) * 100;
        
        // Цена продажи с учетом price impact (в USD)
        const effectiveSellPriceUsd = sellPrice * (1 - sellPriceImpactPercent / 100);
        
        // ------------- Расчет прибыльности арбитража -------------
        
        // Учитываем комиссии за бридж и свопы
        const bridgeFeePercent = 0.3; // ~0.3% за бридж
        const dexFeePercent = 0.3; // ~0.3% за своп на DEX
        const totalFeePercent = bridgeFeePercent + dexFeePercent * 2; // Учитываем своп дважды
        
        // Расчет спреда с учетом price impact
        const adjustedSpreadUsd = effectiveSellPriceUsd - effectiveBuyPriceUsd;
        const avgPrice = (buyPrice + sellPrice) / 2;
        const adjustedSpreadPercent = (adjustedSpreadUsd / avgPrice) * 100;
        
        // Чистая прибыль после учета комиссий
        const netProfitPercent = adjustedSpreadPercent - totalFeePercent;
        
        // Ожидаемая прибыль в USD для текущей суммы
        const expectedProfitUsd = (effectiveTradeAmount * netProfitPercent) / 100;
        
        // ------------- Поиск оптимальной суммы для арбитража -------------
        
        // Определяем возможные контрольные точки для проверки
        const MIN_TRADE_AMOUNT = 10; // Минимальная сумма $10
        const checkPoints = [
            MIN_TRADE_AMOUNT,
            maxArbitrageAmountUsd * 0.01, // 1% от максимума
            maxArbitrageAmountUsd * 0.05, // 5% от максимума
            maxArbitrageAmountUsd * 0.1,  // 10% от максимума
            maxArbitrageAmountUsd * 0.25, // 25% от максимума
            maxArbitrageAmountUsd * 0.5,  // 50% от максимума
            maxArbitrageAmountUsd * 0.75, // 75% от максимума
            maxArbitrageAmountUsd         // 100% от максимума
        ].filter(amount => amount >= MIN_TRADE_AMOUNT) // Отфильтровываем суммы меньше минимальной
         .sort((a, b) => a - b); // Сортируем по возрастанию
        
        // Если у нас недостаточно точек (все меньше минимальной), прекращаем поиск
        if (checkPoints.length === 0) {
            return {
                hasSpread: false,
                reason: 'Недостаточная ликвидность для арбитража на минимальную сумму',
                maxArbitrageAmountUsd,
                minRequiredAmount: MIN_TRADE_AMOUNT
            };
        }
        
        // Функция для расчета прибыли при заданной сумме
        function calculateProfitForAmount(amount) {
            // Количество токенов для покупки
            const tokensAmount = amount / buyPrice;
            
            // Расчет price impact для покупки
            let buyImpact = 0;
            if (tokensAmount < buyPoolBaseTokens * 0.99) {
                const quotePaid = (buyK / (buyPoolBaseTokens - tokensAmount)) - buyPoolQuoteTokens;
                const avgPrice = quotePaid / tokensAmount;
                buyImpact = ((avgPrice - initialBuyPrice) / initialBuyPrice) * 100;
            } else {
                buyImpact = 99; // Предельно высокий impact, если пытаемся купить почти весь пул
            }
            
            // Расчет price impact для продажи
            let sellImpact = 0;
            if (tokensAmount < sellPoolBaseTokens * 0.99) {
                const quoteReceived = sellPoolQuoteTokens - (sellK / (sellPoolBaseTokens + tokensAmount));
                const avgPrice = quoteReceived / tokensAmount;
                sellImpact = ((initialSellPrice - avgPrice) / initialSellPrice) * 100;
            } else {
                sellImpact = 99; // Предельно высокий impact, если пытаемся продать в маленький пул
            }
            
            // Цены с учетом impact
            const buyPriceWithImpact = buyPrice * (1 + buyImpact / 100);
            const sellPriceWithImpact = sellPrice * (1 - sellImpact / 100);
            
            // Спред и прибыль
            const spreadUsd = sellPriceWithImpact - buyPriceWithImpact;
            const spreadPercent = (spreadUsd / avgPrice) * 100;
            const profitPercent = spreadPercent - totalFeePercent;
            const profitUsd = (amount * profitPercent) / 100;
            
            return {
                amount,
                tokensAmount,
                buyImpact,
                sellImpact,
                buyPriceWithImpact,
                sellPriceWithImpact,
                spreadPercent,
                profitPercent,
                profitUsd
            };
        }
        
        // Находим оптимальную сумму для арбитража
        let optimalResult = null;
        let maxProfit = -Infinity;
        
        for (const amount of checkPoints) {
            const result = calculateProfitForAmount(amount);
            
            // Если прибыль больше и положительная, запоминаем эту сумму
            if (result.profitUsd > maxProfit && result.profitUsd > 0) {
                maxProfit = result.profitUsd;
                optimalResult = result;
            }
        }
        
        // Если не нашли прибыльного арбитража
        if (!optimalResult || optimalResult.profitUsd <= 0) {
            return {
                hasSpread: false,
                reason: 'Арбитраж невыгоден с учетом комиссий и price impact',
                rawSpread: {
                    evmPrice: evmPriceUsd,
                    solanaPrice: solanaPriceUsd,
                    diffPercent: ((Math.abs(evmPriceUsd - solanaPriceUsd) / avgPrice) * 100).toFixed(4)
                },
                bestResult: {
                    checkPoints: checkPoints.length,
                    maxProfit: maxProfit !== -Infinity ? maxProfit.toFixed(2) : '0.00'
                },
                quoteTokens: {
                    buy: {
                        network: buyNetwork,
                        symbol: buyQuoteSymbol,
                        price: buyQuotePrice,
                        amount: buyLiquidityQuote,
                        valueUsd: buyQuoteLiquidityUsd
                    },
                    sell: {
                        network: sellNetwork,
                        symbol: sellQuoteSymbol,
                        price: sellQuotePrice,
                        amount: sellLiquidityQuote,
                        valueUsd: sellQuoteLiquidityUsd
                    }
                }
            };
        }
        
        // Определяем, выгодно ли совершать арбитраж
        const MIN_PROFIT_THRESHOLD = 5.0; // Минимальный порог прибыльности (1%)
        const MIN_PROFIT_USD = 5; // Минимальная прибыль в USD
        
        const isProfitable = optimalResult.profitPercent > MIN_PROFIT_THRESHOLD && 
                             optimalResult.profitUsd     > MIN_PROFIT_USD;
        
        if (!isProfitable) {
            return {
                hasSpread: false,
                reason: 'Недостаточная прибыль для арбитража',
                bestResult: {
                    amountUsd: optimalResult.amount.toFixed(2),
                    profitUsd: optimalResult.profitUsd.toFixed(2),
                    profitPercent: optimalResult.profitPercent.toFixed(4),
                    minProfitThreshold: MIN_PROFIT_THRESHOLD,
                    minProfitUsd: MIN_PROFIT_USD
                }
            };
        }
        
        // Определяем направление арбитража
        const direction = isBuyFromSolana ? `solana → ${token.evm.chain}` : `${token.evm.chain} → solana`;
        
        // ------------- Формирование результата -------------
        
        return {
            hasSpread: true,
            token: token.symbol,
            evmChain: token.evm.chain,
            rawSpread: {
                evmPrice: evmPriceUsd,
                solanaPrice: solanaPriceUsd,
                diffPercent: ((Math.abs(evmPriceUsd - solanaPriceUsd) / avgPrice) * 100).toFixed(4)
            },
            adjustedPrices: {
                buyPrice: optimalResult.buyPriceWithImpact.toFixed(8),
                sellPrice: optimalResult.sellPriceWithImpact.toFixed(8),
                direction
            },
            priceImpact: {
                buyImpactPercent: optimalResult.buyImpact.toFixed(4),
                sellImpactPercent: optimalResult.sellImpact.toFixed(4)
            },
            profitability: {
                adjustedSpreadPercent: optimalResult.spreadPercent.toFixed(4),
                fees: {
                    bridgeFeePercent: bridgeFeePercent.toFixed(2),
                    dexFeePercent: dexFeePercent.toFixed(2),
                    totalFeePercent: totalFeePercent.toFixed(2)
                },
                netProfitPercent: optimalResult.profitPercent.toFixed(4),
                isProfitable
            },
            tradingVolume: {
                maxTradeAmountUsd: maxArbitrageAmountUsd.toFixed(2),
                optimalAmountUsd: optimalResult.amount.toFixed(2),
                optimalTokenAmount: optimalResult.tokensAmount.toFixed(6),
                expectedProfitUsd: optimalResult.profitUsd.toFixed(2),
                expectedProfitPercent: optimalResult.profitPercent.toFixed(4),
                nativeAmount: {
                    symbol: buyQuoteSymbol,
                    amount: (buyQuoteSymbol === 'USDC' || buyQuoteSymbol === 'USDT' || buyQuoteSymbol === 'DAI')
                        ? optimalResult.amount.toFixed(2)  // Если стейблкоин, то сумма такая же как в USD
                        : (optimalResult.amount / buyQuotePrice).toFixed(6)  
                }
            },
            quoteTokens: {
                buy: {
                    network: buyNetwork,
                    symbol: buyQuoteSymbol,
                    price: buyQuotePrice.toFixed(4),
                    amount: buyLiquidityQuote.toFixed(6),
                    valueUsd: buyQuoteLiquidityUsd.toFixed(2)
                },
                sell: {
                    network: sellNetwork,
                    symbol: sellQuoteSymbol,
                    price: sellQuotePrice.toFixed(4),
                    amount: sellLiquidityQuote.toFixed(6),
                    valueUsd: sellQuoteLiquidityUsd.toFixed(2)
                }
            },
            liquidity: {
                evm: {
                    usd: evmLiquidityUsd,
                    base: evmLiquidityBase,
                    quote: evmLiquidityQuote,
                    quoteSymbol: evmQuoteSymbol,
                    quoteValueUsd: evmQuoteLiquidityUsd
                },
                solana: {
                    usd: solanaLiquidityUsd,
                    base: solanaLiquidityBase,
                    quote: solanaLiquidityQuote,
                    quoteSymbol: solanaQuoteSymbol,
                    quoteValueUsd: solanaQuoteLiquidityUsd
                }
            },
            timestamp: new Date().toISOString()
        };
    }
    
    findAllSpreads(tokens) {
        const spreads = [];
        const noSpreadsTokens = [];
        
        tokens.forEach(token => {
            const spreadInfo = this.calculateSpread(token);
            
            if (spreadInfo.hasSpread) {
                spreads.push({
                    ...spreadInfo,
                    token: token 
                });
            } else {
                noSpreadsTokens.push({
                    symbol: token.symbol,
                    reason: spreadInfo.reason,
                    ...spreadInfo
                });
            }
        });
        
        spreads.sort((a, b) => parseFloat(b.spreadPercent) - parseFloat(a.spreadPercent));
        
        return {
            spreads,
            noSpreadsTokens,
            totalTokens: tokens.length,
            totalSpreads: spreads.length,
            timestamp: new Date().toISOString()
        };
    }

    generateDexScreenerUrl(batch) {
        return `https://api.dexscreener.com/tokens/v1/${batch.chainId}/${batch.addresses.join(',')}`;
    }


    spreadMessage(data) {
        const { token, evmChain, adjustedPrices, priceImpact, profitability, liquidity, tradingVolume } = data

        const text = `$${token.symbol} / ${adjustedPrices.direction} / ${parseFloat(tradingVolume.expectedProfitPercent).toFixed(2)}%
        
Prices:
- Buy:  <code>${this.formatPrice(adjustedPrices.buyPrice)}</code> (impact: ${parseFloat(priceImpact.buyImpactPercent).toFixed(2)}%)
- Sell:  <code>${this.formatPrice(adjustedPrices.sellPrice)}</code> (impact: ${parseFloat(priceImpact.sellImpactPercent).toFixed(2)}%)  

Liquidity:
- Evm: $${liquidity.evm.quoteValueUsd.toFixed(2)} (${liquidity.evm.quote} ${liquidity.evm.quoteSymbol})
- Sol: $${liquidity.solana.quoteValueUsd.toFixed(2)} (${liquidity.solana.quote} ${liquidity.solana.quoteSymbol})

Optimal bridge amount: $${tradingVolume.optimalAmountUsd} (${tradingVolume.nativeAmount.amount} ${tradingVolume.nativeAmount.symbol})
Expected profit: $${tradingVolume.expectedProfitUsd}

${this.capitalizeFirstLetter(token.evm.chain)}:\n<code>${token.evm.address}</code>

Solana:\n<code>${token.solana.address}</code>

<a href="https://jup.ag/swap/SOL-${token.solana.address}?referrer=8q4X9PSrYiVemcBjBBbLUu51Vm4fDsWbzVGhFKpRm7aW&feeBps=50">Jupiter</a> | <a href="https://t.me/kncmn_wormhole_bot">Buy&Transfer</a> | <a href="https://swap.defillama.com/?chain=${evmChain}&from=0x0000000000000000000000000000000000000000&tab=swap&to=${token.evm.address}">DefiLiama</a>
        `

        const keyboard = {reply_markup: {inline_keyboard: [
            [{text: this.capitalizeFirstLetter(token.evm.chain) + ' chart', url: token.evm.screener.url}, {text: 'Wormhole', url: `https://portalbridge.com/advanced-tools/#/transfer`}, {text: 'Solana chart', url: token.solana.screener.url}]
        ]}}

        return { text, keyboard }


    }


    formatPrice(value) {
        if (!value) return null
        
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return null;
        
        const absValue = Math.abs(numValue);
        const decimals = Math.max(2, 3 - Math.floor(Math.log10(absValue)));
    
        return numValue.toFixed(decimals);
    }

    capitalizeFirstLetter(string) {
        if (!string || string.length === 0) return string;
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

module.exports = new UTILS(connection, priceManager)