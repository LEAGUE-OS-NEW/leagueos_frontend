export interface DocumentVerificationResult {
  nameMatches: boolean;
  idNumberMatches: boolean;
}

interface VerifyDocumentParams {
  idFront: File;
  idBack: File | null;
  expectedFullName: string;
  expectedIdNumber: string;
}

// TODO: replace this stub with a real call to a KYC/OCR provider (e.g. Smile
// Identity, Onfido, Veriff) that extracts the name and ID number printed on
// idFront/idBack and compares them to expectedFullName/expectedIdNumber.
// There is no client-side way to read text off an ID photo — this has to
// run on a backend that can OCR the uploaded file. Until that's wired up,
// this always reports a match so the rest of the flow is testable.
//
// The params are intentionally unused right now — they'll be read once this
// function actually calls out to a provider. TypeScript's noUnusedParameters
// automatically ignores leading-underscore identifiers, hence `_params`
// below; this project's ESLint config does not have the equivalent
// argsIgnorePattern configured, so the rule is disabled explicitly too.
export async function verifyIdentityDocument(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: VerifyDocumentParams,
): Promise<DocumentVerificationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    nameMatches: true,
    idNumberMatches: true,
  };
}