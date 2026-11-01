import { useEffect, useRef, useState } from 'react';

import { apiErrorMessage } from '@/services/api/http-client';

export function useAuthAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function run(work: () => Promise<void>): Promise<{ ok: true } | { ok: false; reason?: unknown }> {
    if (inFlight.current) return { ok: false };
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      await work();
      return mounted.current ? { ok: true } : { ok: false };
    } catch (reason) {
      if (mounted.current) setError(apiErrorMessage(reason));
      return { ok: false, reason };
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { pending, error, setError, run };
}
