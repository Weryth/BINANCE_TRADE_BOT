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
    const {support_level} = await findLevels();
    if (price <= support_level) {
        return true;
    }
    return false;
}

// функция проверки условий для продажи
const checkSellCondition = async () => {
    const ticker = await exchange.fetchTicker(symbol);
    const price = ticker.bid;

    console.log(price);
    
    const {resistance_level} = await findLevels();

    console.log(resistance_level)

    if (price >= resistance_level) {
        return true;
    }
    return false;
}

// функция определения цены для stop-loss и take-profit ордеров
const calculatePrice = (price, percent) => {
    return price * (1 + percent);
}

// функция запуска бота
const startBot = async () => {
    while (true) {

        let price = 0;
        let sl_price = 0;
        
        if (await checkBuyCondition()) {
            const ticker = await exchange.fetchTicker(symbol);
            price = ticker.ask;
            //price = price + price * 0.0002
            console.log(price);

            sl_price = calculatePrice(price, -stop_loss);
            //sl_price = sl_price + sl_price * 0.02
            console.log(sl_price);
            
            const tp_price = calculatePrice(price, take_profit);
            console.log(tp_price)


            const buy_order = await exchange.createLimitBuyOrder(symbol, 0.0004, price);
            const sell_order = await exchange.createLimitSellOrder(symbol, 0.0004, tp_price, {'type': 'TAKE_PROFIT_LIMIT'});
            

            console.log('Buy order created: ', buy_order);
            console.log('Sell order created: ', sell_order);
            
        } else if (await checkSellCondition()) {
            // const ticker = await exchange.fetchTicker(symbol);
            // const price = ticker.bid;
            console.clear();
            console.log("Цена ниже уровня поддержки")
            // const sell_order = await exchange.createMarketSellOrder(symbol, 0.001);
            // console.log('Sell order created: ', sell_order);
        }
        while(new Promise(resolve => setTimeout(resolve, 15*60*1000))){
            //console.clear()
            try{
                const ticker_sl = await exchange.fetchTicker(symbol);
                let price2 = ticker_sl.ask;
                console.log(price2, sl_price)
                if(price2 <= sl_price){

                    exchange.cancelAllOrders(symbol)
                    const sl_order = await exchange.createMarketSellOrder(symbol, 0.0005)
                    console.clear()
                    console.log('Stop loss order complete: ', sl_order);

                }
            } catch(e) {
                console.log(e);
            }
                
        }
        //await new Promise(resolve => setTimeout(resolve, 60*60*1000)); // ждем 1 час перед повторной проверкой
    }
}


startBot();
console.log("bot has been started");