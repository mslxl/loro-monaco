import { Awareness, PeerID } from "loro-crdt";

type PeerAwareness = {
  username: string;
  color: string;
  selection?: {
    anchor: Uint8Array; // Encoded Cursor
    head: Uint8Array; // Encoded Cursor
  };
};
export class MonacoAwareness extends Awareness<PeerAwareness> {
  constructor(peer: PeerID, timeout: number = 3000) {
    super(peer, timeout);
  }
}
