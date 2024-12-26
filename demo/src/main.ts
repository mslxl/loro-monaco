import "./cursor.css"
import { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import {LoroDoc, LoroText} from 'loro-crdt'
import {MonacoAwareness, MonacoBinding} from 'loro-monaco'
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";


self.MonacoEnvironment = {
  getWorker(_, label) {
    return new editorWorker()
  },
};

const divA = document.getElementById('editorA')!
const divB = document.getElementById('editorB')!

const editorA = editor.create(divA, {
    theme: 'vs',
    language: 'javascript',
    automaticLayout: true,
})
const editorB = editor.create(divB, {
    theme: 'vs',
    language: 'javascript',
    automaticLayout: true,
})

const docA = new LoroDoc()
const docB = new LoroDoc()
const textA = docA.getText("code")
const textB = docB.getText("code")
const awarenessA = new MonacoAwareness(docA.peerIdStr)
const awarenessB = new MonacoAwareness(docB.peerIdStr)

docA.subscribe((event)=>{
    if(event.by == 'local') {
        docB.import(
            docA.export({
                mode: 'update',
                from: docB.oplogVersion()
            })
        )
    }
})

docB.subscribe((event)=>{
    if(event.by == 'local') {
        docA.import(
            docB.export({
                mode: 'update',
                from: docA.oplogVersion()
            })
        )
    }
})

awarenessA.addListener((_state, origin) => {
      if (origin === "local") {
        awarenessB.apply(
          awarenessA.encode([docA.peerIdStr]),
        );
      }
    });
awarenessB.addListener((_state, origin) => {
    if (origin === "local") {
        awarenessA.apply(
            awarenessB.encode([docB.peerIdStr]),
        );
    }
});

const bindingA = new MonacoBinding(docA, textA, editorA.getModel()!, new Set([editorA]), awarenessA)
const bindingB = new MonacoBinding(docB, textB, editorB.getModel()!, new Set([editorB]), awarenessB)


