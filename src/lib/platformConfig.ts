import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import TelegramIcon from '@mui/icons-material/Telegram';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Platform } from '@/types/accounts';

export type { Platform };

export interface PlatformConfig {
  label: string;
  icon: SvgIconComponent;
  color: string;
}

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  facebook: {
    label: 'Facebook',
    icon: FacebookIcon,
    color: '#1877f2',
  },
  instagram: {
    label: 'Instagram',
    icon: InstagramIcon,
    color: '#E1306C',
  },
  twitter: {
    label: 'X',
    icon: XIcon,
    color: '#000000',
  },
  telegram: {
    label: 'Telegram',
    icon: TelegramIcon,
    color: '#0088cc',
  },
};

/**
 * Get platform config by name (case-insensitive, handles display names)
 */
export function getPlatformConfig(platform: string): PlatformConfig | null {
  const normalized = platform.toLowerCase().replace(' story', '');
  if (normalized === 'x') return PLATFORM_CONFIG.twitter;
  if (normalized in PLATFORM_CONFIG) {
    return PLATFORM_CONFIG[normalized as Platform];
  }
  return null;
}
