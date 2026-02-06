import React from 'react';

export interface Device {
  deviceId: string;
  deviceInfo?: {
    name: string;
    platform: string;
    model: string;
    osVersion?: string;
  };
  connectedAt: number;
  lastActivity: number;
}

interface DeviceListProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string | null) => void;
}

export function DeviceList({ devices, selectedDeviceId, onSelectDevice }: DeviceListProps) {
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
        return '📱';
      case 'android':
        return '🤖';
      default:
        return '📟';
    }
  };

  const formatTimeSince = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
      padding: 'var(--space-md)',
    }}>
      <div style={{
        fontSize: 'var(--font-size-lg)',
        fontWeight: '600',
        marginBottom: 'var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
      }}>
        <span>📱 Connected Devices</span>
        {devices.length > 0 && (
          <span style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)',
            background: 'var(--bg-tertiary)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
          }}>
            {devices.length}
          </span>
        )}
      </div>

      {devices.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-lg)',
          color: 'var(--text-tertiary)',
        }}>
          <p style={{ fontSize: '32px', marginBottom: 'var(--space-sm)' }}>📭</p>
          <p>No devices connected</p>
          <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)' }}>
            Scan the QR code with your mobile device
          </p>
        </div>
      ) : (
        <>
          {/* Broadcast to All option */}
          <div
            onClick={() => onSelectDevice(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 'var(--space-sm)',
              marginBottom: 'var(--space-xs)',
              borderRadius: 'var(--radius-md)',
              border: '2px solid',
              borderColor: selectedDeviceId === null ? 'var(--accent)' : 'var(--border)',
              background: selectedDeviceId === null ? 'var(--accent-light)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-fast)',
            }}
            onMouseOver={(e) => {
              if (selectedDeviceId !== null) {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }
            }}
            onMouseOut={(e) => {
              if (selectedDeviceId !== null) {
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: selectedDeviceId === null ? 'var(--accent)' : 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              marginRight: 'var(--space-sm)',
            }}>
              📡
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: '600',
                color: selectedDeviceId === null ? 'var(--accent)' : 'var(--text-primary)',
              }}>
                Broadcast to All Devices
              </div>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--text-secondary)',
              }}>
                Send bundles to all {devices.length} connected device{devices.length > 1 ? 's' : ''}
              </div>
            </div>
            {selectedDeviceId === null && (
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}>
                ✓
              </div>
            )}
          </div>

          {/* Individual devices */}
          {devices.map((device) => (
            <div
              key={device.deviceId}
              onClick={() => onSelectDevice(device.deviceId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--space-sm)',
                marginBottom: 'var(--space-xs)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid',
                borderColor: selectedDeviceId === device.deviceId ? 'var(--accent)' : 'var(--border)',
                background: selectedDeviceId === device.deviceId ? 'var(--accent-light)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
              onMouseOver={(e) => {
                if (selectedDeviceId !== device.deviceId) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedDeviceId !== device.deviceId) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: selectedDeviceId === device.deviceId ? 'var(--accent)' : 'var(--bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                marginRight: 'var(--space-sm)',
              }}>
                {getPlatformIcon(device.deviceInfo?.platform || 'unknown')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: '600',
                  color: selectedDeviceId === device.deviceId ? 'var(--accent)' : 'var(--text-primary)',
                }}>
                  {device.deviceInfo?.name || 'Unknown Device'}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-secondary)',
                }}>
                  {device.deviceInfo?.model || 'Unknown Model'} • {device.deviceInfo?.platform || 'Unknown'} {device.deviceInfo?.osVersion || ''}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--text-tertiary)',
                  marginTop: '2px',
                }}>
                  Connected {formatTimeSince(device.connectedAt)}
                </div>
              </div>
              {selectedDeviceId === device.deviceId && (
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
