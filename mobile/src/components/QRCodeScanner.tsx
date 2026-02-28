/**
 * QR Code Scanner Component
 *
 * Uses react-native-camera-kit for QR scanning (RN 0.73+ compatible)
 */

import React, {useState} from 'react';
import {StyleSheet, View, Dimensions} from 'react-native';
import {Camera, CameraType} from 'react-native-camera-kit';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAMERA_SIZE = Math.min(320, SCREEN_WIDTH - 48);

interface Props {
  onScan: (data: string) => void;
}

export default function Scanner({onScan}: Props) {
  const [scanned, setScanned] = useState(false);

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        cameraType={CameraType.Back}
        scanBarcode={true}
        onReadCode={(event: any) => {
          if (!scanned) {
            setScanned(true);
            onScan(event.nativeEvent.codeStringValue);
          }
        }}
        showFrame={false}
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
