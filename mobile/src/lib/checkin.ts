/** The member check-in QR encodes <site>/member/checkin/<token>; anything else isn't ours. */
export function checkinTokenFrom(data: string): string | null {
  const match = /\/member\/checkin\/([A-Za-z0-9_-]{8,128})(?:[/?#]|$)/.exec(data.trim());
  return match?.[1] ?? null;
}
