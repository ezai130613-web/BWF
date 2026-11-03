-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "financialYear" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taxableInr" DECIMAL(10,2) NOT NULL,
    "gstInr" DECIMAL(10,2) NOT NULL,
    "totalInr" DECIMAL(10,2) NOT NULL,
    "gstPercent" INTEGER NOT NULL DEFAULT 18,
    "sentAt" TIMESTAMP(3),
    "sentTo" TEXT,
    "sendCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "financialYear" TEXT NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("financialYear")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_paymentId_key" ON "invoices"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_financialYear_sequence_key" ON "invoices"("financialYear", "sequence");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invoice letterhead, editable in Website Content → Invoice (blank = left off the invoice).
INSERT INTO "website_content" ("key", "label", "section", "value", "updatedAt") VALUES
  ('invoice.businessName', 'Business name on invoices', 'Invoice', 'Builders World Forum', CURRENT_TIMESTAMP),
  ('invoice.address', 'Business address on invoices', 'Invoice', NULL, CURRENT_TIMESTAMP),
  ('invoice.gstin', 'GSTIN (shown on invoices; when set the invoice is titled "Tax Invoice")', 'Invoice', NULL, CURRENT_TIMESTAMP),
  ('invoice.contact', 'Contact line on invoices (phone / email)', 'Invoice', NULL, CURRENT_TIMESTAMP),
  ('invoice.footerNote', 'Note at the bottom of invoices', 'Invoice', 'Thank you for your payment. This is a computer-generated invoice and needs no signature.', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
