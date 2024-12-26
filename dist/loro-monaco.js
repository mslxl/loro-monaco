import { Cursor, Awareness } from 'loro-crdt';
import { Selection, SelectionDirection, Range } from 'monaco-editor/esm/vs/editor/editor.api';

class RelativeSelection {
    constructor(start, end, direction) {
        this.start = start;
        this.end = end;
        this.direction = direction;
    }
}
function createRelativeSelection(editor, monacoModel, text) {
    const sel = editor.getSelection();
    if (sel !== null) {
        const startPos = sel.getStartPosition();
        const endPos = sel.getEndPosition();
        const start = text.getCursor(monacoModel.getOffsetAt(startPos));
        const end = text.getCursor(monacoModel.getOffsetAt(endPos));
        return new RelativeSelection(start, end, sel.getDirection());
    }
    return null;
}
function createMonacoSelectFromRelativeSelection(editor, relSel, doc) {
    const start = doc.getCursorPos(relSel.start);
    const end = doc.getCursorPos(relSel.end);
    // TODO: here is missing the comparison of the `type` of the `start` and `end`
    // which was used in the y-js original implementation, which need to be checked in future
    if (start !== null && end !== null) {
        const model = editor.getModel();
        const startPos = model.getPositionAt(start.offset);
        const endPos = model.getPositionAt(end.offset);
        return Selection.createWithDirection(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column, relSel.direction);
    }
    return null;
}
class MonacoBinding {
    constructor(doc, text, monacoModel, editors = new Set(), awareness = null) {
        this.doc = doc;
        this.text = text;
        this.monacoModel = monacoModel;
        this.editors = editors;
        this.awareness = awareness;
        this.savedSelections = new Map();
        this.decorations = new Map();
        // Add a flag to prevent recursive updates
        let isApplyingRemoteChanges = false;
        this.textHandler = this.text.subscribe((eventBatch) => {
            if (eventBatch.by === "local")
                return;
            // Set flag before applying remote changes
            isApplyingRemoteChanges = true;
            try {
                eventBatch.events.forEach((event) => {
                    let index = 0;
                    const diff = event.diff;
                    diff.diff.forEach((op) => {
                        if (op.retain !== undefined) {
                            index += op.retain;
                        }
                        else if (op.insert !== undefined) {
                            const pos = monacoModel.getPositionAt(index);
                            const range = new Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column);
                            const insert = op.insert;
                            monacoModel.applyEdits([{ range, text: insert }]);
                        }
                        else if (op.delete !== undefined) {
                            const pos = monacoModel.getPositionAt(index);
                            const endPos = monacoModel.getPositionAt(index + op.delete);
                            const range = new Selection(pos.lineNumber, pos.column, endPos.lineNumber, endPos.column);
                            monacoModel.applyEdits([{ range, text: "" }]);
                        }
                        else {
                            throw new Error("Invalid operation");
                        }
                    });
                });
            }
            finally {
                // Always reset flag after applying changes
                isApplyingRemoteChanges = false;
            }
            this.savedSelections.forEach((rsel, editor) => {
                const sel = createMonacoSelectFromRelativeSelection(editor, rsel, this.doc);
                if (sel !== null) {
                    editor.setSelection(sel);
                }
            });
            this.rerenderDecorations();
        });
        const textValue = text.toString();
        if (monacoModel.getValue() !== textValue) {
            monacoModel.setValue(textValue);
        }
        this.monacoChangeHandler = monacoModel.onDidChangeContent((event) => {
            // Skip if changes are from remote updates
            if (isApplyingRemoteChanges)
                return;
            this.beforeTransaction();
            event.changes
                .sort((change1, change2) => change2.rangeOffset - change1.rangeOffset)
                .forEach((change) => {
                text.delete(change.rangeOffset, change.rangeLength);
                text.insert(change.rangeOffset, change.text);
            });
            this.doc.commit();
        });
        this.monacoDisposeHandler = monacoModel.onWillDispose(() => {
            this.destroy();
        });
        this.rerenderDecorationsObserver = () => {
            this.rerenderDecorations();
        };
        if (awareness) {
            editors.forEach((editor) => {
                editor.onDidChangeCursorSelection(() => {
                    const sel = editor.getSelection();
                    if (sel === null) {
                        return;
                    }
                    let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
                    let head = monacoModel.getOffsetAt(sel.getEndPosition());
                    if (sel.getDirection() === SelectionDirection.RTL) {
                        const temp = anchor;
                        anchor = head;
                        head = temp;
                    }
                    const preAwareness = awareness.getLocalState();
                    awareness.setLocalState({
                        ...preAwareness,
                        selection: {
                            anchor: this.text.getCursor(anchor).encode(),
                            head: this.text.getCursor(head).encode(),
                        },
                    });
                });
                awareness.addListener(this.rerenderDecorationsObserver);
            });
        }
    }
    rerenderDecorations() {
        this.editors.forEach((editor) => {
            if (this.awareness && editor.getModel() === this.monacoModel) {
                const currentDecoration = this.decorations.get(editor) || [];
                const newDecorations = [];
                Object.entries(this.awareness.getAllStates()).forEach(([id, state]) => {
                    if (this.doc.peerIdStr !== id &&
                        state.selection != null &&
                        state.selection.anchor != null &&
                        state.selection.head != null) {
                        const anchorAbs = this.doc.getCursorPos(Cursor.decode(state.selection.anchor));
                        const headAbs = this.doc.getCursorPos(Cursor.decode(state.selection.head));
                        let start, end, afterContentClassName, beforeContentClassName;
                        if (anchorAbs.offset < headAbs.offset) {
                            start = this.monacoModel.getPositionAt(anchorAbs.offset);
                            end = this.monacoModel.getPositionAt(headAbs.offset);
                            afterContentClassName = `loroRemoteSelectionHead loroRemoteSelectionHead-${id}`;
                            beforeContentClassName = null;
                        }
                        else {
                            start = this.monacoModel.getPositionAt(headAbs.offset);
                            end = this.monacoModel.getPositionAt(anchorAbs.offset);
                            afterContentClassName = null;
                            beforeContentClassName = `loroRemoteSelectionHead loroRemoteSelectionHead-${id}`;
                        }
                        newDecorations.push({
                            range: new Range(start.lineNumber, start.column, end.lineNumber, end.column),
                            options: {
                                className: `loroRemoteSelection loroRemoteSelection-${id}`,
                                afterContentClassName,
                                beforeContentClassName,
                            },
                        });
                    }
                });
                //TODO
                console.log(currentDecoration, newDecorations);
                this.decorations.set(editor, editor.deltaDecorations(currentDecoration, newDecorations));
            }
            else {
                this.decorations.delete(editor);
            }
        });
    }
    beforeTransaction() {
        this.savedSelections = new Map();
        this.editors.forEach((editor) => {
            if (editor.getModel() === this.monacoModel) {
                const rsel = createRelativeSelection(editor, this.monacoModel, this.text);
                if (rsel !== null) {
                    this.savedSelections.set(editor, rsel);
                }
            }
        });
    }
    destroy() {
        this.monacoChangeHandler.dispose();
        this.monacoDisposeHandler.dispose();
        this.textHandler();
        this.awareness?.removeListener(this.rerenderDecorationsObserver);
    }
}

class MonacoAwareness extends Awareness {
    constructor(peer, timeout = 3000) {
        super(peer, timeout);
    }
}

export { MonacoAwareness, MonacoBinding };
//# sourceMappingURL=loro-monaco.js.map
