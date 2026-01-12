import { useState, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionManager, generateSessionId } from './services/connection';
// import { Bundler } from './services/bundler'; // TODO: Move to Rust backend

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SelectedFolder {
  name: string;
  path: string;
  isValid: boolean;
}

interface ProjectInfo {
  name: string;
  path: string;
  is_valid: boolean;
  has_package_json: boolean;
  has_app_entry: boolean;
}

function App() {
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [sessionUrl, setSessionUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const connectionRef = useRef<ConnectionManager | null>(null);
  // const bundlerRef = useRef<Bundler | null>(null);
  const fileWatcherUnlistenRef = useRef<UnlistenFn | null>(null);

  useEffect(() => {
    if (selectedFolder && selectedFolder.isValid) {
      initializeSession();
    }

    return () => {
      // Cleanup on unmount or folder change
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }
      if (fileWatcherUnlistenRef.current) {
        fileWatcherUnlistenRef.current();
        fileWatcherUnlistenRef.current = null;
      }
      // Stop file watcher
      invoke('stop_file_watcher').catch(console.error);
    };
  }, [selectedFolder]);

  const initializeSession = async () => {
    if (!selectedFolder) return;

    try {
      // Generate session ID and URL
      const sessionId = generateSessionId();
      const url = `apptuner://connect/${sessionId}`;
      setSessionUrl(url);

      // Initialize connection manager
      const connection = new ConnectionManager(sessionId);
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
      });

      // Connect to relay (for now using localhost, will use Cloudflare Workers later)
      await connection.connect('ws://localhost:8787');

      console.log('Connected to relay, creating initial bundle...');

      // Create initial bundle
      try {
        const bundle = await invoke<string>('bundle_project', {
          projectPath: selectedFolder.path,
          entryFile: 'index.js',
        });

        console.log('Initial bundle created, size:', bundle.length, 'bytes');

        // Send initial bundle to any connected mobile apps
        connection.sendBundleUpdate(bundle);
      } catch (error) {
        console.error('Initial bundling error:', error);
        setErrorMessage('Failed to create bundle: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }

      // Start file watcher in Rust backend
      await invoke('start_file_watcher', { path: selectedFolder.path });

      // Listen for file change events from Rust
      const unlisten = await listen<{ files: string[]; timestamp: number }>(
        'file_changed',
        async (event) => {
          console.log('File changed:', event.payload.files);

          // Trigger rebuild on Rust backend
          try {
            console.log('Bundling project...');
            const bundle = await invoke<string>('bundle_project', {
              projectPath: selectedFolder.path,
              entryFile: 'index.js',
            });

            console.log('Bundle created, size:', bundle.length, 'bytes');

            // Send bundle to mobile app via WebSocket
            if (connection) {
              connection.sendBundleUpdate(bundle);
            }
          } catch (error) {
            console.error('Bundling error:', error);
          }
        }
      );

      // Store unlisten function for cleanup
      fileWatcherUnlistenRef.current = unlisten;

    } catch (error) {
      console.error('Session initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      setConnectionState('error');
    }
  };

  const handleSelectFolder = async () => {
    try {
      setErrorMessage('');

      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select React Native project folder',
      });

      if (selected && typeof selected === 'string') {
        // Validate the project using Tauri command
        const projectInfo = await invoke<ProjectInfo>('validate_project', {
          path: selected,
        });

        if (!projectInfo.is_valid) {
          let errorMsg = 'Invalid React Native project. ';
          if (!projectInfo.has_package_json) {
            errorMsg += 'Missing package.json. ';
          }
          if (!projectInfo.has_app_entry) {
            errorMsg += 'Missing App entry point.';
          }
          setErrorMessage(errorMsg);
          return;
        }

        setSelectedFolder({
          name: projectInfo.name,
          path: projectInfo.path,
          isValid: projectInfo.is_valid,
        });
      }
    } catch (error) {
      console.error('Error selecting folder:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to select folder');
    }
  };

  const getConnectionStatusText = (): string => {
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected to device';
      case 'error':
        return errorMessage || 'Connection error';
      default:
        return 'Waiting for device...';
    }
  };

  return (
    <div className="app">
      {/* Draggable window region for macOS */}
      <div className="drag-region" />

      {/* Header */}
      <header className="header">
        <h1 className="header__title">Apptuner</h1>
        <p className="header__subtitle">Test React Native on your phone instantly</p>
      </header>

      {/* Main content */}
      {!selectedFolder ? (
        <div className="empty-state">
          <svg className="empty-state__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h2 className="empty-state__title">No project selected</h2>
          <p className="empty-state__description">
            Select your React Native project folder to get started
          </p>
        </div>
      ) : (
        <>
          {/* Selected folder display */}
          <div className="card card--elevated">
            <div className="folder-selected">
              <svg className="folder-selected__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <div className="folder-selected__info">
                <div className="folder-selected__name">{selectedFolder.name}</div>
                <div className="folder-selected__path">{selectedFolder.path}</div>
              </div>
              <button
                className="folder-selected__change"
                onClick={handleSelectFolder}
              >
                Change
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          {sessionUrl && (
            <div className="card card--elevated">
              <div className="qr-section">
                <div className="qr-code">
                  <QRCodeSVG value={sessionUrl} size={200} />
                </div>
                <p className="qr-section__instruction">
                  Scan with Apptuner mobile app
                </p>
              </div>
            </div>
          )}

          {/* Connection status */}
          <div className={`connection-status connection-status--${connectionState}`}>
            <span className="connection-status__dot"></span>
            <span>{getConnectionStatusText()}</span>
          </div>
        </>
      )}

      {/* Error message */}
      {errorMessage && !selectedFolder && (
        <div className="card card--elevated" style={{ marginTop: '16px' }}>
          <div style={{ color: 'var(--error)', fontSize: '14px', textAlign: 'center' }}>
            {errorMessage}
          </div>
        </div>
      )}

      <div className="spacer" />

      {/* Folder picker button */}
      {!selectedFolder && (
        <div
          className="folder-picker"
          onClick={handleSelectFolder}
        >
          <svg className="folder-picker__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <div className="folder-picker__text">
            Click to select project folder
          </div>
          <div className="folder-picker__hint">
            Choose your React Native project directory
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <p className="footer__text">v0.1.0 • Made with care</p>
      </footer>
    </div>
  );
}

export default App;
