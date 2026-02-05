/**
 * QR Code Scanner Component
 *
 * Uses react-native-camera directly for QR scanning
 */

import React, {useState} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {RNCamera} from 'react-native-camera';

interface Props {
  onScan: (data: string) => void;
}

export default function Scanner({onScan}: Props) {
  const [scanned, setScanned] = useState(false);

  const handleBarCodeRead = (event: any) => {
    if (!scanned && event.data) {
      setScanned(true);
      onScan(event.data);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Point your camera at the QR code
      </Text>
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        onBarCodeRead={handleBarCodeRead}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        captureAudio={false}
      />
      <Text style={styles.hint}>
        Open Apptuner on your computer to get started
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
  },
  camera: {
    height: 400,
    width: 400,
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
