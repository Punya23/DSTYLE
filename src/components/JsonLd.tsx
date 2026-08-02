/**
 * Renders a JSON-LD block. `<` is escaped to its unicode form because product
 * copy is admin-entered and would otherwise be able to close the script tag —
 * `JSON.stringify` alone is not XSS-safe inside `<script>`.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
