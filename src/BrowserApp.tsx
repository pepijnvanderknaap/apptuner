import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ConnectionManager, generateSessionId } from './services/connection';
import { ProjectManager, BundleMetrics } from './services/project-manager';
import { ConsolePanel, ConsoleLog } from './components/ConsolePanel';
import { Device } from './components/DeviceList';
import { Toast, ToastType } from './components/Toast';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

function BrowserApp() {
  // Detect if running on apptuner.io or pages.dev (cloud mode) vs localhost (dev mode)
  const isCloudMode = window.location.hostname === 'apptuner.io' ||
    window.location.hostname.endsWith('.pages.dev');

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
  const [maxLogs, setMaxLogs] = useState<number>(() => {
    const saved = localStorage.getItem('apptuner_max_logs');
    return saved ? parseInt(saved) : 500;
  });
  const [showRelaySettings, setShowRelaySettings] = useState<boolean>(false);
  const [customRelayUrl, setCustomRelayUrl] = useState<string>(() => {
    return localStorage.getItem('apptuner_relay_url') || 'ws://192.168.178.48:8787';
  });

  const connectionRef = useRef<ConnectionManager | null>(null);
  const projectManagerRef = useRef<ProjectManager | null>(null);
  const isTogglingRef = useRef<boolean>(false);
  const unsubscribeStatusRef = useRef<(() => void) | null>(null);
  const unsubscribeMessageRef = useRef<(() => void) | null>(null);
  const logBatchRef = useRef<ConsoleLog[]>([]);
  const logBatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session once on mount
  useEffect(() => {
    initializeSession();

    return () => {
      // Clean up event handlers to prevent memory leaks
      if (unsubscribeStatusRef.current) {
        unsubscribeStatusRef.current();
        unsubscribeStatusRef.current = null;
      }
      if (unsubscribeMessageRef.current) {
        unsubscribeMessageRef.current();
        unsubscribeMessageRef.current = null;
      }

      // Clean up log batch timer
      if (logBatchTimerRef.current) {
        clearTimeout(logBatchTimerRef.current);
        logBatchTimerRef.current = null;
      }

      // Don't disconnect on cleanup - let the connection persist
      // This prevents StrictMode's intentional unmount/remount from killing the connection
      // The browser will close the WebSocket when the tab is actually closed
    };
  }, []);

  // Auto-start auto-reload when device connects
  useEffect(() => {
    if (devices.length > 0 && !autoReload && !isTogglingRef.current && connectionRef.current) {
      console.log('🚀 Device connected, auto-starting reload...');
      toggleAutoReload();
    }
  }, [devices.length]);

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
      // Read session from URL parameter if present, otherwise generate a new one
      const urlParams = new URLSearchParams(window.location.search);
      const sid = urlParams.get('session') || generateSessionId();
      setSessionId(sid);

      // Disconnect any existing connection first
      if (connectionRef.current) {
        console.log('Disconnecting old connection before creating new one');
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }

      // Initialize connection manager with appropriate client type
      const clientType = isCloudMode ? 'dashboard' : 'desktop';
      const connection = new ConnectionManager(sid, clientType);
      connectionRef.current = connection;

      // Subscribe to connection status changes (store unsubscribe function)
      unsubscribeStatusRef.current = connection.onStatusChange((status) => {
        const stateMap: Record<string, ConnectionState> = {
          disconnected: 'disconnected',
          connecting: 'connecting',
          connected: 'connected',
          reconnecting: 'reconnecting',
          error: 'error',
        };
        setConnectionState(stateMap[status] || 'disconnected');
      });

      // Subscribe to messages from mobile devices (store unsubscribe function)
      unsubscribeMessageRef.current = connection.onMessage((data) => {
        // Handle console logs with batching to improve performance
        if (data.type === 'console_log' && data.payload) {
          const consoleLog: ConsoleLog = {
            level: data.payload.level || 'log',
            args: data.payload.args || [],
            timestamp: data.payload.timestamp || Date.now(),
          };

          // Add to batch instead of immediate state update
          logBatchRef.current.push(consoleLog);

          // Clear existing timer
          if (logBatchTimerRef.current) {
            clearTimeout(logBatchTimerRef.current);
          }

          // Flush batch after 50ms of inactivity (debounce rapid logs)
          logBatchTimerRef.current = setTimeout(() => {
            const batch = [...logBatchRef.current];
            logBatchRef.current = [];

            if (batch.length > 0) {
              setConsoleLogs((prev) => {
                const newLogs = [...prev, ...batch];
                // Trim logs to maxLogs if exceeded (keep most recent)
                if (newLogs.length > maxLogs) {
                  return newLogs.slice(newLogs.length - maxLogs);
                }
                return newLogs;
              });
            }
          }, 50);
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
            projectManagerRef.current.stop();
          }
        }
      });

      // Connect to relay using appropriate URL based on environment
      let relayUrl: string;
      if (isCloudMode) {
        // Production: use VPS relay server
        relayUrl = 'wss://relay.apptuner.io';
      } else {
        // Dev mode: use custom URL or default
        relayUrl = localStorage.getItem('apptuner_relay_url') || 'ws://192.168.178.48:8787';
      }
      await connection.connect(relayUrl);

      console.log(`Connected to relay server: ${relayUrl} (mode: ${isCloudMode ? 'cloud' : 'dev'}, client: ${clientType})`);

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

  const handleMaxLogsChange = (newMaxLogs: number) => {
    setMaxLogs(newMaxLogs);
    localStorage.setItem('apptuner_max_logs', String(newMaxLogs));

    // Trim existing logs if new limit is lower
    setConsoleLogs((prev) => {
      if (prev.length > newMaxLogs) {
        return prev.slice(prev.length - newMaxLogs);
      }
      return prev;
    });
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

          {/* Change Relay Link (only show when no devices connected) */}
          {devices.length === 0 && (
            <button
              onClick={() => setShowRelaySettings(true)}
              style={{
                fontSize: '13px',
                color: '#666',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px 8px',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = '#000';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = '#666';
              }}
            >
              Change Relay
            </button>
          )}

          {/* Status (show when devices connected or auto-reload active) */}
          {(devices.length > 0 || autoReload) && (
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
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '42px 24px',
      }}>
        {/* STEP 1: Connect Device (only show when NOT connected) */}
        {devices.length === 0 && (
          <div style={{
            background: 'white',
            border: '1px solid #eaeaea',
            borderRadius: '8px',
            padding: '58px 32px 48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative'
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
              margin: '0 0 8px 0',
              maxWidth: '500px',
              lineHeight: '1.5'
            }}>
              Open the AppTuner app on your phone and scan this QR code
            </p>

            {/* Waiting for Device Status - centered under instruction */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '16px',
              color: '#666',
              marginBottom: '32px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: getStatusColor()
              }} />
              {getStatusText()}
            </div>

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

        {/* Console (show when auto-reload is active) */}
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
              <ConsolePanel
                logs={consoleLogs}
                onClear={clearLogs}
                maxLogs={maxLogs}
                onMaxLogsChange={handleMaxLogsChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Relay Settings Modal */}
      {showRelaySettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRelaySettings(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#000',
            }}>
              Custom Relay Server
            </h3>

            <p style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.5',
              marginBottom: '24px',
            }}>
              By default, AppTuner uses Cloudflare Workers as a relay server. If Cloudflare is blocked in your region, you can deploy our relay code to your own server.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#000',
                marginBottom: '8px',
              }}>
                Relay Server URL
              </label>
              <input
                type="text"
                value={customRelayUrl}
                onChange={(e) => setCustomRelayUrl(e.target.value)}
                placeholder="ws://192.168.178.48:8787"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontFamily: 'Menlo, Monaco, monospace',
                }}
              />
              <p style={{
                fontSize: '12px',
                color: '#999',
                marginTop: '6px',
              }}>
                Enter the WebSocket URL of your custom relay server
              </p>
            </div>

            <div style={{
              padding: '16px',
              background: '#f8f8f8',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#000',
                marginBottom: '8px',
              }}>
                Need to deploy your own relay?
              </div>
              <p style={{
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.5',
                marginBottom: '12px',
              }}>
                Download our relay server code and deploy it to any cloud provider (AWS, Azure, Digital Ocean, etc.)
              </p>
              <button
                onClick={() => {
                  // Create a zip file download of the relay folder
                  window.open('https://github.com/pepijnvanderknaap/apptuner/tree/main/relay', '_blank');
                }}
                style={{
                  padding: '8px 16px',
                  background: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                📥 Download Relay Code
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowRelaySettings(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('apptuner_relay_url', customRelayUrl);
                  setShowRelaySettings(false);
                  setToast({ message: 'Relay URL updated! Please refresh to reconnect.', type: 'success' });
                }}
                style={{
                  padding: '10px 20px',
                  background: '#000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

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
