import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { sequence } from '0xsequence';
import './App.css';

const choices = ['rock', 'paper', 'scissors'];

function App() {
  const [wallet, setWallet] = useState(null);
  const [sessionPrivateKey, setSessionPrivateKey] = useState(null);
  const [sessionWallet, setSessionWallet] = useState(null);
  const [sessionAddress, setSessionAddress] = useState(null);
  const [authorizationSignature, setAuthorizationSignature] = useState(null);
  const [isSessionKeyAuthorized, setIsSessionKeyAuthorized] = useState(false);
  const [actionNonce, setActionNonce] = useState(0)
  const [gameState, setGameState] = useState('not-started');
  const [playerChoice, setPlayerChoice] = useState(null);
  const [botChoice, setBotChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [animationState, setAnimationState] = useState(0);

  const connectWallet = async () => {
    try {
      const wallet = await sequence.initWallet('polygon');
      await wallet.connect({
        app: 'ROCK PAPER SCISSOR',
        authorize: true,
      });
      setWallet(wallet);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const generateOrLoadSessionKey = () => {
    let storedKey = localStorage.getItem('sessionPrivateKey');
    if (storedKey) {
      setSessionPrivateKey(storedKey);
    } else {
      const sessionPrivateKey = ethers.utils.randomBytes(32);
      localStorage.setItem('sessionPrivateKey', ethers.utils.hexlify(sessionPrivateKey));
      setSessionPrivateKey(sessionPrivateKey);
    }
  };

  const authorizeSessionKey = async () => {
    if (wallet && sessionAddress) {
      const message = `Authorize session key: ${sessionAddress}`;
      const signer = await wallet.getSigner();
      const signature = await signer.signMessage(message);
      setAuthorizationSignature(signature);
    }
  };

  useEffect(() => {
    const initSessionWallet = async () => {
      if (wallet && sessionPrivateKey) {
        const newSessionWallet = new ethers.Wallet(ethers.utils.arrayify(sessionPrivateKey));
        setSessionWallet(newSessionWallet);
        const newSessionAddress = await newSessionWallet.getAddress();
        setSessionAddress(newSessionAddress);
      }
    };
    generateOrLoadSessionKey();
    initSessionWallet();
  }, [wallet, sessionAddress, sessionPrivateKey]);

  useEffect(() => {
    const verifyAuthorization = async () => {
      if (wallet && sessionAddress && authorizationSignature) {
        const message = `Authorize session key: ${sessionAddress}`;
        const isValidSignature = await sequence.utils.isValidMessageSignature(
          await wallet.getAddress(),
          message,
          authorizationSignature,
          wallet.getProvider(),
          await wallet.getChainId()
        );
        setIsSessionKeyAuthorized(isValidSignature);
      }
    };
    verifyAuthorization();
  }, [wallet, sessionAddress, authorizationSignature]);

  const getWinner = (playerChoice, botChoice) => {
    if (playerChoice === botChoice) return 'draw';
    if (
      (playerChoice === 'rock' && botChoice === 'scissors') ||
      (playerChoice === 'scissors' && botChoice === 'paper') ||
      (playerChoice === 'paper' && botChoice === 'rock')
    ) {
      return 'player';
    }
    return 'bot';
  };

  const play = async (choice) => {
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
  
    setPlayerChoice(choice);
    setBotChoice(botChoice);
  
    const message = `Play ${choice}. Nonce: ${actionNonce}`;
    const sessionSignature = await sessionWallet.signMessage(message);
    const recoveredSessionAddress = ethers.utils.verifyMessage(message, sessionSignature);
    setActionNonce(actionNonce+1)
  
    if (recoveredSessionAddress === sessionAddress) {
      setGameState('playing');
      setAnimationState((prevAnimationState) => prevAnimationState + 1); // Trigger animation
      setNotification({ type: 'valid', message: `Action ${actionNonce}: Valid session signature` });
      const winner = getWinner(choice, botChoice);
      setResult(winner);
    } else {
      console.log('Session signature invalid');
      setNotification({ useState: 'invalid', message: 'Invalid session signature' });
    }
  };

  useEffect(() => {
    if (isSessionKeyAuthorized) {
      setNotification({useState: 'valid', message: 'Session key authorized'});
    }
  }, [isSessionKeyAuthorized]);

  return (
    <div className="App">
      <h1>Rock Paper Scissors</h1>
      {notification && (
        <div
          className={`notification ${notification.type === 'valid' ? 'valid' : 'invalid'} animated`}
          key={animationState}
        >
          <p>{notification.message}</p>
        </div>
      )}
      {!wallet && (
        <button onClick={connectWallet}>Connect Sequence Wallet</button>
      )}
      {wallet && sessionPrivateKey && !isSessionKeyAuthorized && (
        <button onClick={authorizeSessionKey} disabled={!wallet || !sessionAddress}>
          Authorize Session Key
        </button>
      )}
      {wallet &&
        sessionPrivateKey &&
        isSessionKeyAuthorized &&
        gameState === 'not-started' && (
          <div className="choices">
            <h2>Choose your move:</h2>
            {choices.map((choice) => (
              <button key={choice} onClick={() => play(choice)}>
                {choice}
              </button>
            ))}
          </div>
        )}
      {gameState === 'playing' && (
        <div>
          <h2>Results:</h2>
          <p>You: {playerChoice}</p>
          <p>Bot: {botChoice}</p>
          <p className={`result ${result === 'player' ? 'win' : result === 'bot' ? 'lose' : 'draw'}`}>
            {result === 'draw' && "It's a draw!"}
            {result === 'player' && 'You won!'}
            {result === 'bot' && 'You lost!'}
          </p>
        </div>
      )}
      {wallet &&
        sessionPrivateKey &&
        isSessionKeyAuthorized &&
        gameState !== 'not-started' && (
          <div className="choices">
            <h2>Choose your move:</h2>
            {choices.map((choice) => (
              <button key={choice} onClick={() => play(choice)}>
                {choice}
              </button>
            ))}
          </div>
        )}
    </div>
  );
}

export default App;
