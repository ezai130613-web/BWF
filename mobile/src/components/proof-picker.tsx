import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Notice, styles as ui } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { pickImage, pickPdf, uploadPaymentProof, type PickedFile } from '@/lib/upload';
import { colors, space } from '@/theme';

/** "Upload payment proof" — screenshot or PDF; reports the uploaded URL back. */
export function ProofPicker({ value, onUploaded }: { value: string | null; onUploaded: (url: string | null) => void }) {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(picker: () => Promise<PickedFile | null>) {
    setError(null);
    const picked = await picker();
    if (!picked) return;
    setBusy(true);
    onUploaded(null);
    try {
      const url = await uploadPaymentProof(picked);
      setFile(picked);
      onUploaded(url);
    } catch (e) {
      setFile(null);
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={ui.label}>Payment proof (screenshot or PDF receipt)</Text>
      {error ? <Notice tone="danger" message={error} /> : null}
      {value && file ? <Notice tone="success" message={`Uploaded: ${file.name}`} /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button label={busy ? 'Uploading…' : 'Screenshot'} icon="image-outline" variant="secondary" loading={busy} onPress={() => choose(pickImage)} style={{ flex: 1 }} />
        <Button label="PDF" icon="document-outline" variant="secondary" disabled={busy} onPress={() => choose(pickPdf)} style={{ flex: 1 }} />
      </View>
      <Text style={[ui.hint, { color: colors.textMuted }]}>Max 10 MB. BWF checks the proof before the payment counts.</Text>
    </View>
  );
}
