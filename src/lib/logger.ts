import pino from "pino";

const logger = pino({
  level: "trace",
});

export { logger };
