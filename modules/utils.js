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
    

    capitalizeFirstLetter(string) {
        if (!string || string.length === 0) return string;
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

module.exports = new UTILS(connection, priceManager)
