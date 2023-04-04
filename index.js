const ccxt = require('ccxt');
require('dotenv').config()

let key = process.env.APIKEY;
let secret = process.env.SECRET;

const exchange = new ccxt.binance({
    apiKey: key,
    secret: secret
});

// настройки бота
const symbol = 'BTCUSDT';
const stop_loss = 0.002;
const take_profit = 0.005;
const level_diff = 50;
let amount = 0.0004;

let logger = []

let counter = 0;

// функция для определения уровней поддержки и сопротивления
const findLevels = async () => {
    const ohlcv = await exchange.fetchOHLCV(symbol, '15m');
    const closes = ohlcv.map(item => item[4]);
    const high = Math.max(...closes);
    const low = Math.min(...closes);
    const diff = high - low;
    const support_level = low + diff/2 - level_diff;
    const resistance_level = high - diff/2 + level_diff;
    return {support_level, resistance_level};
}

// функция проверки условий для покупки
const checkBuyCondition = async () => {
    const ticker = await exchange.fetchTicker(symbol);
    const price = ticker.ask;
    //console.log(price)
    
    logger[0] = `Цена ${price}`;
    const {support_level} = await findLevels();
    logger[1] = `Уровень поддержки ${support_level}`;

    //console.log(support_level)
    if (price <= support_level) {
        return true;
    }
    return false;
}

// функция проверки условий для продажи
const checkSellCondition = async () => {
    const ticker = await exchange.fetchTicker(symbol);
    const price = ticker.bid;

    //console.log(price);
    
    const {resistance_level} = await findLevels();
    
    //console.log(resistance_level)

    if (price >= resistance_level) {
        return true;
    }
    return false;
}

// функция определения цены для stop-loss и take-profit ордеров
const calculatePrice = (price, percent) => {
    return price * (1 + percent);
}

const delay = (time) =>{
    return new Promise(resolve => setTimeout(resolve, time*60*1000));
}

const  balanceUSDT = async () =>{
    const balance = await exchange.fetchBalance();
    const usdtBalance = balance.total.USDT; // получить общий баланс USDT
    console.log(usdtBalance);
    
    return usdtBalance;
}

// функция запуска бота
const startBot = async () => {
    while (true) {
        let i = await checkBuyCondition()
        //console.log(i)
        let price = 0;
        let sl_price = 0;
        

        let lastTime = new Date().getTime();
        let delayFlag = true;

        if (await checkBuyCondition()) {
            const ticker = await exchange.fetchTicker(symbol);
            price = ticker.ask;
            //price = price + price * 0.0002
            //console.log(price);
            logger[0] = `Цена ${price}`;
            
            sl_price = calculatePrice(price, -stop_loss);
            //sl_price = sl_price + sl_price * 0.02
            //console.log(sl_price);
            logger[2] = `Стоп-лосс цена ${sl_price}`;
            const tp_price = calculatePrice(price, take_profit);
            //console.log(tp_price)
            logger[3] = `Тейк-проффит цена ${tp_price}`;


            const buy_order = await exchange.createLimitBuyOrder(symbol, amount, price);
            const sell_order = await exchange.createLimitSellOrder(symbol, amount, tp_price, {'type': 'TAKE_PROFIT_LIMIT'});
            

            //console.log('Buy order created: ', buy_order);
            logger[4] = buy_order;
            //console.log('Sell order created: ', sell_order);
            logger[5] = sell_order;

            
            
        }
        while( delayFlag ){
            //console.clear()
            try{
                const ticker_sl = await exchange.fetchTicker(symbol);
                let price2 = ticker_sl.ask;
                
                
                //console.log(price2, sl_price)
                if(price2 <= sl_price){

                    exchange.cancelAllOrders(symbol)
                    const sl_order = await exchange.createMarketSellOrder(symbol, amount)
                    console.clear()
                    console.log('Stop loss order complete: ', sl_order);
                    delayFlag = false;
                    
                }

            } catch(e) {
                console.log(e);
            }
            const currentTime = new Date().getTime();
            const elapsedTime = currentTime - lastTime;

            
            logger[6] = `Время проверки: ${elapsedTime} из ${15 * 60 * 1000}`
            console.clear();
            for (j in logger) {
                console.log(logger[j]) 
            }
            //console.log(elapsedTime)
            if(elapsedTime > 15 * 60 * 1000){
                delayFlag = false;
            }
                
        }
        //await new Promise(resolve => setTimeout(resolve, 60*60*1000)); // ждем 1 час перед повторной проверкой
    }
}


startBot();
console.log("bot has been started");