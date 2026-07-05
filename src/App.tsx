import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

export default function App() {
  // Инициализируем стейты значениями из localStorage (если они сохранены)
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [port, setPort] = useState(() => Number(localStorage.getItem('port')) || 10808);
  const [sni, setSni] = useState(() => localStorage.getItem('sni') || '');
  
  // Новые настройки
  const [autoConnect, setAutoConnect] = useState(() => localStorage.getItem('autoConnect') === 'true');
  const [autostart, setAutostart] = useState(() => localStorage.getItem('autostart') === 'true');

  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Сохраняем настройки при их изменении
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

  // При переключении галочки автозапуска вызываем команду реестра в Rust
  const handleToggleAutostart = async (checked: boolean) => {
    setAutostart(checked);
    localStorage.setItem('autostart', checked.toString());
    try {
      await invoke('set_autostart', { enabled: checked });
    } catch (err: any) {
      setError(`Ошибка автозапуска: ${err.toString()}`);
    }
  };

  const handleConnect = async (customToken = token, customPort = port, customSni = sni) => {
    setLoading(true);
    setError('');
    try {
      if (isConnected) {
        await invoke('stop_proxy');
        setIsConnected(false);
      } else {
        await invoke('start_proxy', { token: customToken, localPort: customPort, customSni: customSni });
        setIsConnected(true);
      }
    } catch (err: any) {
      setError(err.toString());
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // ЭФФЕКТ ДЛЯ АВТОМАТИЧЕСКОГО ПОДКЛЮЧЕНИЯ ПРИ СТАРТЕ ПРИЛОЖЕНИЯ
  useEffect(() => {
    const savedToken = localStorage.getItem('token') || '';
    const savedAutoConnect = localStorage.getItem('autoConnect') === 'true';
    if (savedAutoConnect && savedToken) {
      // Инициализируем автоподключение с задержкой в 500мс для стабильности инициализации Tauri
      const timer = setTimeout(() => {
        handleConnect(savedToken, port, sni);
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

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      backgroundColor: '#0c0e12', 
      color: '#e2e8f0',
      height: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      userSelect: 'none'
    }}>
      
      <div style={{
        backgroundColor: '#151922',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #1f2937',
        boxShadow: isConnected 
          ? '0 0 30px rgba(0, 136, 204, 0.15), 0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
          : '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.4s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        
        {/* ХЕДЕР С ПУЛЬСАРОМ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              StealthSurf <span style={{ color: '#0088cc' }}>Proxy</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

          <div style={{ display: 'flex', gap: '10px' }}>
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

            <div style={{ width: '90px' }}>
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

        {/* НАСТРОЙКИ АВТОЗАПУСКА И АВТОПОДКЛЮЧЕНИЯ */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          backgroundColor: '#1c2230', 
          padding: '12px', 
          borderRadius: '10px',
          border: '1px solid #2d3748'
        }}>
          {/* Автозапуск */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Запускать вместе с Windows</span>
            <input 
              type="checkbox" 
              checked={autostart} 
              onChange={(e) => handleToggleAutostart(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
          </div>
          
          {/* Автоподключение */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Подключать прокси при старте</span>
            <input 
              type="checkbox" 
              checked={autoConnect} 
              onChange={(e) => setAutoConnect(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ 
            color: '#f43f5e', 
            backgroundColor: 'rgba(244, 63, 94, 0.1)', 
            border: '1px solid rgba(244, 63, 94, 0.2)',
            padding: '10px', 
            borderRadius: '8px', 
            fontSize: '12px'
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
              ? '0 4px 14px rgba(224, 62, 62, 0.2)' 
              : '0 4px 14px rgba(0, 136, 204, 0.2)',
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
              boxShadow: '0 4px 14px rgba(34, 158, 217, 0.2)',
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