const Client                     = require('@triton-one/yellowstone-grpc'),
      client                     = new Client.default(`http://grpc.solanavibestation.com:10000`, undefined, undefined)
      
const TelegramApi                = require('node-telegram-bot-api'),
      bot                        = new TelegramApi('7044647177:AAFsp0GBqZZj7zr89Oo9-7gSiohEpWgos_U', {polling: true})

const { parseSolanaTransaction } = require('./parser/parseTx.mjs')

const SESSIONS                   = require('./modules/sessions'),
      DATABASE                   = require('./db/index'),
      TELEGRAM                   = require('./modules/telegram'),
      SPREADS                    = require('./modules/spreads')

const PriceManager               = require('./modules/prices')
const utils                      = require('./modules/utils')

const SessionsManager            = new SESSIONS(bot, DATABASE)
const TelegramManager            = new TELEGRAM(bot)
const SpreadsManager             = new SPREADS(bot, DATABASE, utils, PriceManager)




bot.on('message', async(msg) => await TelegramManager.message(msg, SessionsManager.sessions).catch(console.error))
bot.on('callback_query', async(msg) => await TelegramManager.callback(msg, SessionsManager.sessions).catch(console.error))

async function loadBridges() {
    const bridges = await DATABASE.bridges.findAll({where: { status: 'processing' }})

    if (bridges.length == 0) return

    bridges.forEach(async(bridge) => {
        const session = SessionsManager.new(bridge.tx)
        await session.initializationSocketBridge(bridge)
    })
}


async function handleStreamData(data) {
    if (!data?.transaction) return;

    const parsedTransaction = parseSolanaTransaction(data?.transaction)

    if (!parsedTransaction || !parsedTransaction?.parsedInstruction)  {
        // console.log('Cant parse transaction', parsedTransaction.signature)
        return null
    }

    if (!['transferWrapped', 'completeWrapped', 'createWrapped'].includes(parsedTransaction?.parsedInstruction?.wormholeDecoded?.name)) {
        // console.log('Name instruction is not accepted', parsedTransaction.signature)
        return null
    }

    const session = SessionsManager.new(parsedTransaction.signature)
    await session.init(parsedTransaction)
}

function getSubscriptionRequest() {
    return {
        accounts: {},
        slots: {},
        transactions: {
            bridge: {
                vote: false,
                failed: false,
                signature: undefined,
                accountInclude: [`wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb`],
                accountExclude: [],
                accountRequired: [],
            }
        },
        transactionsStatus: {},
        entry: {},
        blocks: {},
        blocksMeta: {},
        accountsDataSlice: [],
        ping: undefined,
        commitment: Client.CommitmentLevel.PROCESSED,
    };
}

async function restartGeyser() {
    console.log('Stream ended, restarting in 1 second...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    startGeyser();
}

async function startGeyser() {
    const stream = await client.subscribe();
  
    stream.on('error', (error) => console.error('Stream error:', error));
  
    stream.on('end', restartGeyser);
  
    stream.on('data', handleStreamData);
  
    const request = getSubscriptionRequest();
    await new Promise((resolve, reject) => {
        stream.write(request, (err) => {
            if (err) {
                console.error('Error subscribing to token transactions:', err);
                return reject(err);
            }
            resolve();
        });
    });
}
  
// startGeyser().catch(console.error);
// loadBridges().catch(console.error)
SpreadsManager.start().catch(console.error)
