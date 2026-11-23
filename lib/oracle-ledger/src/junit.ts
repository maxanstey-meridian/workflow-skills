import { DOMParser } from "@xmldom/xmldom";
import { type RunColour } from "./schema.ts";

export type JUnitTestCase = {
  name: string;
  file?: string;
  colour: RunColour;
};

export const parseJUnitXml = (xmlContent: string): JUnitTestCase[] => {
  const cases: JUnitTestCase[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");
  const nodes = doc.getElementsByTagName("testcase");

  for (let i = 0; i < nodes.length; i += 1) {
    const tc = nodes.item(i);
    if (!tc) {
      continue;
    }
    const name = tc.getAttribute("name") ?? "";
    let fileAttr = tc.getAttribute("file") ?? "";
    if (fileAttr.length === 0) {
      let parent = tc.parentNode;
      while (parent !== null) {
        if (parent.nodeType === 1 && "getAttribute" in parent) {
          const getAttr = parent.getAttribute;
          if (typeof getAttr === "function") {
            const candidate = getAttr.call(parent, "file");
            if (typeof candidate === "string" && candidate.length > 0) {
              fileAttr = candidate;
              break;
            }
          }
        }
        parent = parent.parentNode;
      }
    }

    let colour: RunColour = "green";
    if (tc.getElementsByTagName("skipped").length > 0) {
      colour = "skipped";
    } else if (tc.getElementsByTagName("error").length > 0) {
      colour = "error";
    } else if (tc.getElementsByTagName("failure").length > 0) {
      colour = "red";
    }

    cases.push({
      name,
      ...(fileAttr.length > 0 ? { file: fileAttr } : {}),
      colour,
    });
  }

  return cases;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const containsToken = (haystack: string, needle: string): boolean => {
  if (needle.length === 0) {
    return false;
  }
  const pattern = new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(needle)}(?![A-Za-z0-9_-])`);
  return pattern.test(haystack);
};
