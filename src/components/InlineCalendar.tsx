import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, parseISO, addMonths, subMonths, setYear, setMonth } from 'date-fns';
import { Text } from './Text';
import { useColors, fonts, radii, spacing } from '@/theme';

LocaleConfig.locales.en = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
};
LocaleConfig.defaultLocale = 'en';

type Props = {
  selected?: string | null;
  onSelect: (date: string) => void;
  minDate?: string;
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function InlineCalendar({ selected, onSelect, minDate }: Props) {
  const colors = useColors();

  // The displayed month — initialize from `selected` or today
  const [view, setView] = useState<Date>(() => {
    if (selected) {
      try { return parseISO(selected); } catch { return new Date(); }
    }
    return new Date();
  });
  const [pickerOpen, setPickerOpen] = useState<'none' | 'month' | 'year'>('none');

  // Sync view if selected jumps elsewhere
  React.useEffect(() => {
    if (!selected) return;
    try {
      const d = parseISO(selected);
      setView((v) =>
        v.getFullYear() !== d.getFullYear() || v.getMonth() !== d.getMonth() ? d : v,
      );
    } catch {}
  }, [selected]);

  const today = new Date();
  const years = useMemo(() => {
    const start = today.getFullYear() - 30;
    const end = today.getFullYear() + 30;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  const marked = useMemo(
    () =>
      selected
        ? {
            [selected]: {
              selected: true,
              selectedColor: colors.text,
              selectedTextColor: colors.bg,
            },
          }
        : {},
    [selected, colors],
  );

  const monthKey = format(view, 'yyyy-MM-dd');

  const handlePrevMonth = () => setView((v) => subMonths(v, 1));
  const handleNextMonth = () => setView((v) => addMonths(v, 1));

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}
    >
      {/* Custom header with month/year tap-to-pick */}
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        <Pressable onPress={handlePrevMonth} hitSlop={8} style={styles.navBtn}>
          <ChevronLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Pressable
            onPress={() => setPickerOpen(pickerOpen === 'month' ? 'none' : 'month')}
            hitSlop={6}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text variant="bodyMedium" style={{ fontFamily: fonts.serifBold, fontSize: 18 }}>
              {format(view, 'MMMM')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPickerOpen(pickerOpen === 'year' ? 'none' : 'year')}
            hitSlop={6}
            style={({ pressed }) => [pressed && { opacity: 0.6 }]}
          >
            <Text variant="bodyMedium" color={colors.textSoft} style={{ fontFamily: fonts.serifBold, fontSize: 18 }}>
              {format(view, 'yyyy')}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={handleNextMonth} hitSlop={8} style={styles.navBtn}>
          <ChevronRight size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Month picker */}
      {pickerOpen === 'month' ? (
        <View style={[styles.gridWrap, { borderBottomColor: colors.hairline }]}>
          {MONTHS_SHORT.map((m, i) => {
            const selectedM = view.getMonth() === i;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  setView((v) => setMonth(v, i));
                  setPickerOpen('none');
                }}
                style={({ pressed }) => [
                  styles.gridCell,
                  {
                    backgroundColor: selectedM ? colors.text : 'transparent',
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  variant="smallMedium"
                  color={selectedM ? colors.bg : colors.text}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Year picker */}
      {pickerOpen === 'year' ? (
        <ScrollView
          style={{ maxHeight: 220, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={false}
        >
          {years.map((y) => {
            const selectedY = view.getFullYear() === y;
            return (
              <Pressable
                key={y}
                onPress={() => {
                  setView((v) => setYear(v, y));
                  setPickerOpen('none');
                }}
                style={({ pressed }) => [
                  styles.gridCellYear,
                  { backgroundColor: selectedY ? colors.text : 'transparent' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text variant="smallMedium" color={selectedY ? colors.bg : colors.text}>
                  {y}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Calendar grid (header hidden — we render our own) */}
      <Calendar
        key={monthKey} // force remount on view change
        current={monthKey}
        minDate={minDate}
        onDayPress={(d) => onSelect(d.dateString)}
        markedDates={marked}
        hideArrows
        hideExtraDays={false}
        renderHeader={() => <View />}
        theme={{
          backgroundColor: colors.bg,
          calendarBackground: colors.bg,
          textSectionTitleColor: colors.textMuted,
          dayTextColor: colors.text,
          todayTextColor: colors.text,
          todayBackgroundColor: colors.accentSoft,
          textDisabledColor: colors.textFaint,
          arrowColor: colors.text,
          textDayFontFamily: fonts.sans,
          textDayHeaderFontFamily: fonts.sansMedium,
          textDayFontSize: 14,
          textMonthFontSize: 0,
          textDayHeaderFontSize: 11,
        } as any}
        style={{ paddingBottom: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCenter: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  gridWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  gridCell: {
    width: '23%',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  gridCellYear: {
    width: '23%',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
  },
});
