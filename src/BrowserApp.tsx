import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionManager, generateSessionId } from './services/connection';
import { ProjectManager } from './services/project-manager';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

function BrowserApp() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [sessionUrl, setSessionUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [connectedDevices, setConnectedDevices] = useState<number>(0);
  const [projectPath, setProjectPath] = useState<string>('public');
  const [autoReload, setAutoReload] = useState<boolean>(false);

  const connectionRef = useRef<ConnectionManager | null>(null);
  const projectManagerRef = useRef<ProjectManager | null>(null);

  useEffect(() => {
    initializeSession();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }
    };
  }, []);

  const initializeSession = async () => {
    try {
      // Generate session ID and URL
      const sid = generateSessionId();
      setSessionId(sid);
      const url = `apptuner://connect/${sid}`;
      setSessionUrl(url);

      // Initialize connection manager
      const connection = new ConnectionManager(sid);
      connectionRef.current = connection;

      // Subscribe to connection status changes
      connection.onStatusChange((status) => {
        const stateMap: Record<string, ConnectionState> = {
          disconnected: 'disconnected',
          connecting: 'connecting',
          connected: 'connected',
          error: 'error',
        };
        setConnectionState(stateMap[status] || 'disconnected');

        if (status === 'connected') {
          setConnectedDevices(1);
        } else {
          setConnectedDevices(0);
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

  const sendTestBundle = async () => {
    console.log('🔵 Send Test Bundle clicked!');

    if (!connectionRef.current) {
      console.error('❌ No connection reference');
      alert('Error: No connection reference');
      return;
    }

    if (connectionState !== 'connected') {
      console.error('❌ Not connected. Current state:', connectionState);
      alert(`Error: Not connected. State: ${connectionState}`);
      return;
    }

    try {
      // Read the test bundle (plain JavaScript)
      const response = await fetch('/test-bundle.js');
      const testBundle = await response.text();

      console.log('✅ Sending bundle, size:', testBundle.length, 'bytes');
      connectionRef.current.sendBundleUpdate(testBundle);
      console.log('✅ Test bundle sent!');
      alert('Bundle sent! Check your mobile device.');
    } catch (error) {
      console.error('❌ Error reading test bundle:', error);
      alert('Error: Could not load test bundle');
    }
  };

  const toggleAutoReload = async () => {
    if (!connectionRef.current) {
      alert('Error: Not connected to relay');
      return;
    }

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
        entryPoint: 'test-bundle.js',
      });

      await projectManager.start(connectionRef.current);
      projectManagerRef.current = projectManager;
      setAutoReload(true);
      console.log('🚀 Auto-reload started');
    }
  };

  const getConnectionStatusText = (): string => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting to relay...';
      case 'connected':
        return connectedDevices > 0 ? `Connected - ${connectedDevices} device(s)` : 'Waiting for mobile device...';
      case 'error':
        return 'Connection error';
      default:
        return 'Waiting for device...';
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="header__title">Apptuner Test</h1>
        <p className="header__subtitle">Browser Testing Mode</p>
      </header>

      {/* Main content */}
      <div className="card card--elevated" style={{ marginTop: '40px' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h2 style={{ marginBottom: '10px', fontSize: '18px' }}>Session ID</h2>
          <code style={{
            padding: '8px 12px',
            background: '#f5f5f5',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace'
          }}>
            {sessionId || 'Generating...'}
          </code>
        </div>
      </div>

      {/* QR Code Section */}
      {sessionUrl && (
        <div className="card card--elevated" style={{ marginTop: '20px' }}>
          <div className="qr-section">
            <div className="qr-code">
              <QRCodeSVG value={sessionUrl} size={200} />
            </div>
            <p className="qr-section__instruction">
              Scan with Apptuner mobile app
            </p>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              {sessionUrl}
            </p>
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className={`connection-status connection-status--${connectionState}`} style={{ marginTop: '20px' }}>
        <span className="connection-status__dot"></span>
        <span>{getConnectionStatusText()}</span>
      </div>

      {/* Controls */}
      {connectionState === 'connected' && (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          {/* Auto-reload toggle */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Auto-Reload</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
                  {autoReload ? 'Watching for file changes...' : 'Watch project and auto-send updates'}
                </p>
              </div>
              <button
                onClick={toggleAutoReload}
                style={{
                  padding: '8px 16px',
                  background: autoReload ? '#FF3B30' : '#34C759',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {autoReload ? 'Stop' : 'Start'}
              </button>
            </div>

            {/* Project path input */}
            <div style={{ marginTop: '12px' }}>
              <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>
                Project Path:
              </label>
              <input
                type="text"
                value={projectPath}
                onChange={(e) => setProjectPath(e.target.value)}
                disabled={autoReload}
                placeholder="/path/to/your/project"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  background: autoReload ? '#f5f5f5' : 'white',
                }}
              />
            </div>
          </div>

          {/* Manual bundle button */}
          <button
            onClick={sendTestBundle}
            style={{
              padding: '12px 24px',
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Send Test Bundle
          </button>
        </div>
      )}

      <div className="spacer" />

      {/* Footer */}
      <footer className="footer">
        <p className="footer__text">v0.1.0 • Browser Test Mode</p>
      </footer>
    </div>
  );
}

export default BrowserApp;
