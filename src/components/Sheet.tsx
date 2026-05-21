import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Keyboard, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { radii, spacing, useColors } from '@/theme';
import { Text } from './Text';

export type SheetRef = BottomSheetModal;

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  footer?: React.ReactNode;
  onDismiss?: () => void;
};

export const Sheet = forwardRef<SheetRef, Props>(function Sheet(
  { title, subtitle, children, snapPoints, footer, onDismiss },
  ref,
) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const points = useMemo(() => snapPoints ?? ['65%', '92%'], [snapPoints]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.bg,
                borderTopColor: colors.hairline,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom, colors],
  );

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    if (typeof ref === 'object' && ref?.current) {
      ref.current.dismiss();
    }
  }, [ref]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={points}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: colors.bg,
        borderTopLeftRadius: radii.xxl,
        borderTopRightRadius: radii.xxl,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.inkFaint, width: 40 }}
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      enableContentPanningGesture={false}
      onDismiss={() => {
        Keyboard.dismiss();
        onDismiss?.();
      }}
    >
      {(title || subtitle) && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {title ? <Text variant="h2">{title}</Text> : null}
            {subtitle ? (
              <Text variant="small" color={colors.textMuted} style={{ marginTop: 4 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: colors.surface },
              pressed && { opacity: 0.6 },
            ]}
          >
            <X size={18} color={colors.textSoft} strokeWidth={2} />
          </Pressable>
        </View>
      )}
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: footer ? 180 + insets.bottom : Math.max(insets.bottom, spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
