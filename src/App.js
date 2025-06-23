import React, { useState, useEffect } from "react";
import './App.css';
import Logo from './assets/logo.JPEG';
import PlayerPanel from "./components/PlayerPanel";
import WebSocketConnector from "./components/WebSocketConnector";

// רכיב FixedHeader נפרד
const FixedHeader = ({ timeLeft, started, gameEnded }) => {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed-header">
      <div className="header-logo">
          <img src={Logo} alt="Logo" className="logo" />
        <h1 className="header-title">מערכת ניהול לייזר טאג</h1>
      </div>
      <div className="header-timer">
        {started && !gameEnded ? (
          `זמן נותר: ${formatTime(timeLeft)} ⏰`
        ) : (
          `⏰ ${currentTime}`
        )}
      </div>
    </header>
  );
};


function App() {
  const [connectedDevices, setConnectedDevices] = useState([]); // { id, ip, sendFn, socket }
  // player object will now contain hitsReceived and hitsGiven
  const [players, setPlayers] = useState([]); // { id, ip, hitsReceived: [], health, hitsGiven: 0 }
  // Scoreboard will now track hits given by each player
  const [scoreboard, setScoreboard] = useState({}); // { deviceId: hits_given_count }
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null); // { id, score }

  // Game timer useEffect
  useEffect(() => {
    let timer;
    if (started && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && started) {
      endGameByTimer();
    }
    return () => clearInterval(timer);
  }, [started, timeLeft]);

  // Function to calculate the winner based on scoreboard (highest score wins)
  const calculateWinner = () => {
    if (Object.keys(scoreboard).length === 0) {
      return "אין מנצח (אף אחד לא ביצע פגיעות)";
    }
    // Sort by score in descending order (highest score wins)
    const sortedScores = Object.entries(scoreboard).sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
    const highestScore = sortedScores[0][1];
    const winners = sortedScores.filter(([, score]) => score === highestScore).map(([id,]) => `שחקן ${id}`);

    if (winners.length === 1) {
      return { id: sortedScores[0][0], score: highestScore };
    } else {
      return { id: `תיקו בין: ${winners.join(", ")}`, score: highestScore };
    }
  };

  // מטפלת בנתונים המתקבלים מחיבור ה-WebSocket.
  // מנתחת את הנתונים, מעדכנת את מצב השחקנים (פגיעות ובריאות) ואת לוח התוצאות.
  const handleData = (data, targetId) => { // targetId is the IP of the device that RECEIVED the hit
    try {
      const parsed = JSON.parse(data);
      const shooterId = parsed.senderId; // This is the IP of the device that SENT the hit (the shooter)

      if (shooterId === 0) return; // Ignore messages from base station or invalid IDs

      const event = {
        shooterId: shooterId, // The player who shot
        targetId: targetId,   // The player who was hit
        timestamp: new Date().toLocaleTimeString(),
      };

      // 1. Update the player who received the hit (targetId)
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === event.targetId
            ? { ...player, hitsReceived: [event, ...player.hitsReceived], health: (player.health || 100) - 10 }
            : player
        )
      );

      // 2. Update the player who performed the hit (shooterId)
      // We need to update both the hitsGiven in the player object and the scoreboard
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) =>
          player.id === event.shooterId
            ? { ...player, hitsGiven: (player.hitsGiven || 0) + 1 }
            : player
        )
      );

      // 3. Update the scoreboard (tracking hits GIVEN)
      setScoreboard((prevScoreboard) => ({
        ...prevScoreboard,
        [shooterId]: (prevScoreboard[shooterId] || 0) + 1, // Increment score for the shooter
      }));

    } catch (e) {
      console.error("Failed to parse data:", data, e);
    }
  };

  const handleConnectedDevice = (ip, sendFn, socket) => {
    const newDeviceId = ip;
    if (connectedDevices.some(d => d.id === newDeviceId)) {
        console.warn(`Device ${newDeviceId} is already connected.`);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
        return;
    }
    setConnectedDevices((prev) => [...prev, { id: newDeviceId, ip, sendFn, socket }]);
    // Initialize player with hitsReceived (hits taken) and hitsGiven (hits performed)
    setPlayers((prev) => [...prev, { id: newDeviceId, ip, hitsReceived: [], health: 100, hitsGiven: 0 }]);
    setScoreboard((prev) => ({ ...prev, [newDeviceId]: 0 })); // Initialize score for new player
  };

  const handleRemovePlayer = (idToRemove) => {
    setConnectedDevices((prev) => {
      const deviceToRemove = prev.find(d => d.id === idToRemove);
      if (deviceToRemove && deviceToRemove.socket) {
        deviceToRemove.socket.close(); // Close the WebSocket connection for the specific player
      }
      return prev.filter(d => d.id !== idToRemove);
    });
    setPlayers((prev) => prev.filter(p => p.id !== idToRemove));
    setScoreboard((prev) => {
      const newScoreboard = { ...prev };
      delete newScoreboard[idToRemove];
      return newScoreboard;
    });
  };

  const startGame = () => {
    if (players.length === 0) {
      alert("אנא חבר שחקנים לפני התחלת המשחק.");
      return;
    }
    setStarted(true);
    setTimeLeft(20);
    setGameEnded(false);
    setWinner(null);
    // Reset game data for existing players
    setPlayers((prev) => prev.map(player => ({ ...player, hitsReceived: [], health: 100, hitsGiven: 0 })));
    setScoreboard((prev) => {
        const initialScores = {};
        Object.keys(prev).forEach(id => {
            initialScores[id] = 0; // Reset scores for existing players
        });
        return initialScores;
    });
    // Send START_GAME command to all connected devices
    connectedDevices.forEach(device => {
        if (device.sendFn) {
            device.sendFn(JSON.stringify({ command: "START_GAME" }));
        }
    });
  };

  const endGameByTimer = () => {
    setStarted(false);
    setGameEnded(true);
    const calculatedWinner = calculateWinner();
    setWinner(calculatedWinner);

    // Send END_GAME command to all devices
    connectedDevices.forEach(device => {
      if (device.sendFn) {
        device.sendFn(JSON.stringify({ command: "END_GAME" }));
      }
      // Keep connections open at this stage to allow final score display
    });
  };

  const resetGame = () => {
    // Close all active WebSocket connections
    connectedDevices.forEach(device => {
        if (device.socket && device.socket.readyState === WebSocket.OPEN) {
            console.log(`Closing WebSocket for ${device.ip}`);
            device.socket.close();
        }
    });

    setStarted(false);
    setTimeLeft(20);
    setGameEnded(false);
    setWinner(null);
    setPlayers([]);
    setConnectedDevices([]);
    setScoreboard({});
  };


  if (gameEnded) {
    return (
      <>
        <FixedHeader timeLeft={timeLeft} started={started} gameEnded={gameEnded} />
        <div className="game-over-screen">
          <h1>המשחק נגמר!</h1>
          <h2>המנצח הוא:</h2>
          <h1>🏆🎉🏅🎊👏🥳</h1>
          <div className="winner-display">{winner ? `${winner.id} עם ${winner.score} פגיעות שבוצעו!!!` : 'לא ידוע'}</div>
          <button onClick={resetGame} className="btn-start-game-main">
            התחלה מחדש
          </button>
        </div>
      </>
    );
  }

  if (!started) {
    return (
      <>
        <FixedHeader timeLeft={timeLeft} started={started} gameEnded={gameEnded} />
        <div className="container app-main-content">
          <WebSocketConnector
            onConnected={handleConnectedDevice}
            onData={handleData}
            connectedDevices={connectedDevices.map(d => d.ip)}
          />

          {players.length > 0 && (
            <>
              <h2>שחקנים מחוברים:</h2>
              <ul className="player-list">
                {players.map((player) => (
                  <li key={player.id}>
                    <span className="player-name">שחקן: {player.id}</span>
                    <button onClick={() => handleRemovePlayer(player.id)} className="remove-player-btn">
                      ❌
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button onClick={startGame} className="btn-start-game-main">
            ▶️ התחלת המשחק!
          </button>
        </div>
      </>
    );
  }

  // Game in progress
  return (
    <>
      <FixedHeader timeLeft={timeLeft} started={started} gameEnded={gameEnded} />
      <div className="game-session-content">
        <main className="game-main">
          <div className="scoreboard-display">
            <h2>ניקוד (פגיעות שבוצעו):</h2> {/* Updated title */}
            <ul className="scoreboard-list">
              {Object.entries(scoreboard).map(([id, score]) => (
                <li key={id} className="scoreboard-item">
                  <span className="player-id-score">שחקן {id}:</span>
                  <span className="score-value">{score} פגיעות</span>
                </li>
              ))}
            </ul>
          </div>

          <h2>שחקנים:</h2>
          <div className="players-grid">
            {players.map((player) => (
              <PlayerPanel
                key={player.id}
                player={player}
                sendToDevice={connectedDevices.find((d) => d.id === player.id)?.sendFn}
              />
            ))}
          </div>

          <button onClick={resetGame} className="btn-end-game">
            סיים משחק
          </button>
        </main>
      </div>
    </>
  );
}

export default App;