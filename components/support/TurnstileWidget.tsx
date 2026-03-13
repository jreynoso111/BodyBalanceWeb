type TurnstileWidgetProps = {
  action?: string;
  onTokenChange: (token: string | null) => void;
  resetNonce?: number;
  siteKey: string;
  theme?: 'light' | 'dark' | 'auto';
};

export function TurnstileWidget(_: TurnstileWidgetProps) {
  return null;
}
