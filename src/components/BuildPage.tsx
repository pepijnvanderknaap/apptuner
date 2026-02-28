import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

type BuildStatus = 'idle' | 'uploading' | 'signing' | 'done' | 'error';

interface Build {
  buildId: string;
  appName: string;
  bundleId: string;
  status: BuildStatus;
  downloadUrl?: string;
  filename?: string;
  error?: string;
  createdAt: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://relay.apptuner.io';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:...;base64," prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BuildPage() {
  const { user } = useAuth();

  const [appName, setAppName] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [p12Password, setP12Password] = useState('');
  const [p12File, setP12File] = useState<File | null>(null);
  const [provisionFile, setProvisionFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);

  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [currentBuild, setCurrentBuild] = useState<Build | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Poll build status until done or error
  useEffect(() => {
    if (!currentBuild || buildStatus !== 'signing') return;

    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/builds/${currentBuild.buildId}`);
        const data = await res.json();

        if (data.status === 'done') {
          clearInterval(pollInterval.current!);
          setCurrentBuild(b => b ? { ...b, status: 'done', downloadUrl: API_BASE + data.downloadUrl, filename: data.filename } : b);
          setBuildStatus('done');
        } else if (data.status === 'error') {
          clearInterval(pollInterval.current!);
          setCurrentBuild(b => b ? { ...b, status: 'error', error: data.error } : b);
          setBuildStatus('error');
          setError(data.error || 'Signing failed');
        }
      } catch {
        // network blip — keep polling
      }
    }, 3000);

    return () => { if (pollInterval.current) clearInterval(pollInterval.current); };
  }, [currentBuild?.buildId, buildStatus]);

  const handleBuild = async () => {
    setError(null);

    if (!p12File || !provisionFile || !appName.trim() || !bundleId.trim() || !p12Password) {
      setError('Fill in all required fields: app name, bundle ID, .p12 file, .p12 password, and provisioning profile.');
      return;
    }

    setBuildStatus('uploading');

    try {
      const [p12Base64, mobileprovisionBase64, iconBase64] = await Promise.all([
        readFileAsBase64(p12File),
        readFileAsBase64(provisionFile),
        iconFile ? readFileAsBase64(iconFile) : Promise.resolve(null),
      ]);

      const res = await fetch(`${API_BASE}/api/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          appName: appName.trim(),
          bundleId: bundleId.trim(),
          p12Base64,
          p12Password,
          mobileprovisionBase64,
          ...(iconBase64 ? { iconBase64 } : {}),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Server error');

      setCurrentBuild({
        buildId: data.buildId,
        appName: appName.trim(),
        bundleId: bundleId.trim(),
        status: 'signing',
        createdAt: Date.now(),
      });
      setBuildStatus('signing');
    } catch (err: any) {
      setBuildStatus('error');
      setError(err.message || 'Unknown error');
    }
  };

  const handleReset = () => {
    setBuildStatus('idle');
    setCurrentBuild(null);
    setError(null);
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Build IPA</h2>
        <p style={styles.subtitle}>
          Re-sign the AppTuner shell with your Apple certificate and get a distribution-ready .ipa in ~30 seconds.
        </p>
      </div>

      {(buildStatus === 'idle' || buildStatus === 'uploading' || buildStatus === 'error') ? (
        <div style={styles.form}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={styles.row}>
            <label style={styles.label}>App name *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="My App"
              value={appName}
              onChange={e => setAppName(e.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Bundle ID *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="com.yourcompany.myapp"
              value={bundleId}
              onChange={e => setBundleId(e.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>.p12 certificate *</label>
            <FileDropZone
              accept=".p12"
              label="Drop .p12 file or click to browse"
              file={p12File}
              onChange={setP12File}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Certificate password *</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={p12Password}
              onChange={e => setP12Password(e.target.value)}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Provisioning profile (.mobileprovision) *</label>
            <FileDropZone
              accept=".mobileprovision"
              label="Drop .mobileprovision file or click to browse"
              file={provisionFile}
              onChange={setProvisionFile}
            />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>App icon (optional)</label>
            <FileDropZone
              accept="image/png"
              label="Drop 1024×1024 PNG icon or click to browse"
              file={iconFile}
              onChange={setIconFile}
            />
          </div>

          <div style={styles.helpBox}>
            <strong>Where to get these files:</strong>
            <ul style={styles.helpList}>
              <li><strong>.p12</strong> — Export from Keychain (your iOS Distribution certificate)</li>
              <li><strong>.mobileprovision</strong> — Download from Apple Developer portal (App Store distribution profile for your bundle ID)</li>
            </ul>
          </div>

          <button
            style={styles.buildButton}
            onClick={handleBuild}
            disabled={buildStatus === 'uploading'}
          >
            {buildStatus === 'uploading' ? 'Uploading...' : 'Build IPA'}
          </button>
        </div>
      ) : buildStatus === 'signing' ? (
        <div style={styles.statusBox}>
          <div style={styles.spinner} />
          <h3 style={styles.statusTitle}>Signing in progress...</h3>
          <p style={styles.statusText}>
            Re-signing <strong>{currentBuild?.appName}</strong> ({currentBuild?.bundleId})
          </p>
          <p style={styles.statusHint}>This usually takes 15–30 seconds.</p>
        </div>
      ) : buildStatus === 'done' && currentBuild ? (
        <div style={styles.successBox}>
          <div style={styles.successIcon}>✓</div>
          <h3 style={styles.successTitle}>IPA Ready</h3>
          <p style={styles.statusText}>
            <strong>{currentBuild.appName}</strong> ({currentBuild.bundleId})
          </p>
          <a
            href={currentBuild.downloadUrl}
            download={currentBuild.filename}
            style={styles.downloadButton}
          >
            Download {currentBuild.filename}
          </a>
          <p style={styles.uploadHint}>
            Upload the .ipa to <a href="https://appstoreconnect.apple.com" target="_blank" rel="noopener noreferrer" style={styles.link}>App Store Connect</a> via Transporter or Xcode Organizer.
          </p>
          <button style={styles.resetButton} onClick={handleReset}>
            Build another
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── FileDropZone ──────────────────────────────────────────────────────────────

function FileDropZone({
  accept,
  label,
  file,
  onChange,
}: {
  accept: string;
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div
      style={{ ...styles.dropZone, ...(dragging ? styles.dropZoneActive : {}) }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <span style={styles.fileName}>✓ {file.name}</span>
      ) : (
        <span style={styles.dropZoneLabel}>{label}</span>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '24px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#e8e8e8',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    fontSize: 14,
    color: '#999',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#ccc',
  },
  input: {
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '9px 12px',
    fontSize: 14,
    color: '#e8e8e8',
    outline: 'none',
  },
  dropZone: {
    background: '#1a1a1a',
    border: '1.5px dashed #444',
    borderRadius: 6,
    padding: '14px 16px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  dropZoneActive: {
    borderColor: '#4ade80',
    background: '#1e2e1e',
  },
  dropZoneLabel: {
    fontSize: 13,
    color: '#666',
  },
  fileName: {
    fontSize: 13,
    color: '#4ade80',
  },
  helpBox: {
    background: '#161616',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    padding: '12px 14px',
    fontSize: 13,
    color: '#888',
    lineHeight: 1.6,
  },
  helpList: {
    marginTop: 6,
    marginBottom: 0,
    paddingLeft: 18,
  },
  buildButton: {
    background: '#4ade80',
    color: '#111',
    border: 'none',
    borderRadius: 6,
    padding: '12px 0',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    marginTop: 4,
  },
  errorBox: {
    background: '#2a1010',
    border: '1px solid #552222',
    borderRadius: 6,
    padding: '10px 14px',
    fontSize: 13,
    color: '#f87171',
  },
  statusBox: {
    textAlign: 'center',
    padding: '48px 24px',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #333',
    borderTopColor: '#4ade80',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 20px',
  },
  statusTitle: {
    margin: '0 0 8px',
    fontSize: 18,
    color: '#fff',
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
    margin: '0 0 6px',
  },
  statusHint: {
    fontSize: 13,
    color: '#666',
    margin: 0,
  },
  successBox: {
    textAlign: 'center',
    padding: '40px 24px',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#1a2e1a',
    border: '2px solid #4ade80',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: 22,
    color: '#4ade80',
  },
  successTitle: {
    margin: '0 0 8px',
    fontSize: 20,
    color: '#fff',
  },
  downloadButton: {
    display: 'inline-block',
    background: '#4ade80',
    color: '#111',
    textDecoration: 'none',
    borderRadius: 6,
    padding: '11px 24px',
    fontSize: 14,
    fontWeight: 600,
    margin: '16px 0 12px',
  },
  uploadHint: {
    fontSize: 13,
    color: '#666',
    margin: '0 0 20px',
  },
  link: {
    color: '#4ade80',
  },
  resetButton: {
    background: 'transparent',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '8px 20px',
    fontSize: 13,
    color: '#888',
    cursor: 'pointer',
  },
};
