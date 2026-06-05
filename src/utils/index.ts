export const log = (...args: any[]) => {
  const isDevelopment = false; // import.meta.env.PROD
  if (isDevelopment) {
    console.info('[lib: Fluidity-js]', ...args);
  }
};
