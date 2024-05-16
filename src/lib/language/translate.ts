import {
  TranslateClient,
  TranslateTextCommand,
  TranslateTextRequest,
} from "@aws-sdk/client-translate";

export function getTranslateClient(): TranslateClient {
  return new TranslateClient({});
}

export async function translateText(client: TranslateClient, text: string) {
  const input: TranslateTextRequest = {
    SourceLanguageCode: "auto",
    TargetLanguageCode: "en",
    Text: text,
  };
  const response = await client.send(new TranslateTextCommand(input));
  const translated = response.TranslatedText ?? text;
  return {
    sourceLanguage: response.SourceLanguageCode ?? "unknown",
    targetLanguage: response.TargetLanguageCode ?? "en",
    translated,
  };
}
