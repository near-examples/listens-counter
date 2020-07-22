// smart contract source code, written in AssemblyScript
// for more info: https://docs.near.org/docs/roles/developer/contracts/assemblyscript

import { storage } from "near-sdk-as";

export function trackListened(trackId: string): u64 {
  let storageKey = 'listen-count:' + trackId;
  let listenCount = storage.getPrimitive<u64>(storageKey, 0);
  listenCount++;
  storage.set(storageKey, listenCount);
  return listenCount;
}