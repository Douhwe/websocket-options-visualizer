import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip } from 'chart.js';
import 'chartjs-adapter-moment';
import './App.css';


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, TimeScale, Tooltip);


function App() {
  const [stockData, setStockData] = useState({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [showInformation, setShowInformation] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META', 'TSLA', 'NFLX', 'INTC', 'AMD'];


  useEffect(() => {
    setHistoricalData([]); // Reset Graph when different Ticker is Selected
    const FINNHUB_API_KEY = 'cmjm1lpr01qo8idm610gcmjm1lpr01qo8idm6110';
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);
  
    ws.onopen = () => {
        console.log('WebSocket Connected');
        // Ensure that the WebSocket is open before sending the message
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 'type': 'subscribe', 'symbol': selectedSymbol }));
        }
      };
  
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade' && data.data) {
        const tradeData = data.data[0];
        const symbol = tradeData.s;
        const price = tradeData.p;
        const timestamp = tradeData.t;
        const estDateTime = convertTimestampToEST(timestamp);
        const optionPrice = blackScholes(price, strikePrice, timeToExpiration, riskFreeRate, volatility);
  
        setHistoricalData(oldData => [...oldData, {
            timestamp: estDateTime,
            price: price,
            optionPrice: optionPrice
          }]);

        setStockData({
            symbol: symbol,
            price: price,
            timestamp: estDateTime,
            optionPrice: optionPrice
          });
        }
      };

      

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
        // Check if WebSocket is open before trying to send a message
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ 'type': 'unsubscribe', 'symbol': selectedSymbol }));
        }
        ws.close();
      };
      
  }, [selectedSymbol]); // Dependency array includes selectedSymbol
const isMarketOpen = () => {
    const estTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = estTime.getHours();
    const day = estTime.getDay();

    // Stock market is open from Monday (1) to Friday (5) from 9:30 AM to 4:00 PM EST
    return day >= 1 && day <= 5 && hours >= 9 && (hours < 16 || (hours === 16 && estTime.getMinutes() === 0));
  };
  
  function erf(x) {
    // Constants
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
  
    // Save the sign of x
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
  
    // A&S formula 7.1.26
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
    return sign * y;
  }

  function normCDF(value) {
    return 0.5 * (1 + erf(value / Math.sqrt(2)));
  }
  
  // Black-Scholes formula for call options
  function blackScholes(S, K, T, r, sigma) {
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  }
  
  // Example usage
  const strikePrice = 100.00;
  const timeToExpiration = 0.25; // in years
  const riskFreeRate = 0.015;
  const volatility = 0.20;


  function convertTimestampToEST(timestamp) {
    const date = new Date(timestamp);
    const options = { 
      timeZone: 'America/New_York', 
      year: 'numeric', month: 'numeric', day: 'numeric', 
      hour: 'numeric', minute: 'numeric', second: 'numeric'
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
  
    return () => clearInterval(interval); // Clear interval on component unmount
  }, []); // Empty dependency array ensures this effect runs only once on mount

  
  const handleSymbolChange = (event) => {
    setSelectedSymbol(event.target.value);
  };

  const handleDisclaimerClick = () => {
    if (showDisclaimer) {
        setShowDisclaimer(false);
    }
    else {
        setShowDisclaimer(true);
    }
  };

  const handleModelClick = () => {
    setShowModel(!showModel)
  }

  const handleInformationClick = () => {
    setShowInformation(!showInformation)
  }


  return (
    <div className="App">
      <header className="header-container">
        <div className="current-time-container">
          <span className="current-time">
            {currentTime.toLocaleTimeString("en-US", { timeZone: "America/New_York" })}
            {isMarketOpen() ? ' (Market Open)' : ' (Market Closed)'}
          </span>
        </div>
        <h1>Stock Model Visualizer</h1>
      </header>
        <header className="App-header">
        <div className="disclaimer-container">
            <button className="disclaimer" onClick={handleDisclaimerClick}>DISCLAIMER</button>
                {showDisclaimer && <p className="disclaimer-message">This is a model intended for learning purposes!</p>} 
        </div>
        
        <div className="model-container">
            <button className="model" onClick={handleModelClick}>MODEL DETAILS</button>
                {showModel && <p className="model-message">This Project uses the Black Scholes Model</p>}
        </div>

        <div className="info-container">
            <button className="information" onClick={handleInformationClick}>Project Information</button>
                {showInformation && <p className="info-message">
                    Option Price is the price someone should theoretically be willing to pay for this option right now.
                    It’s not the price of the stock itself, but the price of the right to buy or sell the stock at the strike price in the future.</p>}
        </div>

        <select value={selectedSymbol} onChange={handleSymbolChange}>
            {symbols.map(symbol => (
            <option key={symbol} value={symbol}>{symbol}</option>
          ))}
        </select>
        <div className="info">
        {stockData.symbol === selectedSymbol && ( // Display only if symbols match
          <>
            <span className="stock-symbol">{selectedSymbol}</span> 
            <button className="reset" onClick={() => setHistoricalData([])}>Reset Data</button> 
            <div className="stock-price">
              <p>Symbol: {stockData.symbol}</p>
              <p>Price: {stockData.price}</p>
              <p>Timestamp: {stockData.timestamp}</p>
              <p>Option Price: {stockData.optionPrice}</p>
            </div>
          </>
        )}
      </div>
      <div className="chart-container">
  <Line 
    data={{
      labels: historicalData.map(data => data.timestamp),
      datasets: [
        {
          label: 'Stock Price',
          data: historicalData.map(data => data.price),
          borderColor: 'blue',
          fill: false
        },
        {
          label: 'Option Price',
          data: historicalData.map(data => data.optionPrice),
          borderColor: 'green',
          fill: false
        }
      ]
    }}
    options={{
        interaction: {
            mode: 'index'
        },
        scales: {
        x: {
          type: 'time',
          time: {
            unit: 'minute',
            tooltipFormat: 'll HH:mm'
          },
          title: {
            display: true,
            text: 'Time (Eastern Standard Time)'
          }
        },
        y: {
          beginAtZero: false
        , 
        title: {
            display: true,
            text: 'Price (USD)'
        }
    }
      },

      
      responsive: true,
      maintainAspectRatio: false
    }}
  />
</div>
      </header>
    </div>
  );
}

export default App;
