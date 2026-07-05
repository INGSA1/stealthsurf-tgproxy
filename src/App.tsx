import './App.css';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function App() {
  const [token, setToken] = useState('');
  const [port, setPort] = useState(10808);
  const [sni, setSni] = useState(''); // Сделали пустым по дефолту, раз работает без SNI
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    try {
      if (isConnected) {
        await invoke('stop_proxy');
        setIsConnected(false);
      } else {
        await invoke('start_proxy', { token, localPort: port, customSni: sni });
        setIsConnected(true);
      }
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

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
      padding: '24px', 
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
      
      {/* КАРТОЧКА ИНТЕРФЕЙСА С НЕОНОВЫМ СВЕЧЕНИЕМ */}
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
        gap: '16px'
      }}>
        
        {/* ШАПКА И СТАТУС-ПУЛЬСАР */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              StealthSurf <span style={{ color: '#0088cc' }}>Proxy</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Локальный Telegram-клиент
            </p>
          </div>
          
          {/* Пульсирующий индикатор */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1c2230', padding: '6px 12px', borderRadius: '20px', border: '1px solid #2d3748' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#f43f5e',
              boxShadow: isConnected ? '0 0 10px #10b981' : '0 0 10px #f43f5e',
              display: 'inline-block',
              animation: 'pulse 1.5s infinite ease-in-out'
            }} />
            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', color: isConnected ? '#10b981' : '#f43f5e' }}>
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* CSS АНИМАЦИЯ ПУЛЬСАРА (Добавим динамический тег style) */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; transform: scale(1.15); }
            100% { opacity: 0.6; }
          }
        `}} />

        {/* ГРУППА ПОЛЕЙ ВВОДА */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
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
                padding: '10px 14px', 
                borderRadius: '8px', 
                border: '1px solid #2d3748', 
                backgroundColor: '#1c2230', 
                color: '#fff',
                outline: 'none',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#0088cc'}
              onBlur={(e) => e.target.style.borderColor = '#2d3748'}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
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
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid #2d3748', 
                  backgroundColor: '#1c2230', 
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0088cc'}
                onBlur={(e) => e.target.style.borderColor = '#2d3748'}
              />
            </div>

            <div style={{ width: '120px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                Порт
              </label>
              <input 
                type="number" 
                value={port} 
                onChange={(e) => setPort(Number(e.target.value))} 
                disabled={isConnected}
                style={{ 
                  width: '100%', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid #2d3748', 
                  backgroundColor: '#1c2230', 
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  textAlign: 'center'
                }}
                onFocus={(e) => e.target.style.borderColor = '#0088cc'}
                onBlur={(e) => e.target.style.borderColor = '#2d3748'}
              />
            </div>
          </div>
        </div>

        {/* ПЛАШКА ОШИБКИ */}
        {error && (
          <div style={{ 
            color: '#f43f5e', 
            backgroundColor: 'rgba(244, 63, 94, 0.1)', 
            border: '1px solid rgba(244, 63, 94, 0.2)',
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '13px',
            lineHeight: '1.4'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* КНОПКА ЗАПУСКА */}
        <button 
          onClick={handleConnect} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '10px',
            backgroundColor: isConnected ? '#e03e3e' : '#0088cc',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            boxShadow: isConnected 
              ? '0 4px 14px rgba(224, 62, 62, 0.3)' 
              : '0 4px 14px rgba(0, 136, 204, 0.3)',
            marginTop: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {loading ? 'Секунду...' : isConnected ? 'Остановить подключение' : 'Активировать прокси'}
        </button>

        {/* КНОПКА TELEGRAM */}
        {isConnected && (
          <button 
            onClick={handleConfigureTelegram}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#229ED9',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              boxShadow: '0 4px 14px rgba(34, 158, 217, 0.3)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Интегрировать в Telegram ✈️
          </button>
        )}
      </div>
    </div>
  );
}