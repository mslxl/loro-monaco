import { Awareness, PeerID, LoroDoc, LoroText, Subscription } from 'loro-crdt';
import { editor, IDisposable } from 'monaco-editor/esm/vs/editor/editor.api';

type PeerAwareness = {
    username: string;
    color: string;
    selection?: {
        anchor: Uint8Array;
        head: Uint8Array;
    };
};
declare class MonacoAwareness extends Awareness<PeerAwareness> {
    constructor(peer: PeerID, timeout?: number);
}

declare class MonacoBinding {
    doc: LoroDoc;
    text: LoroText;
    monacoModel: editor.ITextModel;
    editors: Set<editor.IStandaloneCodeEditor>;
    awareness: MonacoAwareness | null;
    private savedSelections;
    private decorations;
    monacoChangeHandler: IDisposable;
    monacoDisposeHandler: IDisposable;
    textHandler: Subscription;
    rerenderDecorationsObserver: () => void;
    constructor(doc: LoroDoc, text: LoroText, monacoModel: editor.ITextModel, editors?: Set<editor.IStandaloneCodeEditor>, awareness?: MonacoAwareness | null);
    private rerenderDecorations;
    private beforeTransaction;
    destroy(): void;
}

export { MonacoAwareness, MonacoBinding };
