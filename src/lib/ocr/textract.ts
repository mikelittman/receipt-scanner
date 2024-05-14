import {
  type AnalyzeDocumentRequest,
  TextractClient,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";

export function getTextractClient(): TextractClient {
  return new TextractClient({});
}

export async function analyzeDocument(
  client: TextractClient,
  document: Buffer
) {
  const input: AnalyzeDocumentRequest = {
    Document: {
      Bytes: document,
    },
    FeatureTypes: ["TABLES", "FORMS"],
  };
  return client.send(new AnalyzeDocumentCommand(input));
}
