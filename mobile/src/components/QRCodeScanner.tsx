/**
 * QR Code Scanner Component
 *
 * Simplified scanner using react-native-qrcode-scanner
 */

import React from 'react';
import {StyleSheet, View, Text} from 'react';
import QRCodeScanner from 'react-native-qrcode-scanner';

interface Props {
  onScan: (data: string) => void;
}

export default function Scanner({onScan}: Props) {
  const handleScan = (e: any) => {
    if (e.data) {
      onScan(e.data);
    }
  };

  return (
    <View style={styles.container}>
      <QRCodeScanner
        onRead={handleScan}
        topContent={
          <Text style={styles.instruction}>
            Point your camera at the QR code
          </Text>
        }
        bottomContent={
          <Text style={styles.hint}>
            Open Apptuner on your computer to get started
          </Text>
        }
        cameraStyle={styles.camera}
        containerStyle={styles.scannerContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    height: 300,
    width: 300,
    borderRadius: 16,
    overflow: 'hidden',
  },
  instruction: {
    fontSize: 16,
    color: '#1d1d1f',
    textAlign: 'center',
    marginBottom: 24,
  },
  hint: {
    fontSize: 14,
    color: '#86868b',
    textAlign: 'center',
    marginTop: 24,
  },
});
