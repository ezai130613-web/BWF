import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { UploadTicket } from '@contract';
import { api, ApiError } from '@/lib/api';

export type PickedFile = { uri: string; name: string; mimeType: string; size: number };

/** A photo/screenshot from the library. */
export async function pickImage(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  const mimeType = a.mimeType ?? 'image/jpeg';
  return { uri: a.uri, name: a.fileName ?? `proof.${mimeType.split('/')[1] ?? 'jpg'}`, mimeType, size: a.fileSize ?? 0 };
}

/** A PDF receipt. */
export async function pickPdf(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf', size: a.size ?? 0 };
}

/**
 * Uploads a payment proof: the server checks type/size and signs a
 * short-lived URL, the file goes straight to storage, and the returned
 * publicUrl is what gets submitted as proofUrl.
 */
export async function uploadPaymentProof(file: PickedFile): Promise<string> {
  const blob = await (await fetch(file.uri)).blob();
  const ticket = await api.post<UploadTicket>('/uploads/payment-proof', {
    filename: file.name,
    contentType: file.mimeType,
    size: file.size || blob.size,
  });
  let res: Response;
  try {
    res = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.mimeType }, body: blob });
  } catch {
    throw new ApiError(0, 'NETWORK', "The upload didn't go through. Check your connection and try again.");
  }
  if (!res.ok) throw new ApiError(res.status, 'UPLOAD_FAILED', "The upload didn't go through. Please try again.");
  return ticket.publicUrl;
}
