export interface Node {
    type: number;
    [key: string]: any;
}
export declare const DOCUMENT_NODE = 0;
export declare const ELEMENT_NODE = 1;
export declare const TEXT_NODE = 2;
export declare const COMMENT_NODE = 3;
export declare const DOCTYPE_NODE = 4;
export declare function parse(input: string | ReturnType<typeof html>): any;
export interface Visitor {
    (node: Node, parent?: Node, index?: number): void | Promise<void>;
}
export declare function __unsafeHTML(str: string): {
    value: string;
};
export declare function attrs(attributes: Record<string, string>): {
    value: string;
};
export declare function html(tmpl: TemplateStringsArray, ...vals: any[]): {
    value: string;
};
export declare function walk(node: Node, callback: Visitor): Promise<void>;
export interface SanitizeOptions {
    /** An Array of strings indicating elements that the sanitizer should not remove. All elements not in the array will be dropped. */
    allowElements?: string[];
    /** An Array of strings indicating elements that the sanitizer should remove, but keeping their child elements. */
    blockElements?: string[];
    /** An Array of strings indicating elements (including nested elements) that the sanitizer should remove. */
    dropElements?: string[];
    /** An Object where each key is the attribute name and the value is an Array of allowed tag names. Matching attributes will not be removed. All attributes that are not in the array will be dropped. */
    allowAttributes?: Record<string, string[]>;
    /** An Object where each key is the attribute name and the value is an Array of dropped tag names. Matching attributes will be removed. */
    dropAttributes?: Record<string, string[]>;
    /** A Boolean value set to false (default) to remove components and their children. If set to true, components will be subject to built-in and custom configuration checks (and will be retained or dropped based on those checks). */
    allowComponents?: boolean;
    /** A Boolean value set to false (default) to remove custom elements and their children. If set to true, custom elements will be subject to built-in and custom configuration checks (and will be retained or dropped based on those checks). */
    allowCustomElements?: boolean;
    /** A Boolean value set to false (default) to remove HTML comments. Set to true in order to keep comments. */
    allowComments?: boolean;
}
export interface RenderOptions {
    sanitize?: SanitizeOptions | boolean;
    components?: {
        [tag: string]: string | ((attrs: Record<string, any>, children: ReturnType<typeof html>) => ReturnType<typeof html>);
    };
}
export declare function render(node: Node, opts?: RenderOptions): Promise<string>;
export declare function transform(input: string | ReturnType<typeof html>, opts?: RenderOptions): Promise<string>;