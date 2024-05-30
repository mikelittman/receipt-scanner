import { ObjectId } from "mongodb";

function isPrimitiveType(item: unknown): boolean {
  return (
    ["string", "number", "boolean"].includes(typeof item) ||
    item instanceof Date
  );
}

export function flatJson<T>(src: T, depth = 0): string {
  if (src === null) return "null";

  const pad = "\t".repeat(depth);

  if (src instanceof ObjectId) {
    return src.toHexString();
  }

  if (Array.isArray(src)) {
    return (
      pad +
      src
        .map((x, i) =>
          [i > 0 ? pad : "", i, " ", flatJson(x, depth + 1)].join("")
        )
        .join("\n")
    );
  }

  if (src instanceof Date) {
    return src.toISOString();
  }

  switch (typeof src) {
    case "object":
      return Object.entries(src)
        .map(([key, value]) => [
          key,
          isPrimitiveType(value) ? "=" : "\n",
          flatJson(value, depth + 1),
        ])
        .map((args, i) => [i > 0 ? pad : "", ...args].join(""))
        .join("\n");

    case "string":
    case "number":
    case "boolean":
    default:
      return `${src}`;
  }
}
