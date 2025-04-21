const utils = require('./utils')

class Telegram {
    constructor( bot ) {
        this.bot      = bot      
        this.utils    = utils

        this.sessions = null

    }

    async message(msg, sessions) {
        this.sessions = sessions
        
        try {
            const { text, chat: { id }, message_id, message_thread_id } = msg

            if (text == '/sessions') {
                const sessionsMessage = this.processSessionMessage()

                return this.bot.sendMessage(id, 'Sessions', {...sessionsMessage.keyboard, message_thread_id})
            }
        } catch (error) {
            console.log(error)
        }
    } 

    async callback(msg, sessions) {
        this.sessions = sessions

        try {
            console.log(msg)
    
            const { data, message: {chat: { id }, message_id, message_thread_id}} = msg

            if (data.startsWith('session_')) {
                const mint = data.split('_')[1]

                const message = this.processSessionData(mint)

                if (!message)
                    return this.bot.answerCallbackQuery(msg.id, 'Cant get info about this session', true)

                return this.bot.editMessageText(message.text, {chat_id: id, message_id, message_thread_id, ...message.keyboard, parse_mode: 'HTML'})
            } 

            if (data.startsWith('terminate_') || data.startsWith('new_')) {
                const action = data.split('_')[0],
                      mint   = data.split('_')[1]

                if (msg.from.id != '7020403301') 
                    return this.bot.answerCallbackQuery(msg.id, 'You dont have access to this action', true)


                const session = this.getSession(mint)

                if (!session)
                    return this.bot.answerCallbackQuery(msg.id, 'Cant get info about this session', true)

                await session.account.update({status: action})
                await session.terminate(session.tx, 'closed by telegram')

                const sessionsMessage = this.processSessionMessage()
                return this.bot.editMessageText('Sessions', {chat_id: id, message_id, message_thread_id, ...sessionsMessage.keyboard, parse_mode: 'HTML'})

            }

            if (data == 'sessions') {
                const sessionsMessage = this.processSessionMessage()
                return this.bot.editMessageText('Sessions', {chat_id: id, message_id, message_thread_id, ...sessionsMessage.keyboard, parse_mode: 'HTML'})
            }
        
        } catch (error) {
            console.log(error)
        }
    }


    processSessionData(mint) {
        try {
            const session = this.getSession(mint);
            if (!session) return null;

            return this.sessionMessage(session);
        } catch (error) {
            console.error('Error in processSessionData:', error);
            return null;
        }
    }

    getSession(mint) {
        try {
            const session = Object.values(this.sessions).find(
                (session) => session?.sessionData?.mint === mint
            );
            
            if (!session) return null;

            return { tx: session?.tx, ...session?.sessionData, terminate: session.terminate };
        } catch (error) {
            console.error('Error in getSession:', error);
            return null;
        }
    }

    processSessionMessage() {
        try {
            const sessionsData = Object.values(this.sessions).map(session => {
                return {
                    tx: session.tx,
                    ...session.sessionData
                }
            })

            return this.keyboard(sessionsData)
        } catch (error) {
            console.log(error)
            return null
        }
    }

    sessionMessage(data) {
        try {
            const { tx, account, mint, originalAsset, symbol } = data
            
            const targetChain = Object.values(this.utils.chains).find(
                (chain) => chain.name === originalAsset.chain
            );

            if (!targetChain) return null

            const text = `<b>$${symbol} | ${account?.creator ? '🛑 BRIDGED BY DEPLOYER' : 'BRIDGE'}</b>

<b>Transfer to chain:</b> Solana

<b>EVM Address:</b> <code>${originalAsset.address}</code>

<b>Solana Address:</b> <code>${mint}</code>

<b>Token EVM original:</b> ${originalAsset.chain}
    `

            const keyboard = [
                [
                    {text: 'Solana tx', url: 'https://solscan.io/tx/' + tx}
                ],

                [
                    {text: originalAsset.chain + ' contract', url: targetChain.explorer + 'token/' + originalAsset.address}, 
                    {text: 'Solana contract', url: this.utils.chains[1].explorer + 'account/' + mint}
                ],
    
                [
                    {text: targetChain.name + ' chart', url: `https://dexscreener.com/` + targetChain.screener + '/' + originalAsset.address}, 
                    {text: 'Solana chart', url: `https://dexscreener.com/` + this.utils.chains[1].screener + '/' + mint}
                ],

                [
                    {text: 'Terminate', callback_data: 'terminate_' + mint},
                    {text: 'New', callback_data: 'new_' + mint},
                ],
                [
                    {text: '< back', callback_data: 'sessions'}
                ]
            ]

            return {
                text,
                keyboard: { reply_markup: { inline_keyboard: keyboard } },
            };
        } catch (error) {
            console.log(error)
            return null
        }
    }

    keyboard(data) {
        try {
            const keyboard = data.reduce((rows, item, index) => {
                const button = {
                    text: `${item.originalAsset.chain} - ${item.symbol}`,
                    callback_data: 'session_' + item.mint,
                };

                if (index % 2 === 0) {
                    rows.push([button]);
                } else {
                    rows[rows.length - 1].push(button);
                }

                return rows;
            }, []);

            return {
                keyboard: {
                    reply_markup: { inline_keyboard: keyboard }
                }
            }; 
        } catch (error) {
            console.error('Error in keyboard generation:', error);
            return null;
        }
    }
}

module.exports = Telegram