import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ConnectionManager, generateSessionId } from './services/connection';
import { ProjectManager, BundleMetrics } from './services/project-manager';
import { ConsolePanel, ConsoleLog } from './components/ConsolePanel';
import { Device } from './components/DeviceList';
import { Toast, ToastType } from './components/Toast';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

function BrowserApp() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [sessionId, setSessionId] = useState<string>('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [projectPath, setProjectPath] = useState<string>('public');
  const [useMetro, setUseMetro] = useState<boolean>(false);
  const [autoReload, setAutoReload] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [lastBundleMetrics, setLastBundleMetrics] = useState<BundleMetrics | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const connectionRef = useRef<ConnectionManager | null>(null);
  const projectManagerRef = useRef<ProjectManager | null>(null);
  const isTogglingRef = useRef<boolean>(false);

  // Initialize session once on mount
  useEffect(() => {
    initializeSession();

    return () => {
      // Don't disconnect on cleanup - let the connection persist
      // This prevents StrictMode's intentional unmount/remount from killing the connection
      // The browser will close the WebSocket when the tab is actually closed
    };
  }, []);

  // Set up keyboard shortcuts (re-run when autoReload changes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+R or Ctrl+R: Trigger bundle reload
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        if (projectManagerRef.current && autoReload) {
          console.log('⌨️  Keyboard shortcut: Reloading bundle (Cmd+R)');
          projectManagerRef.current.triggerUpdate();
        }
      }

      // Cmd+K or Ctrl+K: Clear console logs
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        console.log('⌨️  Keyboard shortcut: Clearing console (Cmd+K)');
        clearLogs();
        setToast({ message: 'Console cleared', type: 'info' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [autoReload]);

  // Generate QR code when session ID changes
  useEffect(() => {
    if (sessionId) {
      // Generate QR code with proper URL format that mobile app expects
      const qrData = `apptuner://connect/${sessionId}`;
      QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [sessionId]);

  const initializeSession = async () => {
    try {
      // Generate random 6-character session ID
      const sid = generateSessionId();
      setSessionId(sid);

      // Disconnect any existing connection first
      if (connectionRef.current) {
        console.log('Disconnecting old connection before creating new one');
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }

      // Initialize connection manager
      const connection = new ConnectionManager(sid);
      connectionRef.current = connection;

      // Subscribe to connection status changes
      connection.onStatusChange((status) => {
        const stateMap: Record<string, ConnectionState> = {
          disconnected: 'disconnected',
          connecting: 'connecting',
          connected: 'connected',
          reconnecting: 'reconnecting',
          error: 'error',
        };
        setConnectionState(stateMap[status] || 'disconnected');
      });

      // Subscribe to messages from mobile devices
      connection.onMessage((data) => {
        // Handle console logs
        if (data.type === 'console_log' && data.payload) {
          const consoleLog: ConsoleLog = {
            level: data.payload.level || 'log',
            args: data.payload.args || [],
            timestamp: data.payload.timestamp || Date.now(),
          };
          setConsoleLogs((prev) => [...prev, consoleLog]);
        }

        // Handle mobile device connection
        if (data.type === 'mobile_connected') {
          const newDevice: Device = {
            deviceId: 'mobile-1',
            deviceInfo: {
              name: 'Mobile Device',
              platform: 'ios',
              model: 'iPhone',
              osVersion: '15.0',
            },
            connectedAt: data.timestamp || Date.now(),
            lastActivity: data.timestamp || Date.now(),
          };
          setDevices([newDevice]);
          setSelectedDeviceId(null);
        }

        // Handle mobile device disconnection
        if (data.type === 'mobile_disconnected') {
          setDevices([]);
          setSelectedDeviceId(null);

          // Stop auto-reload when last device disconnects
          setAutoReload(false);
          if (projectManagerRef.current) {
            projectManagerRef.current.stopWatching();
          }
        }
      });

      // Connect to relay
      await connection.connect('ws://192.168.178.48:8787');

      console.log('Connected to relay server');

    } catch (error) {
      console.error('Session initialization error:', error);
      setConnectionState('error');
    }
  };

  const toggleAutoReload = async () => {
    // Prevent double-calls
    if (isTogglingRef.current) {
      console.log('⚠️ Toggle already in progress, ignoring');
      return;
    }

    if (!connectionRef.current) {
      alert('Error: Not connected to relay');
      return;
    }

    isTogglingRef.current = true;

    try {
      if (autoReload) {
        // Stop auto-reload
        if (projectManagerRef.current) {
          projectManagerRef.current.stop();
          projectManagerRef.current = null;
        }
        setAutoReload(false);
        console.log('🛑 Auto-reload stopped');
      } else {
        // Start auto-reload
        const projectManager = new ProjectManager({
          path: projectPath,
          name: 'Test Project',
          entryPoint: projectPath === 'public' ? 'test-bundle.js' : 'App.tsx',
          useMetro: useMetro,
        });

        // Subscribe to bundle metrics
        projectManager.setOnMetrics((metrics) => {
          setLastBundleMetrics(metrics);
          setToast({
            message: `Bundle sent! ${metrics.sizeKB} KB in ${metrics.timeMs}ms`,
            type: 'success'
          });
        });

        await projectManager.start(connectionRef.current);
        projectManagerRef.current = projectManager;
        setAutoReload(true);
        console.log('🚀 Auto-reload started');
      }
    } finally {
      isTogglingRef.current = false;
    }
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  const copySessionId = () => {
    navigator.clipboard.writeText(sessionId);
    setCopySuccess(true);
    setToast({ message: 'Session ID copied!', type: 'success' });
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected': return devices.length > 0 ? '#34C759' : '#FF9500';
      case 'connecting': case 'reconnecting': return '#007AFF';
      case 'error': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'connected': return devices.length > 0 ? 'Connected' : 'Waiting for Device';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #eaeaea',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h1 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#000',
            margin: 0
          }}>
            AppTuner
          </h1>

          {/* Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#666'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: getStatusColor()
            }} />
            {getStatusText()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        {/* STEP 1: Connect Device (only show when NOT connected) */}
        {devices.length === 0 && (
          <div style={{
            background: 'white',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#000',
              margin: '0 0 12px 0'
            }}>
              Connect Your Mobile Device
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: '0 0 48px 0',
              maxWidth: '500px',
              lineHeight: '1.5'
            }}>
              Open the AppTuner app on your phone and scan this QR code
            </p>

            {/* Bigger QR Code */}
            {qrCodeUrl && (
              <div style={{
                padding: '24px',
                background: 'white',
                border: '2px solid #eaeaea',
                borderRadius: '12px',
                marginBottom: '32px'
              }}>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  style={{
                    width: '280px',
                    height: '280px',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {/* Manual Code Below QR */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                fontSize: '15px',
                color: '#666',
                fontWeight: '500'
              }}>
                Or enter this code manually:
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                <code style={{
                  fontSize: '48px',
                  fontFamily: 'Menlo, Monaco, monospace',
                  fontWeight: '600',
                  color: '#000',
                  letterSpacing: '0.1em'
                }}>
                  {sessionId || '------'}
                </code>
                <button
                  onClick={copySessionId}
                  style={{
                    padding: '12px 24px',
                    background: copySuccess ? '#000' : 'white',
                    color: copySuccess ? 'white' : '#000',
                    border: '2px solid #000',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.background = '#000';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!copySuccess) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#000';
                    }
                  }}
                >
                  {copySuccess ? '✓ Copied' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Start Auto-Reload (show when connected but NOT started) */}
        {devices.length > 0 && !autoReload && (
          <div style={{
            background: 'white',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#34C759',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '24px'
            }}>
              ✓
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#000',
              margin: '0 0 12px 0'
            }}>
              Device Connected!
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666',
              margin: '0 0 48px 0',
              maxWidth: '500px',
              lineHeight: '1.5'
            }}>
              Your mobile device is ready. Start auto-reload to see your changes instantly.
            </p>

            {/* Big Start Button */}
            <button
              onClick={toggleAutoReload}
              style={{
                padding: '20px 60px',
                background: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '20px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '40px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Start Auto-Reload
            </button>

            {/* Project Path */}
            <div style={{
              width: '100%',
              maxWidth: '500px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                color: '#666',
                fontWeight: '500',
                marginBottom: '8px',
                textAlign: 'left'
              }}>
                Project Path
              </label>
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                placeholder="e.g., public or test-app"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #eaeaea',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontFamily: 'Menlo, Monaco, monospace',
                  background: 'white',
                  color: '#000',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#000'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#eaeaea'}
              />
              {projectPath !== 'public' && (
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: '12px'
                }}>
                  <input
                    type="checkbox"
                    checked={useMetro}
                    onChange={(e) => setUseMetro(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    fontSize: '14px',
                    color: '#000',
                    fontWeight: '500'
                  }}>
                    Use Metro Bundler
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Console (show when auto-reload is active) */}
        {autoReload && (
          <>
            {/* Compact Control Bar at Top */}
            <div style={{
              background: 'white',
              border: '1px solid #eaeaea',
              borderRadius: '8px',
              padding: '20px 24px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px'
            }}>
              {/* Left: Stop Button */}
              <button
                onClick={toggleAutoReload}
                style={{
                  padding: '12px 24px',
                  background: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Stop
              </button>

              {/* Center: Project Path */}
              <div style={{
                flex: 1,
                minWidth: '200px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  {projectPath}
                </span>
                {lastBundleMetrics && (
                  <>
                    <span style={{ color: '#eaeaea' }}>•</span>
                    <span style={{
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      <span style={{ fontWeight: '600', color: '#000' }}>{lastBundleMetrics.sizeKB}</span> KB
                    </span>
                    <span style={{ color: '#eaeaea' }}>•</span>
                    <span style={{
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      <span style={{ fontWeight: '600', color: '#000' }}>{lastBundleMetrics.timeMs}</span> ms
                    </span>
                  </>
                )}
              </div>

              {/* Right: Keyboard Shortcuts */}
              <div style={{
                fontSize: '12px',
                color: '#666',
                display: 'flex',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{
                    padding: '3px 7px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'Menlo, Monaco, monospace',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#333'
                  }}>⌘R</kbd>
                  <span>Reload</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{
                    padding: '3px 7px',
                    background: '#f5f5f5',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'Menlo, Monaco, monospace',
                    fontSize: '11px',
                    fontWeight: '500',
                    color: '#333'
                  }}>⌘K</kbd>
                  <span>Clear</span>
                </div>
              </div>
            </div>

            {/* Console Panel */}
            <div style={{
              background: 'white',
              border: '1px solid #eaeaea',
              borderRadius: '8px',
              overflow: 'hidden',
              height: '600px'
            }}>
              <ConsolePanel logs={consoleLogs} onClear={clearLogs} />
            </div>
          </>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default BrowserApp;
