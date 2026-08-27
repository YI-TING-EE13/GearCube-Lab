/**
 * Sanitizes a benchmark suiteId for use as a filesystem-safe filename component.
 *
 * Rules:
 * - Retains alphanumeric characters, dots (.), underscores (_), and hyphens (-).
 * - Replaces any other characters with an underscore.
 * - Collapses consecutive underscores.
 * - Trims leading and trailing underscores.
 * - If the resulting string is empty, returns 'suite'.
 *
 * Note: This function strictly operates on filename generation and does NOT mutate
 * the scientific suiteId stored inside benchmark configs or reports.
 */
export function sanitizeBenchmarkSuiteIdForFilename(suiteId: string): string {
  const sanitized = suiteId
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized.length > 0 ? sanitized : 'suite';
}

/**
 * Builds a deterministic, sanitized download filename for exported benchmark reports.
 */
export function buildBenchmarkDownloadFilename(
  suiteId: string,
  extension: 'json' | 'csv'
): string {
  const sanitized = sanitizeBenchmarkSuiteIdForFilename(suiteId);
  return `gearcube-benchmark-${sanitized}.${extension}`;
}

/**
 * Triggers a browser Blob download with deferred object URL revocation to prevent memory leaks.
 */
export function downloadBenchmarkText(
  text: string,
  filename: string,
  mimeType: string
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
    return;
  }

  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  if (document.body) {
    document.body.appendChild(anchor);
  }

  anchor.click();

  if (anchor.parentNode) {
    anchor.parentNode.removeChild(anchor);
  }

  // Defer object URL revocation to allow the browser to initiate the download stream.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
