import { PaymentScreenshotField } from "@/components/marketing/payment-screenshot-field";

function DetailRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-ivory-100">{value}</span>
    </div>
  );
}

/**
 * Shared by /visit (meeting payment, ICICI) and /apply (membership payment,
 * a DIFFERENT IDFC FIRST account) — these are two genuinely separate bank
 * accounts, not the same details shown twice, per the user's real correction
 * (2026-09-09) after the two supplied QR images turned out to encode
 * different accounts. Never default one account's details onto the other's
 * QR — always pass the matching pair explicitly.
 */
export function BankPaymentDetails({
  qrCodeUrl,
  accountName,
  accountNumber,
  ifsc,
  swiftCode,
  upiId,
  bankName,
  screenshotFieldName,
}: {
  qrCodeUrl: string | null;
  accountName: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  swiftCode?: string | null;
  upiId: string | null;
  bankName: string | null;
  screenshotFieldName: string;
}) {
  return (
    <div className="rounded-sm border border-emerald-700 p-5">
      <p className="text-sm font-medium text-ivory-100">Payment</p>

      {qrCodeUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-managed WebsiteContent URL, not a next/image-managed asset */}
          <img src={qrCodeUrl} alt="Payment QR code" className="mt-3 h-40 w-40 rounded-md border border-emerald-600 bg-white object-contain p-2" />
          <p className="mt-3 text-sm text-slate-400">Scan the QR code and complete your payment.</p>
        </>
      ) : null}

      {accountName || accountNumber || ifsc || upiId || bankName ? (
        <div className="mt-4 flex flex-col gap-1.5 border-t border-emerald-800 pt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Or transfer directly
          </p>
          <DetailRow label="Account Name" value={accountName} />
          <DetailRow label="Account Number" value={accountNumber} />
          <DetailRow label="IFSC Code" value={ifsc} />
          {swiftCode ? <DetailRow label="SWIFT Code" value={swiftCode} /> : null}
          <DetailRow label="UPI ID" value={upiId} />
          <DetailRow label="Bank" value={bankName} />
        </div>
      ) : null}

      {!qrCodeUrl && !accountNumber ? (
        <p className="mt-3 text-sm text-slate-400">
          BWF will share payment details with you directly — you can also pay when you arrive.
        </p>
      ) : null}

      <div className="mt-4">
        <PaymentScreenshotField name={screenshotFieldName} />
      </div>
    </div>
  );
}
