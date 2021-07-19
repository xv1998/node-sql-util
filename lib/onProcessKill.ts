export default function onProcessKill(cb: () => void) {
  process.on("exit", cb);

  //catches ctrl+c event
  process.on("SIGINT", cb);

  // catches "kill pid" (for example: nodemon restart)
  process.on("SIGUSR1", cb);
  process.on("SIGUSR2", cb);
  process.on("SIGTERM", cb);
}
