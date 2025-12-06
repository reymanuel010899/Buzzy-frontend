import React, { useState, useEffect, useRef } from 'react';
import BottomNavbar from '../../components/Layout/ButtonNavar';

const NUMBERS = Array.from({ length: 13 }, (_, i) => i); // Numbers 0 to 12
const SEGMENT_ANGLE = 360 / NUMBERS.length;

const Game: React.FC = () => {
  const [balance, setBalance] = useState<number>(1200);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [rotation, setRotation] = useState<number>(0);
  const [justWon, setJustWon] = useState<boolean>(false);
  const winningNumberRef = useRef<number | null>(null);
  const [currentMultiplier] = useState<number>(12);
  const [showResult, setShowResult] = useState(false);


  // const maxMultiplier = 30; // tope máximo

  const toggleNumber = (num: number) => {
    if (isSpinning) return;
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };
  
  const handleBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Math.max(0, Number(e.target.value));
    setBetAmount(amount);
  }

  const adjustBet = (amount: number) => {
    setBetAmount(prev => Math.max(0, prev + amount));
  }

  const setMaxBet = () => {
    const numbersCount = selectedNumbers.length > 0 ? selectedNumbers.length : 1;
    setBetAmount(Math.floor(balance / numbersCount));
  }

  const startSpin = () => {
    if (selectedNumbers.length === 0) {
      setMessage('Please select at least one number.');
      return;
    }

    if (betAmount <= 0) {
      setMessage('Please enter a valid bet amount per number.');
      return;
    }
    // setRoundCount(prev => {
    //   const newCount = prev + 1;
    //   console.log("Rounds:", newCount);

    //   // Cada 15 jugadas aumenta +3 sin pasar de 30
    //   if (newCount % 15 === 0 && currentMultiplier  < maxMultiplier) {
    //       setCurrentMultiplier(prevM => {
    //         const increased = Math.min(prevM + 3, maxMultiplier);
    //         setCurrentMultiplier(increased);
    //         return increased;
    //       });
    //   }

    //   return newCount;
    // });

 

    // const multiplier = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
    // setCurrentMultiplier(multiplier); 
    const totalBet = betAmount * selectedNumbers.length;

    if (totalBet > balance) {
      setMessage('Total bet amount cannot exceed your balance.');
      return;
    }

    setIsSpinning(true);
    setMessage('');
    setResult(null);
    setJustWon(false);
    setBalance((prev) => prev - totalBet);

    const winner = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    winningNumberRef.current = winner;

    const fullSpins = 5 + Math.floor(Math.random() * 5);
    const targetAngle = -(winner * SEGMENT_ANGLE);
    const finalRotation = (Math.floor(rotation / 360) + fullSpins) * 360 + targetAngle;
    
    setRotation(finalRotation);
  };
  
  const handleTransitionEnd = () => {
    if (winningNumberRef.current === null) return;

    const winner = winningNumberRef.current;
    setResult(winner);
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      setResult(null);
    }, 3000);
        
    if (selectedNumbers.includes(winner)) {
      const winnings = betAmount * currentMultiplier;
      setBalance((prev) => prev + winnings);
      setMessage(`YOU WON $${winnings.toFixed(2)}! (x${currentMultiplier})`);
      setJustWon(true);
    } else {
      setMessage(`Landed on ${winner}. Better luck next time!`);
    }

    winningNumberRef.current = null;
    setIsSpinning(false);
  };


  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (justWon) {
      const timer = setTimeout(() => setJustWon(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [justWon]);

  const canSpin = !isSpinning && betAmount > 0 && selectedNumbers.length > 0;
  return (
    <div 
      className="flex flex-col items-center justify-center h-screen overflow-hidden text-white p-4 pb-28 font-['Orbitron',_sans-serif]"
      style={{ background: 'radial-gradient(circle, #1a183e, #0d0c22)' }}
    >
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      
      <div className="z-10 text-center mb-20">
        <h2 className="text-xl text-cyan-300 tracking-widest" style={{ textShadow: '0 0 8px #00ffff' }}>MI WALLET</h2>
        <h1 
          className={`text-4xl font-bold text-cyan-100 transition-all duration-300 ${justWon ? 'win-animation' : ''}`} 
          style={{ textShadow: '0 0 15px #00ffff' }}
        >
          ${balance.toFixed(2)}
        </h1>
      </div>

      <div className="relative flex items-center justify-center w-96 h-96 my-4">
        <div className="absolute w-[360px] h-[360px] rounded-full border-2 border-cyan-500/30"></div>
        <div className="absolute  w-[410px] h-[410px] rounded-full border border-cyan-500/20"></div>

        <div 
          className={`absolute  h-full   transition-transform`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionDuration: `${Math.random() * (15000 - 7000) + 7000}ms`,
            transitionTimingFunction: 'cubic-bezier(0.1, 0.7, 0.3, 1)',
          }}
          onTransitionEnd={isSpinning ? handleTransitionEnd : undefined}
        >
          {NUMBERS.map((num, i) => {
          const angle = (i * SEGMENT_ANGLE) - 90;
          const isZero = num === 0;
          const baseColor = isZero ? '#ff3131' : '#00ffff';
          const isSelected = selectedNumbers.includes(num);

          return (
            <button
                key={num}
                onClick={() => toggleNumber(num)}
                disabled={isSpinning}
                className="absolute top-1/2 left-1/2 -mt-6 -ml-6 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-200"
                style={{
                  transform: `rotate(${angle}deg) translate(150px) rotate(${-angle}deg)`,
                  cursor: isSpinning ? 'not-allowed' : 'pointer',

                  color: isSelected ? '#0d0c22' : 'white',
                  backgroundColor: isSelected ? baseColor : 'rgba(0,0,0,0.6)',
                  border: `2px solid ${baseColor}`,
                  boxShadow: isSelected
                    ? `0 0 15px ${baseColor}, inset 0 0 5px ${baseColor}`
                    : `0 0 12px ${baseColor}`,
                }}
                    >
        {num}
            </button>
          );
      })}
        </div>
        
        <div className={`relative m z-10 w-20 h-20 rounded-full bg-[#0d0c22] flex items-center justify-center border-2 ${result ? '#00ffff': 'border-yellow-300'}` }
           style={{ boxShadow: result ? '0 0 15px #00ffff' : '0 0 15px #fcee09' }}>
           {/* MOSTRAR X SIEMPRE, excepto cuando showResult está activo */}
        {!showResult && (
            <span className="text-4xl font-bold"
                style={{
                    color: '#fcee09',
                    textShadow: '0 0 12px #fcee09'
                }}>
                x{currentMultiplier}
            </span>
        )}

    {/* MOSTRAR SOLO EL NÚMERO CUANDO ACABA DE SALIR (3 segundos) */}
    {result !== null && showResult && (
        <span className="text-5xl font-bold animate-pulse" style={{
            color: result === 0 ? '#ff3131' : '#00ffff',
            textShadow: `0 0 15px ${result === 0 ? '#ff3131' : '#00ffff'}`
        }}>
            {result}
        </span>
    )}

          
        </div>

        <div className="absolute top-[25px] z-20" style={{ filter: 'drop-shadow(0 5px 10px rgba(252,238,9,0.7))'}}>
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] "></div>
        </div>
      </div>
      
      <div className="w-full max-w-md flex flex-col items-center space-y-5 z-10 mt-6">
       
       
        {/* <h3 className="text-xl text-cyan-300 tracking-wider" style={{ textShadow: '0 0 5px #00ffff' }}>SELECT NUMBERS</h3> */}
        
        {/* <div className="grid grid-cols-7 gap-2">
          {NUMBERS.map((num) => {
             const isZero = num === 0;
             const isSelected = selectedNumbers.includes(num);
             const baseColor = isZero ? '#ff3131' : '#00ffff';
             
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                disabled={isSpinning}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed border-2`}
                style={{
                  color: isSelected ? '#0d0c22' : 'white',
                  borderColor: baseColor,
                  backgroundColor: isSelected ? baseColor : 'transparent',
                  boxShadow: isSelected ? `0 0 15px ${baseColor}, inset 0 0 5px ${baseColor}` : `inset 0 0 8px ${baseColor}`,
                }}
              >
                {num}
              </button>
            )
          })}
        </div> */}

        <div className="w-full text-center space-y-3 mt-10">
          <label htmlFor="bet-amount" className="block text-xl tracking-wider text-cyan-300" style={{ textShadow: '0 0 5px #00ffff' }}>BET AMOUNT PER NUMBER</label>
          <input
            id="bet-amount"
            type="number"
            value={betAmount === 0 ? '' : betAmount}
            onChange={handleBetChange}
            disabled={isSpinning}
            placeholder="0"
            className="w-48 text-center bg-black/50 border-2 border-cyan-400 rounded-lg p-2 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent"
            style={{ boxShadow: 'inset 0 0 10px #00ffff, 0 0 5px #00ffff' }}
          />
           <div className="flex justify-center gap-1">
              <button onClick={() => adjustBet(10)} disabled={isSpinning} className="px-3 py-1 bg-cyan-900/50 border border-cyan-600 rounded hover:bg-cyan-700/50">+10</button>
              <button onClick={() => adjustBet(50)} disabled={isSpinning} className="px-3 py-1 bg-cyan-900/50 border border-cyan-600 rounded hover:bg-cyan-700/50">+50</button>
              <button onClick={() => adjustBet(100)} disabled={isSpinning} className="px-3 py-1 bg-cyan-900/50 border border-cyan-600 rounded hover:bg-cyan-700/50">+100</button>
              <button onClick={setMaxBet} disabled={isSpinning} className="px-3 py-1 bg-yellow-900/50 border border-yellow-600 rounded hover:bg-yellow-700/50">MAX</button>
          </div>
        </div>

        <div className="w-full max-w-xs">
            <button
                onClick={startSpin}
                disabled={!canSpin}
                className={`w-full py-2 mb-6 px-6 bg-cyan-400 text-slate-900 font-bold text-2xl rounded-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:!shadow-none disabled:bg-gray-600
                ${canSpin ? 'pulsate' : ''}`}
                >
                {isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL!'}
            </button>
        </div>
        
    
         {message && 
            <div className={` rounded-lg text-center font-semibold text-lg w-full max-w-md transition-opacity duration-300
                ${message.includes('WON') ? 'bg-green-500/30 text-green-200 border border-green-400' : 'bg-red-500/30 text-red-200 border border-red-400'}`}>
                {message}
            </div>
         }
        </div>
    
     
       {/* Bottom navbar */}
      <BottomNavbar />
    </div>
  );
};

export default Game;