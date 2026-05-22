import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
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

const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

// Each year cell renders at this height. Used to compute scroll offsets.
const YEAR_ROW_H = 36;            // paddingVertical(6×2) + text(~20) + breathing room
const YEAR_GAP = spacing.xs;       // 4
const YEAR_ROW_PITCH = YEAR_ROW_H + YEAR_GAP; // distance between row tops
const YEAR_COLS = 3;
const PICKER_MAX_HEIGHT = 168;     // ~ 4 rows visible

export function InlineCalendar({ selected, onSelect, minDate }: Props) {
  const colors = useColors();

  const [view, setView] = useState<Date>(() => {
    if (selected) {
      try { return parseISO(selected); } catch { return new Date(); }
    }
    return new Date();
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const yearScrollRef = useRef<ScrollView>(null);

  // Sync view if selected jumps to a different month
  useEffect(() => {
    if (!selected) return;
    try {
      const d = parseISO(selected);
      setView((v) =>
        v.getFullYear() !== d.getFullYear() || v.getMonth() !== d.getMonth() ? d : v,
      );
    } catch {}
  }, [selected]);

  const today = useMemo(() => new Date(), []);
  const years = useMemo(() => {
    const start = today.getFullYear() - 50;
    const end = today.getFullYear() + 80;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [today]);

  // When picker opens, scroll the year list so the current year sits near the top
  useEffect(() => {
    if (!pickerOpen) return;
    const idx = years.findIndex((y) => y === view.getFullYear());
    if (idx < 0) return;
    const row = Math.floor(idx / YEAR_COLS);
    // Put current year row as the 2nd visible row (some history above, future below)
    const offset = Math.max(0, (row - 1) * YEAR_ROW_PITCH);
    // Delay so the ScrollView has laid out its content
    const t = setTimeout(() => {
      yearScrollRef.current?.scrollTo({ y: offset, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [pickerOpen]); // only when toggled open

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

  const handleSelectYear = useCallback((y: number) => {
    setView((v) => setYear(v, y));
    // keep picker open so user can also tap a month
  }, []);

  const handleSelectMonth = useCallback((i: number) => {
    setView((v) => setMonth(v, i));
    setPickerOpen(false);
  }, []);

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: colors.hairline }]}>
        {!pickerOpen && (
          <Pressable onPress={handlePrevMonth} hitSlop={8} style={styles.navBtn}>
            <ChevronLeft size={18} color={colors.text} strokeWidth={2} />
          </Pressable>
        )}

        <Pressable
          onPress={() => setPickerOpen((v) => !v)}
          hitSlop={6}
          style={[styles.headerCenter, { flex: 1 }]}
        >
          <Text variant="bodyMedium" style={{ fontFamily: fonts.serifBold, fontSize: 17 }}>
            {format(view, 'MMMM yyyy')}
          </Text>
          <ChevronRight
            size={14}
            color={colors.textMuted}
            strokeWidth={2}
            style={{ transform: [{ rotate: pickerOpen ? '-90deg' : '90deg' }] }}
          />
        </Pressable>

        {pickerOpen ? (
          <Pressable onPress={() => setPickerOpen(false)} hitSlop={8} style={styles.navBtn}>
            <X size={16} color={colors.text} strokeWidth={2} />
          </Pressable>
        ) : (
          <Pressable onPress={handleNextMonth} hitSlop={8} style={styles.navBtn}>
            <ChevronRight size={18} color={colors.text} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {/* ── Unified year + month picker ──────────────────────── */}
      {pickerOpen ? (
        <View style={[styles.pickerPanel, { borderBottomColor: colors.hairline }]}>
          {/* Year grid — scrollable. Uses plain ScrollView (no virtualization) to play
              nicely when nested inside the Sheet's BottomSheetScrollView. */}
          <ScrollView
            ref={yearScrollRef}
            style={{ maxHeight: PICKER_MAX_HEIGHT }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.yearGrid}
          >
            {years.map((y) => {
              const isSelected = view.getFullYear() === y;
              return (
                <Pressable
                  key={y}
                  onPress={() => handleSelectYear(y)}
                  style={({ pressed }) => [
                    styles.yearCell,
                    { backgroundColor: isSelected ? colors.text : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    variant="smallMedium"
                    color={isSelected ? colors.bg : colors.text}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.hairline, marginVertical: spacing.xs }} />

          {/* Month grid — always visible below years */}
          <View style={styles.monthGrid}>
            {MONTHS_SHORT.map((m, i) => {
              const isSelected = view.getMonth() === i;
              return (
                <Pressable
                  key={m}
                  onPress={() => handleSelectMonth(i)}
                  style={({ pressed }) => [
                    styles.monthCell,
                    { backgroundColor: isSelected ? colors.text : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    variant="smallMedium"
                    color={isSelected ? colors.bg : colors.text}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* ── Calendar grid ────────────────────────────────────── */}
      <Calendar
        key={monthKey}
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
    gap: spacing.sm,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  pickerPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: YEAR_GAP,
    paddingBottom: spacing.xs,
  },
  yearCell: {
    // Three columns with small gaps. 31% accounts for two YEAR_GAPs between three items.
    width: '31.5%',
    height: YEAR_ROW_H,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  monthCell: {
    width: '23%',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
});
