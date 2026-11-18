import { mock } from "node:test";

if (process.env.NODE_ENV !== "test") throw new Error("The controlled clock is test-only.");
const realNow = Date.now;
const offset = 31 * 60 * 1000;
mock.timers.enable({ apis: ["Date"], now: realNow() + offset });
setInterval(() => mock.timers.setTime(realNow() + offset), 50).unref();
