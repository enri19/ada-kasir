import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../../config/theme';
import { AppButton } from './AppButton';

type ModalType = 'info' | 'success' | 'warning' | 'danger' | 'premium';

export interface AppModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  loading?: boolean;
  icon?: React.ReactNode;
}

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  type?: ModalType;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  primaryAction?: AppModalAction;
  secondaryAction?: AppModalAction;
  /** Multi actions — rendered instead of primaryAction/secondaryAction when set */
  actions?: AppModalAction[];
  /** Show benefit list (for premium/trial modals) */
  benefits?: string[];
  /** Optional subtitle rendered below title */
  subtitle?: string;
  /** Optional children rendered between message and actions */
  children?: React.ReactNode;
}

const TYPE_CONFIG: Record<
  ModalType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  info: {
    icon: 'information-circle',
    color: colors.primary,
    bg: colors.primaryFixed,
  },
  success: {
    icon: 'checkmark-circle',
    color: colors.secondary,
    bg: colors.secondaryFixed,
  },
  warning: {
    icon: 'warning',
    color: '#E65100',
    bg: '#fff3e0',
  },
  danger: {
    icon: 'alert-circle',
    color: colors.error,
    bg: colors.errorContainer,
  },
  premium: {
    icon: 'diamond',
    color: colors.tertiary,
    bg: colors.tertiaryFixed,
  },
};

export function AppModal({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  icon,
  primaryAction,
  secondaryAction,
  actions,
  benefits,
  subtitle,
  children,
}: AppModalProps) {
  const cfg = TYPE_CONFIG[type];

  const renderActions = () => {
    if (actions && actions.length > 0) {
      return actions.slice(0, 5).map((action, idx) => {
        const isLast = idx === actions.slice(0, 5).length - 1;
        const isGhost = action.variant === 'ghost';
        return (
          <AppButton
            key={idx}
            title={action.label}
            onPress={action.onPress}
            variant={action.variant || 'primary'}
            fullWidth
            size={isGhost ? 'md' : 'lg'}
            icon={action.icon}
            loading={action.loading}
            style={isLast ? styles.lastActionBtn : styles.actionBtn}
          />
        );
      });
    }

    return (
      <>
        {primaryAction && (
          <AppButton
            title={primaryAction.label}
            onPress={primaryAction.onPress}
            variant={primaryAction.variant || (type === 'danger' ? 'danger' : 'primary')}
            fullWidth
            size="lg"
            icon={primaryAction.icon}
            loading={primaryAction.loading}
            style={styles.primaryBtn}
          />
        )}

        {secondaryAction && (
          <AppButton
            title={secondaryAction.label}
            onPress={secondaryAction.onPress}
            variant={secondaryAction.variant || 'ghost'}
            fullWidth
            size="md"
            icon={secondaryAction.icon}
            loading={secondaryAction.loading}
            style={styles.secondaryBtn}
          />
        )}

        {!primaryAction && !secondaryAction && (
          <AppButton
            title="Tutup"
            onPress={onClose}
            variant="ghost"
            fullWidth
            size="md"
          />
        )}
      </>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      hardwareAccelerated={false}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons
              name={icon || cfg.icon}
              size={32}
              color={cfg.color}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Subtitle */}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Benefits */}
          {benefits && benefits.length > 0 && (
            <View style={styles.benefitList}>
              {benefits.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text style={styles.benefitText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Custom children */}
          {children}

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {renderActions()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...typography.headlineMobile,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitList: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  actionsContainer: {
    width: '100%',
  },
  actionBtn: {
    marginBottom: 8,
  },
  lastActionBtn: {
    marginBottom: 0,
  },
  primaryBtn: {
    marginBottom: 8,
  },
  secondaryBtn: {
    marginBottom: 0,
  },
});
