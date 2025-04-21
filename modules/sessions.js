const utils     = require('./utils')

const Websocket = require('ws')

class SESSION {
    constructor(tx,  bot, database, terminate) {
        this.tx         = tx
        this.bot        = bot
        this.utils      = utils
        this.database   = database
        this.terminate  = terminate

        this.socket     = null
        this.isActive   = true

        this.sessionData = this.initializeSessionData()
    }

    initializeSessionData() {
        return {
            bridge: null,
            account: null,
            messageId: null,
            mint: null,
            originalAsset: null,
            symbol: null,
            liquidity: null,
            holders: null,
            evmData: {}
        };
    }

    logStage(stage) {
        console.log(`[Session ${this.tx}] - ${stage}`);
    }

    handleError(error, message) {
        console.error(message, error);
        this.terminate(this.tx, message);
    }

    async init(data) {
        try {
            if (this.utils.blackMint.includes(data.parsedInstruction.namedAccounts.mint)) 
                return this.terminate(this.tx, 'blackListed');

            this.sessionData.bridge = data;
            await this.utils.initWormhole();
            await this.processAction(data.parsedInstruction.wormholeDecoded.name);
        } catch (error) {
            this.handleError(error, 'Error in init');
        }
    }
    
    async processAction(data) {
        try {
            const actions = {
                transferWrapped:   async() => await this.processTransfer(),
                completeWrapped:   async() => await this.processComplete(),
                createWrapped:     async() => await this.processCreate(),
            }

            await actions[data]()
        } catch (error) {
            this.handleError(error, 'Error in processAction');
        }
    }

    async processCreate() {
        try {
            this.logStage('Processing create');
            
            this.sessionData.mint = this.sessionData.bridge.parsedInstruction.namedAccounts.mint;
            this.sessionData.originalAsset = await this.utils.getOriginalAsset(this.database, this.sessionData.mint);

            this.sessionData.symbol = await this.utils.getTokenSymbol(this.sessionData.mint);
            const prepareData = await this.utils.prepareCreateData(
                this.sessionData.bridge,
                this.sessionData.originalAsset,
                this.sessionData.symbol
            );

            await this.checkOrCreate(
                this.sessionData.mint,
                this.sessionData.originalAsset,
                this.sessionData.symbol,
                'new',
                false
            );

            await this.bot.sendMessage(this.utils.chatId, prepareData.text, {message_thread_id: prepareData.thread_id, parse_mode: 'HTML', ...prepareData.keyboard})
            return this.terminate(this.tx, 'Succesfully completed');
        } catch (error) {
            this.handleError(error, 'Error in processCreate');

        }
    }

    async processTransfer() {   
        try {
            this.logStage('Processing transfer');
            const { targetChain } = this.sessionData.bridge.parsedInstruction.wormholeDecoded.data;

            if (!this.utils.chains.hasOwnProperty(targetChain)) 
                return this.terminate(this.tx, 'No chain included');


            this.sessionData.mint = this.sessionData.bridge.parsedInstruction.namedAccounts.mint;
            this.sessionData.originalAsset = await this.utils.getOriginalAsset(this.database, this.sessionData.mint);

            if (!this.sessionData.originalAsset) 
                return this.terminate(this.tx, 'Original asset not found');
            

            this.sessionData.symbol = await this.utils.getTokenSymbol(this.sessionData.mint);
            const prepareData = await this.utils.prepareTransferData(
                this.sessionData.bridge,
                this.sessionData.originalAsset,
                this.sessionData.symbol
            );

            await this.bot.sendMessage(this.utils.chatId, prepareData.text, {
                parse_mode: 'HTML',
                message_thread_id: prepareData.thread_id,
                ...prepareData.keyboard,
            });

            return this.terminate(this.tx, 'Succesfully completed');
        } catch (error) {
            this.handleError(error, 'Error in processTransfer');
        }
    }



    async processComplete() {
        try {
            this.logStage('Processing complete');

            this.sessionData.mint = this.sessionData.bridge.parsedInstruction.namedAccounts.mint;
            this.sessionData.originalAsset = await this.utils.getOriginalAsset(this.database, this.sessionData.mint);

            const chainKey = Object.values(this.utils.chains).find(
                (key) => key.name == this.sessionData.originalAsset?.chain
            );

            if (!this.sessionData.originalAsset || !chainKey) 
                return this.terminate(this.tx, 'Original asset not found');


            this.sessionData.symbol    = await this.utils.getTokenSymbol(this.sessionData.mint);
            this.sessionData.liquidity = await this.utils.checkForSolLiq(this.sessionData.mint);
            this.sessionData.holders   = await this.utils.checkHolders(this.sessionData.mint)


            const shouldHandleNewBridge = !this.sessionData.liquidity && this.sessionData.holders;

            if (shouldHandleNewBridge) {
                await this.handleNewBridge();
            } else {
                await this.checkOrCreate(
                    this.sessionData.mint,
                    this.sessionData.originalAsset,
                    this.sessionData.symbol,
                    'completed',
                    this.sessionData.liquidity
                );
                await this.sendBridgeMessage(false);
                return this.terminate(this.tx, 'completed');
            }
        } catch (error) {
            this.handleError(error, 'Error in processComplete');
        }
    }


    async handleNewBridge() {
        try {
            this.sessionData.account = await this.database.bridges.findOne({
                where: { solanaAddress: this.sessionData.mint },
            });
    
    
            if (!this.sessionData.account || this.sessionData.account.status === 'new') {
                await this.checkOrCreate(
                    this.sessionData.mint,
                    this.sessionData.originalAsset,
                    this.sessionData.symbol,
                    'new',
                    false
                );
    
                await this.sessionData.account.update({ status: 'processing' });
    
                this.sessionData.evmData = await this.utils.evmData(this.tx, this.sessionData.originalAsset) ?? {}
    
                if (this.sessionData.evmData) {
                    await this.sessionData.account.update({ creator: this.sessionData.evmData.creator });
                }
    
                await this.sendBridgeMessage(true)

                this.utils.alert()

                await this.startTrackLiquidity()
            } else {
                await  this.sendBridgeMessage(false)
                return this.terminate(this.tx, 'Not new bridge');
            }
        } catch (error) {
            this.handleError(error, 'Error in handleNewBridge');
        }
    }

    async sendBridgeMessage(isNew) {
        try {
            const prepareMessageData = await this.utils.prepareCompleteData(
                this.sessionData,
                isNew
            )

            if (!prepareMessageData) 
                return this.terminate(this.tx, 'Not chain included');

            await this.bot.sendMessage(this.utils.chatId, prepareMessageData.text, {message_thread_id: prepareMessageData.thread_id, parse_mode: 'HTML', ...prepareMessageData.keyboard})
        } catch (error) {
            console.log(error)

        }
    }

    async initializationSocketBridge(data) {
        try {
            this.sessionData = {
                account: data,
                mint: data.solanaAddress,
                originalAsset: { chain: data.evmChain, address: data.evmAddress },
                symbol: data.symbol,
            }
            
            await this.startTrackLiquidity()
        } catch (error) {
            console.log(error)
        }
    }

    async startTrackLiquidity() {
        try {
            if (!this.isActive) return

            this.socket = new Websocket(`ws://basic.rpc.solanavibestation.com/?api_key=9c2343f11090caa4e93e7b46e7d828d3`)

            this.socket.on('open', () => {
                if (!this.isActive) {
                    this.socket.terminate()
                    return;
                }

                this.socket.send(JSON.stringify(this.utils.subscribeMessage(this.sessionData.mint)));
                this.pingInterval = setInterval(() => this.socket.ping(), 30000); 
            });
            
            this.socket.on('message', async(data) => this.isActive && await this.handleWsMessage(JSON.parse(data)))

            this.socket.on('error', () => this.socket.close())

            this.socket.on('close', () => {
                clearInterval(this.pingInterval)
                setTimeout(() => this.isActive && this.startTrackLiquidity(), 3000);
            });

        } catch (error) {
            console.log(error)
        }
    }

    async handleWsMessage(data) {
        try {
            if (data?.method == 'logsNotification') {

                const { signature, err, logs } =  data?.params?.result?.value

                if (err) return

                const result = this.utils.checkLogsForPatterns(logs)

                if (result.type == 'none') return

                const prepareMessageData = await this.utils.prepareLiqData(this.sessionData, signature, result.type)
                
                if (!prepareMessageData) return

                await this.bot.sendMessage(this.utils.chatId, prepareMessageData.text, {message_thread_id: prepareMessageData.thread_id, parse_mode: 'HTML', disable_web_page_preview: true, ...prepareMessageData.keyboard})
                
                await this.sessionData.account.update({status: 'completed', liquidity: true})
                
                this.isActive = false
                this.utils.alert()
                
                return this.terminate(this.tx, result.type + 'completed');
            }

        } catch (error) {
            console.log(error)
        }
    }

    async checkOrCreate(mint, originalAsset, symbol, status = 'completed', liquidity = false, creator = false) {
        try {
            this.sessionData.account = await this.database.bridges.findOne({where: { solanaAddress: mint }})

            if (!this.sessionData.account)
                 this.sessionData.account = await this.database.bridges.create({
                    tx: this.tx,
                    status, liquidity, symbol,
                    evmChain: originalAsset.chain,
                    evmAddress: originalAsset.address,
                    solanaAddress: mint, creator
                })

            if (this.sessionData.account.status == 'completed' || this.sessionData.account.status == 'processing')
                return this.terminate(this.tx, 'Succesfully completed');

        } catch (error) {
            console.error('Error in checkOrCreate:', error);
            return null;
        }
    }
}

class SESSIONS {
    constructor(bot, database) {
        this.bot        = bot
        this.database   = database

        this.sessions   = {}

        this.terminateCallback = (tx, reason) => this.terminate(tx, reason)
    }

    new(tx) {
        if (!this.sessions[tx])
             this.sessions[tx] = new SESSION(tx, this.bot, this.database, this.terminateCallback)

        return this.sessions[tx]
    }

    get(tx) {
        return this.sessions[tx] ?? null
    }

    async terminate(tx, reason) {
        if (this.sessions[tx]) {
            this.sessions[tx].isActive = false

            if (this.sessions[tx].socket) {
                this.sessions[tx].socket.terminate()
            }

            delete this.sessions[tx];
        }
    
        console.log(`[Session ${tx}] - ${reason}`);
        return true;
    }
}

module.exports = SESSIONS