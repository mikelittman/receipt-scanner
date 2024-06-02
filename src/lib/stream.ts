import { EOL } from "os";

// https://developer.mozilla.org/docs/Web/API/ReadableStream#convert_async_iterator_to_stream
export function iteratorToStream<T extends AsyncGenerator>(iterator: T) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();

      if (done) {
        controller.close();
      } else {
        controller.enqueue(Buffer.from(JSON.stringify(value) + EOL));
      }
    },
  });
}
