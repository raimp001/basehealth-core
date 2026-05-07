// Ambient module declarations for modules without bundled types.
// This file MUST NOT have any imports/exports — it must remain a script
// (not a module) for `declare module "..."` to work globally.

declare module "bs58";
declare module "@rainbow-me/rainbowkit/styles.css";
declare module "@modelcontextprotocol/sdk";

interface Window {
  ethereum?: any;
  google?: any;
}
