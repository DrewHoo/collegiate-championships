// wrangler's Data rule (wrangler.jsonc) hands a .woff import over as an ArrayBuffer.
declare module '*.woff' {
  const data: ArrayBuffer;
  export default data;
}
