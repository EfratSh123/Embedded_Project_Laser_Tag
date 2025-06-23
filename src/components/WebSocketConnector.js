import React, { useState } from "react";

export default function WebSocketConnector({ onConnected, onData, connectedDevices }) {
  const [sockets, setSockets] = useState([]);
  const [ip, setIp] = useState("192.168.1.100");
  const [loadingIps, setLoadingIps] = useState([]);
  const [errorIp, setErrorIp] = useState("");

  const handleConnect = () => {
    const alreadyConnected = sockets.some((s) => s.url.includes(ip)) || connectedDevices.includes(ip);
    if (alreadyConnected) {
      alert("שחקן עם IP הזה כבר מחובר!");
      return;
    }

    setLoadingIps((prev) => [...prev, ip]);
    setErrorIp("");

    const socket = new WebSocket(`ws://${ip}:81`);
    // Store IP on the socket object for easy access in onmessage/onerror/onclose
    socket.ip = ip; 

    socket.onopen = () => {
      console.log("WebSocket connected to", socket.ip); // השתמש ב-socket.ip
      setSockets((prev) => [...prev, socket]);
      setLoadingIps((prev) => prev.filter((x) => x !== socket.ip));
      onConnected(socket.ip, (data) => socket.send(data), socket); // העבר את socket.ip
    };

    socket.onmessage = (event) => {
      console.log("Message from device:", event.data);
      onData(event.data, socket.ip); // השתמש ב-socket.ip כדי לזהות את השולח
    };

    socket.onerror = (e) => {
      console.error("WebSocket error for", socket.ip, e); // השתמש ב-socket.ip
      setErrorIp(socket.ip);
      setLoadingIps((prev) => prev.filter((x) => x !== socket.ip));
      setSockets((prev) => prev.filter((s) => s !== socket)); // הסר סוקט שגיאה
    };

    socket.onclose = () => {
      console.warn("WebSocket closed for", socket.ip); // השתמש ב-socket.ip
      setLoadingIps((prev) => prev.filter((x) => x !== socket.ip));
      setSockets((prev) => prev.filter((s) => s !== socket)); // הסר סוקט שנסגר
    };
  };

  return (
    <div className="websocket-connector">
      <h1>🎯 Laser Tag Arena</h1>
      <p className="subtitle">התחבר למכשירים והתחל את הקרב!</p>
      
      <div className="input-section">
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="הכנס IP של הבקר (לדוגמה: 192.168.1.100)"
          className="ip-input"
          dir="ltr" // Force LTR for IP input
        />
        <button
          onClick={handleConnect}
          disabled={loadingIps.includes(ip)}
          className="btn-primary"
        >
          {loadingIps.includes(ip) ? (
            <>
              <span className="loading-spinner">⏳</span>
              מתחבר...
            </>
          ) : (
            <>
              <span>➕</span>
              הוסף שחקן
            </>
          )}
        </button>
      </div>

      {errorIp && (
        <div className="error-message">
          ❌ שגיאה בהתחברות ל־{errorIp}
        </div>
      )}

      <div className="connection-status">
        {sockets.length > 0 ? (
          <>
            <span className="status-icon connected">📶</span>
            <span className="status-text">
              {sockets.length} מכשיר{sockets.length !== 1 ? 'ים' : ''} מחובר{sockets.length !== 1 ? 'ים' : ''}
            </span>
          </>
        ) : (
          <>
            <span className="status-icon disconnected">📵</span>
            <span className="status-text">אין מכשירים מחוברים</span>
          </>
        )}
      </div>

      <div className="connection-help">
        <h4>הוראות התחברות:</h4>
        <ol>
          <li>התחבר לרשת WiFi של ה-ESP32</li>
          <li>הכנס את כתובת ה-IP של המכשיר (בדרך כלל 192.168.1.100)</li>
          <li>לחץ על "הוסף שחקן" כדי ליצור חיבור</li>
          <li>חזור על התהליך עבור מכשירים נוספים</li>
        </ol>
      </div>
    </div>
  );
}