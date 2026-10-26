import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Notice, Screen } from '@/components/ui';
import { checkinTokenFrom } from '@/lib/checkin';
import { colors, radius, space } from '@/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  if (!permission) return <Screen loading />;

  if (!permission.granted) {
    return (
      <Screen>
        <Card>
          <Body>To check in, the app needs your camera to scan the meeting QR code shown at the venue.</Body>
          <Button label={permission.canAskAgain ? 'Allow camera' : 'Camera access is off — enable it in Settings'} onPress={requestPermission} disabled={!permission.canAskAgain} style={{ marginTop: space.lg }} />
        </Card>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const token = checkinTokenFrom(data);
          if (!token) {
            setError("That isn't a BWF meeting check-in QR code.");
            return;
          }
          handled.current = true;
          router.replace({ pathname: '/checkin/[token]', params: { token } });
        }}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Point at the meeting check-in QR code</Text>
      </View>
      {error ? (
        <View style={styles.error}>
          <Notice tone="danger" message={error} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: radius.xl, borderWidth: 3, borderColor: colors.gold },
  hint: { color: '#fff', marginTop: space.lg, fontSize: 15, fontWeight: '600' },
  error: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.xxl },
});
