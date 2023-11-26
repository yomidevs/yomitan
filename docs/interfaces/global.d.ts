declare global {
    interface Window { googleDocsAccessibilitySetup: boolean; _docs_annotate_canvas_by_ext: string; }
    interface Error {
        // various files
        data: any;

        // popup.js
        source: any;

        // json-schema.js
        value: any;
        schema: any;
        valueStack: any;
        schemaStack: any;
    }
    interface Element { dataset: any; }
    interface ExtendedPromise<T> extends Promise<T> { resolve: (value?: T | PromiseLike<T>) => void; reject: (reason?: any) => void; }
    interface EventTarget { error: any; }
    interface Navigator {
        msSaveBlob?: (blob: any, defaultName?: string) => boolean
    }
    interface Element {
        // info-main.js
        hasError: string;
    }
}
export { };
