declare module "tls-sig-api-v2" {
  /**
   * Minimal typings for the `tls-sig-api-v2` package used to generate
   * Tencent RTC / Chat UserSig tokens on the server.
   */
  export class Api {
    constructor(sdkAppId: number, key: string);
    /** Generate a UserSig valid for `expire` seconds. */
    genSig(userId: string, expire: number): string;
    /** Generate a UserSig with an attached user buffer. */
    genSigWithUserBuf(userId: string, expire: number, userBuf: string): string;
  }
}
