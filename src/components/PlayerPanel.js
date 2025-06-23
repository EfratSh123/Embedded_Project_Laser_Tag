import React from "react";

export default function PlayerPanel({ player, sendToDevice }) {
  const isDead = player.health <= 0;

  const sendTestHit = () => {
    if (sendToDevice) {
      sendToDevice(JSON.stringify({ command: "TEST_HIT" }));
    }
  };

  return (
    <div className={`player-panel ${isDead ? 'player-dead' : ''}`}>
      <div className="player-panel-header">
        <div className="player-avatar">
          <span className="player-icon">🎯</span>
        </div>
        <div className="player-info">
          <h3 className="player-title">שחקן {player.id}</h3>
          <p className="player-status">{isDead ? 'הודח' : 'פעיל'}</p>
        </div>
        {/* Changed to display hits given */}
        <div className="hits-badge">
          {player.hitsGiven} פגיעות שבוצעו
        </div>
      </div>

      <div className="player-stats">
        <div className="stat-item">
          <div className="stat-value">{player.hitsReceived.length}</div>
          <div className="stat-label">
            <span className="stat-icon">⚡</span>
            פגיעות שקיבל
          </div>
        </div>
        {/* הפגיעות שבוצעו הוסרו מכאן כדי למנוע כפילות */}
        <div className="stat-item">
          <div className={`stat-value ${isDead ? 'status-dead' : 'status-alive'}`}>
            {isDead ? '💀' : '✅'}
          </div>
          <div className="stat-label">
            <span className="stat-icon">📊</span>
            סטטוס
          </div>
        </div>
      </div>

      {/* Log of hits received (who hit THIS player) */}
      {player.hitsReceived.length > 0 && (
        <div className="hit-log">
          <h4>מי פגע בך:</h4>
          <ul>
            {player.hitsReceived.slice(0, 3).map((hit, index) => ( // Display last 3 hits
              <li key={index}>
                <span className="hit-info">
                  {hit.shooterId} פגע בך ({hit.timestamp})
                </span>
              </li>
            ))}
            {player.hitsReceived.length > 3 && <li>...</li>}
          </ul>
        </div>
      )}

      <button
        onClick={sendTestHit}
        disabled={!sendToDevice}
        className="test-button"
      >
        שלח אות בדיקה
      </button>
    </div>
  );
}