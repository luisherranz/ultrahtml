"use strict";
export const DOCUMENT_NODE = 0;
export const ELEMENT_NODE = 1;
export const TEXT_NODE = 2;
export const COMMENT_NODE = 3;
export const DOCTYPE_NODE = 4;
const VOID_TAGS = { img: 1, br: 1, hr: 1, meta: 1, link: 1, base: 1, input: 1 };
const SPLIT_ATTRS_RE = /([\@\.a-z0-9_\:\-]*)\s*?=?\s*?(['"]?)(.*?)\2\s+/gim;
const DOM_PARSER_RE = /(?:<(\/?)([a-zA-Z][a-zA-Z0-9\:-]*)(?:\s([^>]*?))?((?:\s*\/)?)>|(<\!\-\-)([\s\S]*?)(\-\->)|(<\!)([\s\S]*?)(>))/gm;
function splitAttrs(str) {
  let obj = {};
  let token;
  if (str) {
    SPLIT_ATTRS_RE.lastIndex = 0;
    str = " " + (str || "") + " ";
    while (token = SPLIT_ATTRS_RE.exec(str)) {
      if (token[0] === " ")
        continue;
      obj[token[1]] = token[3];
    }
  }
  return obj;
}
export function parse(input) {
  let str = typeof input === "string" ? input : input.value;
  let doc, parent, token, text, i, bStart, bText, bEnd, tag;
  const tags = [];
  DOM_PARSER_RE.lastIndex = 0;
  parent = doc = {
    type: DOCUMENT_NODE,
    children: []
  };
  let lastIndex = 0;
  function commitTextNode() {
    text = str.substring(lastIndex, DOM_PARSER_RE.lastIndex - token[0].length);
    if (text) {
      parent.children.push({
        type: TEXT_NODE,
        value: text,
        parent
      });
    }
  }
  while (token = DOM_PARSER_RE.exec(str)) {
    bStart = token[5] || token[8];
    bText = token[6] || token[9];
    bEnd = token[7] || token[10];
    if (bStart === "<!--") {
      i = DOM_PARSER_RE.lastIndex - token[0].length;
      tag = {
        type: COMMENT_NODE,
        value: bText,
        parent,
        loc: [
          {
            start: i,
            end: i + bStart.length
          },
          {
            start: DOM_PARSER_RE.lastIndex - bEnd.length,
            end: DOM_PARSER_RE.lastIndex
          }
        ]
      };
      tags.push(tag);
      tag.parent.children.push(tag);
    } else if (bStart === "<!") {
      i = DOM_PARSER_RE.lastIndex - token[0].length;
      tag = {
        type: DOCTYPE_NODE,
        value: bText,
        parent,
        loc: [
          {
            start: i,
            end: i + bStart.length
          },
          {
            start: DOM_PARSER_RE.lastIndex - bEnd.length,
            end: DOM_PARSER_RE.lastIndex
          }
        ]
      };
      tags.push(tag);
      tag.parent.children.push(tag);
    } else if (token[1] !== "/") {
      commitTextNode();
      tag = {
        type: ELEMENT_NODE,
        name: token[2] + "",
        attributes: splitAttrs(token[3]),
        parent,
        children: [],
        loc: [
          {
            start: DOM_PARSER_RE.lastIndex - token[0].length,
            end: DOM_PARSER_RE.lastIndex
          }
        ]
      };
      tags.push(tag);
      tag.parent.children.push(tag);
      if (token[4] && token[4].indexOf("/") > -1 || VOID_TAGS.hasOwnProperty(tag.name)) {
        tag.loc[1] = tag.loc[0];
        tag.isSelfClosingTag = true;
      } else {
        parent = tag;
      }
    } else {
      commitTextNode();
      if (token[2] + "" === parent.name) {
        tag = parent;
        parent = tag.parent;
        tag.loc.push({
          start: DOM_PARSER_RE.lastIndex - token[0].length,
          end: DOM_PARSER_RE.lastIndex
        });
        text = str.substring(tag.loc[0].end, tag.loc[1].start);
        if (tag.children.length === 0) {
          tag.children.push({
            type: TEXT_NODE,
            value: text,
            parent
          });
        }
      } else if (token[2] + "" === tags[tags.length - 1].name && tags[tags.length - 1].isSelfClosingTag === true) {
        tag = tags[tags.length - 1];
        tag.loc.push({
          start: DOM_PARSER_RE.lastIndex - token[0].length,
          end: DOM_PARSER_RE.lastIndex
        });
      }
    }
    lastIndex = DOM_PARSER_RE.lastIndex;
  }
  text = str.slice(lastIndex);
  parent.children.push({
    type: TEXT_NODE,
    value: text,
    parent
  });
  return doc;
}
class Walker {
  constructor(callback) {
    this.callback = callback;
  }
  async visit(node, parent, index) {
    await this.callback(node, parent, index);
    if (Array.isArray(node.children)) {
      let promises = [];
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        promises.push(this.visit(child, node, i));
      }
      await Promise.all(promises);
    }
  }
}
const HTMLString = Symbol("HTMLString");
const AttrString = Symbol("AttrString");
function mark(str, tags = [HTMLString]) {
  const v = { value: str };
  for (const tag of tags) {
    Object.defineProperty(v, tag, {
      value: true,
      enumerable: false,
      writable: false
    });
  }
  return v;
}
export function __unsafeHTML(str) {
  return mark(str);
}
const ESCAPE_CHARS = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escapeHTML(str) {
  return str.replace(/[&<>]/g, (c) => ESCAPE_CHARS[c] || c);
}
export function attrs(attributes) {
  let attrStr = "";
  for (const [key, value] of Object.entries(attributes)) {
    attrStr += ` ${key}="${value}"`;
  }
  return mark(attrStr, [HTMLString, AttrString]);
}
export function html(tmpl, ...vals) {
  let buf = "";
  for (let i = 0; i < tmpl.length; i++) {
    buf += tmpl[i];
    const expr = vals[i];
    if (buf.endsWith("...") && expr && typeof expr === "object") {
      buf = buf.slice(0, -3).trimEnd();
      buf += attrs(expr).value;
    } else if (expr && expr[AttrString]) {
      buf = buf.trimEnd();
      buf += expr.value;
    } else if (expr && expr[HTMLString]) {
      buf += expr.value;
    } else if (typeof expr === "string") {
      buf += escapeHTML(expr);
    } else if (expr || expr === 0) {
      buf += String(expr);
    }
  }
  return mark(buf);
}
export function walk(node, callback) {
  const walker = new Walker(callback);
  return walker.visit(node);
}
function resolveSantizeOptions({
  components = {},
  sanitize = true
}) {
  var _a;
  if (sanitize === true) {
    return {
      allowElements: Object.keys(components),
      dropElements: ["script"],
      allowComponents: false,
      allowCustomElements: false,
      allowComments: false
    };
  } else if (sanitize === false) {
    return {
      dropElements: [],
      allowComponents: true,
      allowCustomElements: true,
      allowComments: true
    };
  } else {
    const dropElements = /* @__PURE__ */ new Set([]);
    if (!((_a = sanitize.allowElements) == null ? void 0 : _a.includes("script"))) {
      dropElements.add("script");
    }
    for (const dropElement of sanitize.dropElements ?? []) {
      dropElements.add(dropElement);
    }
    return {
      allowComponents: false,
      allowCustomElements: false,
      allowComments: false,
      ...sanitize,
      allowElements: [
        ...Object.keys(components),
        ...sanitize.allowElements ?? []
      ],
      dropElements: Array.from(dropElements)
    };
  }
}
function getNodeType(node) {
  if (node.name.includes("-"))
    return "custom-element";
  if (/[\_\$A-Z]/.test(node.name[0]) || node.name.includes("."))
    return "component";
  return "element";
}
function getAction(name, type, sanitize) {
  var _a, _b, _c;
  if (((_a = sanitize.allowElements) == null ? void 0 : _a.length) > 0) {
    if (sanitize.allowElements.includes(name))
      return "allow";
  }
  if (((_b = sanitize.blockElements) == null ? void 0 : _b.length) > 0) {
    if (sanitize.blockElements.includes(name))
      return "block";
  }
  if (((_c = sanitize.dropElements) == null ? void 0 : _c.length) > 0) {
    if (sanitize.dropElements.find((n) => n === name))
      return "drop";
  }
  if (type === "component" && !sanitize.allowComponents)
    return "drop";
  if (type === "custom-element" && !sanitize.allowCustomElements)
    return "drop";
  return "allow";
}
function sanitizeAttributes(node, sanitize) {
  var _a, _b, _c, _d, _e, _f;
  const attrs2 = node.attributes;
  for (const key of Object.keys(node.attributes)) {
    if (((_a = sanitize.allowAttributes) == null ? void 0 : _a[key]) && ((_b = sanitize.allowAttributes) == null ? void 0 : _b[key].includes(node.name)) || ((_c = sanitize.allowAttributes) == null ? void 0 : _c[key].includes("*"))) {
      continue;
    }
    if (((_d = sanitize.dropAttributes) == null ? void 0 : _d[key]) && ((_e = sanitize.dropAttributes) == null ? void 0 : _e[key].includes(node.name)) || ((_f = sanitize.dropAttributes) == null ? void 0 : _f[key].includes("*"))) {
      delete attrs2[key];
    }
  }
  return attrs2;
}
async function renderElement(node, opts) {
  const type = getNodeType(node);
  const { name } = node;
  const action = getAction(
    name,
    type,
    opts.sanitize
  );
  if (action === "drop")
    return "";
  if (action === "block")
    return await Promise.all(
      node.children.map((child) => render(child, opts))
    ).then((res) => res.join(""));
  const component = opts.components[node.name];
  if (typeof component === "string")
    return renderElement({ ...node, name: component }, opts);
  const attributes = sanitizeAttributes(
    node,
    opts.sanitize
  );
  if (typeof component === "function") {
    const value = await component(
      attributes,
      mark(
        await Promise.all(
          node.children.map((child) => render(child, opts))
        ).then((res) => res.join(""))
      )
    );
    if (value && value[HTMLString])
      return value.value;
    return escapeHTML(String(value));
  }
  if (VOID_TAGS.hasOwnProperty(name)) {
    return `<${node.name}${attrs(attributes).value}>`;
  }
  return `<${node.name}${attrs(attributes).value}>${await Promise.all(
    node.children.map((child) => render(child, opts))
  ).then((res) => res.join(""))}</${node.name}>`;
}
export async function render(node, opts = {}) {
  const sanitize = resolveSantizeOptions(opts);
  switch (node.type) {
    case DOCUMENT_NODE: {
      return Promise.all(
        node.children.map((child) => render(child, opts))
      ).then((res) => res.join(""));
    }
    case ELEMENT_NODE:
      return renderElement(node, {
        components: opts.components ?? {},
        sanitize
      });
    case TEXT_NODE: {
      return `${node.value}`;
    }
    case COMMENT_NODE: {
      if (sanitize.allowComments) {
        return `<!--${node.value}-->`;
      } else {
        return "";
      }
    }
    case DOCTYPE_NODE: {
      return `<!${node.value}>`;
    }
  }
  return "";
}
export async function transform(input, opts = {}) {
  return render(parse(input), opts);
}
