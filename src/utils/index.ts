// @ts-expect-error
export const log: (...args: any[]) => void = import.meta.env.DEV
  ? (...args) => console.info('[lib: Fluidity-js]', ...args)
  : () => {};
