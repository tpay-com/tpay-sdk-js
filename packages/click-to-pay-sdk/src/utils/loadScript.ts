const DEFAULT_TIMEOUT = 10000;

export function loadScript({
  src,
  id,
  timeout = DEFAULT_TIMEOUT,
}: {
  src: string;
  id?: string;
  timeout?: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check for an existing script by id first (more robust), then by src
    const existingById = id ? document.getElementById(id) : null;
    const existingBySrc = document.querySelector(
      `script[src="${CSS.escape(src)}"]`
    );
    const existing = existingById || existingBySrc;

    if (existing) {
      // If the script previously failed (marked with data attribute), remove it and retry
      if (existing.getAttribute("data-load-failed") === "true") {
        existing.remove();
      } else {
        resolve();
        return;
      }
    }

    let settled = false;

    const script = document.createElement("script");
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      script.setAttribute("data-load-failed", "true");
      script.onload = null;
      script.onerror = null;
      script.remove();
      reject(new Error(`Timeout for script ${src}`));
    }, timeout);

    script.src = src;
    if (id) {
      script.id = id;
    }
    script.async = true;

    script.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve();
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      script.setAttribute("data-load-failed", "true");
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };

    document.body.appendChild(script);
  });
}
