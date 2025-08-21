import React, { useState } from 'react';
import '../../styles/Game.css'; // We'll define the styles in a separate CSS file

const numbers = Array.from({ length: 13 }, (_, i) => i); // Numbers 0 to 12
const multipliers = [5, 10, 30]; // Possible multipliers for winning

const Game: React.FC = () => {
  const [balance, setBalance] = useState<number>(1250); // Starting balance from the image
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]); // Numbers the user bets on
  const [betAmount, setBetAmount] = useState<number>(0); // Amount the user bets
  const [spinning, setSpinning] = useState<boolean>(false); // Is the wheel spinning?
  const [result, setResult] = useState<number | null>(null); // The winning number
  const [message, setMessage] = useState<string>(''); // Feedback message for the user
  const [rotation, setRotation] = useState<number>(0); // Rotation angle for the wheel

  // Handle number selection
  const toggleNumber = (num: number) => {
    if (spinning) return; // Prevent changes while spinning
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  // Start the spin
  const startSpin = () => {
    if (selectedNumbers.length === 0) {
      setMessage('Please select at least one number to bet on!');
      return;
    }
    if (betAmount <= 0 || betAmount > balance) {
      setMessage('Please enter a valid bet amount within your balance!');
      return;
    }

    setSpinning(true);
    setMessage('');
    setResult(null);
    setBalance(balance - betAmount); // Deduct the bet amount

    // Simulate spinning for 30 seconds
    let currentRotation = 0;
    const spinDuration = 30000; // 30 seconds
    const slowDownDuration = 5000; // Last 5 seconds for slowing down
    // const totalRotations = 10 + Math.random() * 5; // Random number of full spins (10-15)

    const spinInterval = setInterval(() => {
      currentRotation += 10; // Spin speed
      setRotation(currentRotation);
    }, 50);

    // Stop spinning after 30 seconds
    setTimeout(() => {
      clearInterval(spinInterval);

      // Slow down phase
      const slowDownInterval = setInterval(() => {
        currentRotation += 2; // Slower speed
        setRotation(currentRotation);
      }, 50);

      setTimeout(() => {
        clearInterval(slowDownInterval);

        // Calculate the final number
        const finalRotation = currentRotation % 360;
        const segmentAngle = 360 / 13; // 13 numbers, so each segment is ~27.69 degrees
        const winningNumber = Math.floor((360 - finalRotation) / segmentAngle) % 13;

        setResult(winningNumber);
        setSpinning(false);

        // Check if the user won
        if (selectedNumbers.includes(winningNumber)) {
          const multiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
          const winnings = betAmount * multiplier;
          setBalance((prev) => prev + winnings);
          setMessage(`Congratulations! You won ${winnings} (x${multiplier})!`);
        } else {
          setMessage(`Sorry, the wheel landed on ${winningNumber}. Try again!`);
        }
      }, slowDownDuration);
    }, spinDuration - slowDownDuration);
  };

  return (
    <div className="game-container">
      <div className="wallet-header">
        <h2>Mi Wallet</h2>
        <h1>${balance.toFixed(2)}</h1>
      </div>

      <div className="roulette-container">
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          {numbers.map((num) => (
            <div
              key={num}
              className={`number ${num === 0 ? 'zero' : ''}`}
              style={{
                transform: `rotate(${(num * 360) / 13}deg) translateY(-150px)`,
              }}
            >
              {num}
            </div>
          ))}
        </div>
        <div className="pointer"></div>
      </div>

      <div className="bet-section">
        <h3>Select Numbers to Bet On:</h3>
        <div className="number-grid">
          {numbers.map((num) => (
            <button
              key={num}
              className={`number-btn ${
                selectedNumbers.includes(num) ? 'selected' : ''
              } ${num === 0 ? 'zero' : ''}`}
              onClick={() => toggleNumber(num)}
              disabled={spinning}
            >
              {num}
            </button>
          ))}
        </div>

        <div className="bet-input">
          <h3>Bet Amount:</h3>
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={spinning}
            placeholder="Enter your bet"
          />
        </div>

        <button
          className="spin-btn"
          onClick={startSpin}
          disabled={spinning}
        >
          {spinning ? 'Spinning...' : 'Spin the Wheel!'}
        </button>
      </div>

      {message && <div className="message">{message}</div>}
      {result !== null && (
        <div className="result">The wheel landed on: {result}</div>
      )}
    </div>
  );
};

export default Game;