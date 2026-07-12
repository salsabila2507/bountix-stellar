import { Api } from "tls-sig-api-v2";

const SDKAPPID = 331419296728;
const SECRETKEY = "b1f331419296728b5781b9f3468b1f4d813150377e4574516c1ef60e274fe150";
const EXPIRE = 86400 * 180;

const api = new Api(SDKAPPID, SECRETKEY);

export function generateUserSig(userId: string): string {
  return api.genSig(userId, EXPIRE);
}
