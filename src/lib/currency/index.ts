import { parse } from "csv-parse";
import { createReadStream } from "fs";
import { delimiter, join } from "path";
import { z } from "zod";

const ConversionHistory = z.record(z.record(z.number()));
type ConversionHistory = z.infer<typeof ConversionHistory>;

const ParsedRow = z.array(z.string());

const HeaderRow = z.tuple([z.literal("Date")]).rest(z.string());
const RecordRow = z.tuple([z.coerce.date()]).rest(z.string());

async function cacheConversionHistory() {
  const records = createReadStream(
    join(__dirname, "eurofxref-hist.csv"),
    "utf8"
  ).pipe(parse());
  let headerSeen = false;
  let currencyCodes: string[] = [];
  for await (const unknownRecord of records) {
    const record = ParsedRow.parse(unknownRecord);
    if (!headerSeen) {
      const header = HeaderRow.parse(record);
      headerSeen = true;
      currencyCodes = header.slice(1);
      continue;
    }

    const [date, ...rates] = record;
  }
}

cacheConversionHistory();
