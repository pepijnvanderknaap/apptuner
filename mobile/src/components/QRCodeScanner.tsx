/**
 * QR Code Scanner Component
 *
 * Uses react-native-camera directly for QR scanning
 */

import React, {useState} from 'react';
import {StyleSheet, View, Dimensions} from 'react-native';
import {RNCamera} from 'react-native-camera';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAMERA_SIZE = Math.min(320, SCREEN_WIDTH - 48);

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
      <RNCamera
        style={styles.camera}
        type={RNCamera.Constants.Type.back}
        onBarCodeRead={handleBarCodeRead}
        barCodeTypes={[RNCamera.Constants.BarCodeType.qr]}
        captureAudio={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    height: CAMERA_SIZE,
    width: CAMERA_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
