import { useState, useEffect, useRef } from 'react';

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  args: any[];
  timestamp: number;
}

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
  maxLogs?: number;
  onMaxLogsChange?: (maxLogs: number) => void;
}

export function ConsolePanel({ logs, onClear, maxLogs = 500, onMaxLogsChange }: ConsolePanelProps) {
  const [filter, setFilter] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatArg = (arg: any): string => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'string') return arg;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return String(arg);
      }
    }
    return String(arg);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const timeString = date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${timeString}.${ms}`;
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error':
        return '#ff3b30';
      case 'warn':
        return '#ff9500';
      case 'info':
        return '#007aff';
      case 'debug':
        return '#86868b';
      default:
        return '#1d1d1f';
    }
  };

  const getLevelDot = (level: string): JSX.Element => {
    const color = getLevelColor(level);
    return (
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        marginTop: '6px'
      }} />
    );
  };

  const filteredLogs =
    filter === 'all'
      ? logs
      : logs.filter((log) => log.level === filter);

  const logCounts = {
    all: logs.length,
    log: logs.filter((l) => l.level === 'log').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    error: logs.filter((l) => l.level === 'error').length,
    info: logs.filter((l) => l.level === 'info').length,
    debug: logs.filter((l) => l.level === 'debug').length,
  };

  const copyLogsToClipboard = () => {
    // Format logs in a clean, AI-friendly format
    const formattedLogs = filteredLogs.map((log) => {
      const timestamp = formatTimestamp(log.timestamp);
      const levelName = log.level.toUpperCase();
      const message = log.args.map(formatArg).join(' ');
      return `[${timestamp}] ${levelName}: ${message}`;
    }).join('\n');

    navigator.clipboard.writeText(formattedLogs).then(() => {
      // Could add a toast notification here
      console.log('Logs copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy logs:', err);
    });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-md)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600' }}>
            Console
          </span>
          {logs.length > 0 && (
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-tertiary)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}>
              {logs.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <label style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>

          <button
            onClick={copyLogsToClipboard}
            disabled={filteredLogs.length === 0}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: filteredLogs.length === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: filteredLogs.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
              opacity: filteredLogs.length === 0 ? 0.5 : 1,
            }}
            onMouseOver={(e) => {
              if (filteredLogs.length > 0) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            📋 Copy Logs
          </button>

          <button
            onClick={onClear}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px solid var(--border)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Clear
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--text-secondary)',
                background: showSettings ? 'var(--bg-tertiary)' : 'transparent',
                border: '1px solid var(--border)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                if (!showSettings) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseOut={(e) => {
                if (!showSettings) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              ⚙️
            </button>

            {showSettings && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-md)',
                minWidth: '250px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
              }}>
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <label style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: 'var(--space-xs)',
                  }}>
                    Log Retention
                  </label>
                  <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-sm)',
                  }}>
                    Maximum number of logs to keep
                  </p>
                  <select
                    value={maxLogs}
                    onChange={(e) => onMaxLogsChange?.(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="100">100 logs (minimal)</option>
                    <option value="500">500 logs (recommended)</option>
                    <option value="1000">1000 logs (heavy)</option>
                    <option value="999999">Unlimited</option>
                  </select>
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-tertiary)',
                  marginTop: 'var(--space-sm)',
                  paddingTop: 'var(--space-sm)',
                  borderTop: '1px solid var(--border)',
                }}>
                  Current: {logs.length} / {maxLogs === 999999 ? '∞' : maxLogs}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-xs)',
        padding: 'var(--space-sm)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        overflowX: 'auto',
      }}>
        {(['all', 'log', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            style={{
              fontSize: 'var(--font-size-sm)',
              color: filter === level ? 'var(--accent)' : 'var(--text-secondary)',
              background: filter === level ? 'var(--accent-light)' : 'transparent',
              border: '1px solid',
              borderColor: filter === level ? 'var(--accent)' : 'var(--border)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
              whiteSpace: 'nowrap',
              fontWeight: filter === level ? '600' : '400',
            }}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
            {logCounts[level] > 0 && (
              <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                ({logCounts[level]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Logs Container */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-sm)',
          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-tertiary)',
          }}>
            <span style={{ fontSize: '48px', marginBottom: 'var(--space-md)' }}>📭</span>
            <p>No console logs yet</p>
            <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)' }}>
              Logs from your mobile app will appear here
            </p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: 'var(--space-sm)',
                borderBottom: index < filteredLogs.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                gap: 'var(--space-sm)',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {getLevelDot(log.level)}
              </div>
              <span style={{
                color: 'var(--text-tertiary)',
                fontSize: '11px',
                fontFamily: 'Monaco, monospace',
                flexShrink: 0,
                minWidth: '80px',
              }}>
                {formatTimestamp(log.timestamp)}
              </span>
              <div style={{
                flex: 1,
                color: getLevelColor(log.level),
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
              }}>
                {log.args.map((arg, i) => (
                  <span key={i}>
                    {formatArg(arg)}
                    {i < log.args.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
