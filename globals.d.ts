declare module '*.json' {
  const json: any;
  /* tslint:disable */
  export default json;
  /* tslint:enable */
}

declare module 'web3-eth-abi' {
  export function encodeParameter(type: any, parameter: any): string;
  export function encodeParameters(typesArray: string[], parameters: any[]): string;
  export function encodeFunctionSignature(
    functionName: string | { name: string; type: string; inputs: any[] }
  ): string;
}
