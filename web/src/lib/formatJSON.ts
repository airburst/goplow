import DOMPurify from "dompurify";
import { prettyPrintJson } from "pretty-print-json";

export function formatJSON(data: string | object): string {
  let parsedData = data;

  // If data is a string, parse it as JSON
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch {
      // If parsing fails, just use the string as-is
      parsedData = data;
    }
  }

  // Get HTML with syntax highlighting from pretty-print-json
  let html = prettyPrintJson.toHtml(parsedData);

  // Convert HTML entities and literal representations of newlines to <br> tags
  // Handle &#10; (HTML entity for newline)
  html = html.replace(/&#10;/g, "<br>");

  // Handle literal text \n (escaped backslash-n in the JSON display)
  html = html.replace(/\\n/g, "<br>");

  // Handle actual newlines (just in case)
  html = html.replace(/\n/g, "<br>");

  // Sanitize to prevent XSS attacks
  return DOMPurify.sanitize(html);
}
