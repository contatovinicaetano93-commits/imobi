/** URL exibível no browser (proxy web ou S3 absoluto). */
export function resolveKycDocumentUrl(doc: { kycDocumentoId: string; url: string }): string {
  if (doc.url.startsWith("http://") || doc.url.startsWith("https://")) {
    return doc.url;
  }
  if (doc.url.includes("/arquivo")) {
    return `/api/proxy/kyc/documentos/${doc.kycDocumentoId}/arquivo`;
  }
  return doc.url;
}
