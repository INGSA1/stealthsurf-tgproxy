import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [port, setPort] = useState(() => Number(localStorage.getItem('port')) || 10808);
  const [sni, setSni] = useState(() => localStorage.getItem('sni') || '');
  
  const [autoConnect, setAutoConnect] = useState(() => localStorage.getItem('autoConnect') === 'true');
  const [autostart, setAutostart] = useState(() => localStorage.getItem('autostart') === 'true');

  const [shareLocal, setShareLocal] = useState(() => localStorage.getItem('shareLocal') === 'true');
  const [localIp, setLocalIp] = useState('127.0.0.1');

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchLocalIp = async () => {
    try {
      const ip: string = await invoke('get_local_ip');
      setLocalIp(ip);
    } catch (err) {
      console.error("Не удалось определить локальный IP:", err);
      setLocalIp('127.0.0.1');
    }
  };

  useEffect(() => {
    fetchLocalIp();
  }, [shareLocal]);

  useEffect(() => {
    localStorage.setItem('token', token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem('port', port.toString());
  }, [port]);

  useEffect(() => {
    localStorage.setItem('sni', sni);
  }, [sni]);

  useEffect(() => {
    localStorage.setItem('autoConnect', autoConnect.toString());
  }, [autoConnect]);

  useEffect(() => {
    localStorage.setItem('shareLocal', shareLocal.toString());
  }, [shareLocal]);

  const handleToggleAutostart = async (checked: boolean) => {
    setAutostart(checked);
    localStorage.setItem('autostart', checked.toString());
    try {
      await invoke('set_autostart', { enabled: checked });
    } catch (err: any) {
      setError(`Ошибка автозапуска: ${err.toString()}`);
    }
  };

  const handleConnect = async (customToken = token, customPort = port, customSni = sni, customShare = shareLocal) => {
    setLoading(true);
    setError('');
    try {
      if (isConnected) {
        await invoke('stop_proxy');
        setIsConnected(false);
      } else {
        await invoke('start_proxy', { 
          token: customToken, 
          localPort: customPort, 
          customSni: customSni, 
          shareLocal: customShare 
        });
        setIsConnected(true);
      }
    } catch (err: any) {
      setError(err.toString());
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token') || '';
    const savedAutoConnect = localStorage.getItem('autoConnect') === 'true';
    if (savedAutoConnect && savedToken) {
      const timer = setTimeout(() => {
        handleConnect(savedToken, port, sni, shareLocal);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConfigureTelegram = async () => {
    try {
      setError('');
      await invoke('open_telegram', { port });
    } catch (err: any) {
      setError(`Ошибка открытия Telegram: ${err.toString()}`);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tgProxyLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentIp = shareLocal ? localIp : '127.0.0.1';
  const tgProxyLink = `tg://socks?server=${currentIp}&port=${port}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(tgProxyLink)}`;

  return (
    <div style={{ 
      padding: '24px 20px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      backgroundColor: '#0c0e12', 
      color: '#e2e8f0',
      minHeight: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
      
      {/* КАРТОЧКА ПРИЛОЖЕНИЯ */}
      <div style={{
        backgroundColor: '#151922',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid #1f2937',
        boxShadow: isConnected 
          ? '0 0 30px rgba(0, 136, 204, 0.12), 0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
          : '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        
        // ВНИМАНИЕ: ЭТОТ ПАРАМЕТР margin: 'auto' ИДЕАЛЬНО СПАСАЕТ ОТ ОБРЕЗАНИЯ И ВКЛЮЧАЕТ СКРОЛЛ!
        margin: 'auto', 
        width: '100%',
        maxWidth: '560px',
        boxSizing: 'border-box'
      }}>
        
        {/* ХЕДЕР */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              StealthSurf <span style={{ color: '#0088cc' }}>Proxy</span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
              Локальный Telegram-клиент
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1c2230', padding: '4px 10px', borderRadius: '20px', border: '1px solid #2d3748' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#f43f5e',
              boxShadow: isConnected ? '0 0 10px #10b981' : '0 0 10px #f43f5e',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite ease-in-out'
            }} />
            <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: isConnected ? '#10b981' : '#f43f5e' }}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; transform: scale(1.15); }
            100% { opacity: 0.6; }
          }
        `}} />

        {/* ПОЛЯ ВВОДА */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
              StealthSurf API Token
            </label>
            <input 
              type="password" 
              value={token} 
              onChange={(e) => setToken(e.target.value)} 
              placeholder="Введите stlth_..."
              disabled={isConnected}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid #2d3748', 
                backgroundColor: '#1c2230', 
                color: '#fff',
                outline: 'none',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Маскировка (SNI)
              </label>
              <input 
                type="text" 
                value={sni} 
                onChange={(e) => setSni(e.target.value)} 
                placeholder="Пусто (без домена)"
                disabled={isConnected}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #2d3748', 
                  backgroundColor: '#1c2230', 
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ width: '80px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#94a3b8' }}>
                Порт
              </label>
              <input 
                type="number" 
                value={port} 
                onChange={(e) => setPort(Number(e.target.value))} 
                disabled={isConnected}
                style={{ 
                  width: '100%', 
                  padding: '8px 12px', 
                  borderRadius: '8px', 
                  border: '1px solid #2d3748', 
                  backgroundColor: '#1c2230', 
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  textAlign: 'center'
                }}
              />
            </div>
          </div>
        </div>

        {/* НАСТРОЙКИ */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          backgroundColor: '#1c2230', 
          padding: '10px 12px', 
          borderRadius: '10px',
          border: '1px solid #2d3748'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Запускать вместе с Windows</span>
            <input 
              type="checkbox" 
              checked={autostart} 
              onChange={(e) => handleToggleAutostart(e.target.checked)}
              style={{ cursor: 'pointer', width: '15px', height: '16px' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Подключать прокси при старте</span>
            <input 
              type="checkbox" 
              checked={autoConnect} 
              onChange={(e) => setAutoConnect(e.target.checked)}
              style={{ cursor: 'pointer', width: '15px', height: '16px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #2d3748' }}>
            <span style={{ fontSize: '11px', color: '#0088cc', fontWeight: 'bold' }}>
              Разрешить доступ из локальной сети <span style={{ fontSize: '9px', backgroundColor: '#1a365d', color: '#63b3ed', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>BETA</span>
            </span>
            <input 
              type="checkbox" 
              checked={shareLocal} 
              onChange={(e) => setShareLocal(e.target.checked)}
              disabled={isConnected}
              style={{ cursor: 'pointer', width: '15px', height: '16px' }}
            />
          </div>
        </div>

        {/* ОБЛАСТЬ С QR-КОДОМ И РУЧНЫМ ВВОДОМ */}
        {isConnected && shareLocal && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1c2230',
            border: '1px dashed #0088cc',
            borderRadius: '10px',
            padding: '16px',
            textAlign: 'center',
            gap: '10px',
            animation: 'fadeIn 0.4s ease'
          }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: '#0088cc' }}>
              Локальный IP: <span style={{ color: '#fff', fontFamily: 'monospace' }}>{localIp}</span>
            </p>
            
            <div style={{
              backgroundColor: '#fff',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
            }}>
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                style={{ width: '110px', height: '110px', display: 'block' }} 
              />
            </div>
            
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', lineHeight: '1.3' }}>
              Наведите камеру телефона на QR-код для настройки.
            </p>

            <div style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '6px',
              textAlign: 'left',
              fontSize: '11px',
              borderTop: '1px solid #2d3748',
              paddingTop: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Тип прокси:</span>
                <span style={{ fontWeight: 'bold', color: '#fff' }}>SOCKS5</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Сервер (IP):</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>{localIp}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Порт:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>{port}</span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              width: '100%',
              gap: '6px',
              marginTop: '4px'
            }}>
              <input 
                type="text" 
                readOnly 
                value={tgProxyLink} 
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #2d3748',
                  backgroundColor: '#151922',
                  color: '#94a3b8',
                  fontSize: '11px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: copied ? '#10b981' : '#2d3748',
                  color: '#fff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  minWidth: '95px'
                }}
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />

        {error && (
          <div style={{ 
            color: '#f43f5e', 
            backgroundColor: 'rgba(244, 63, 94, 0.1)', 
            border: '1px solid rgba(244, 63, 94, 0.2)',
            padding: '8px 10px', 
            borderRadius: '8px', 
            fontSize: '11px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <button 
          onClick={() => handleConnect()} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: isConnected ? '#e03e3e' : '#0088cc',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: isConnected 
              ? '0 4px 14px rgba(224, 62, 62, 0.15)' 
              : '0 4px 14px rgba(0, 136, 204, 0.15)',
          }}
        >
          {loading ? 'Секунду...' : isConnected ? 'Остановить прокси' : 'Активировать прокси'}
        </button>

        {isConnected && (
          <button 
            onClick={handleConfigureTelegram}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#229ED9',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 14px rgba(34, 158, 217, 0.15)',
              transition: 'all 0.3s ease',
            }}
          >
            Применить прокси в Telegram ✈️
          </button>
        )}
      </div>
    </div>
  );
}