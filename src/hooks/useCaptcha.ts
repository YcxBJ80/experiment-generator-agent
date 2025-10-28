import { useCallback, useEffect, useState } from 'react';
import { apiClient, type CaptchaChallenge } from '@/lib/api';

interface UseCaptchaResult {
  captcha: CaptchaChallenge | null;
  loading: boolean;
  error: string | null;
  refreshCaptcha: () => Promise<void>;
}

export function useCaptcha(autoLoad: boolean = true): UseCaptchaResult {
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCaptcha = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCaptcha();
      if (response.success && response.data) {
        setCaptcha(response.data);
      } else {
        setCaptcha(null);
        setError(response.error || 'Failed to load captcha');
      }
    } catch (err) {
      setCaptcha(null);
      setError(err instanceof Error ? err.message : 'Failed to load captcha');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refreshCaptcha();
    }
  }, [autoLoad, refreshCaptcha]);

  return { captcha, loading, error, refreshCaptcha };
}
