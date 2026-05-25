import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// ─── Types ────────────────────────────────────────────────────────────────────
export type WidgetHabit = {
  id: string;
  title: string;
  color: string;
  doneToday: boolean;
};

type Props = {
  habits: WidgetHabit[];
  doneCount: number;
  totalCount: number;
};

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#1C1916' as const,
  bgAlt:    '#252119' as const,
  text:     '#F0E8DF' as const,
  muted:    '#8E847A' as const,
  hairline: '#2E2924' as const,
  sage:     '#A8B89F' as const,
  sageTint: '#A8B89F28' as const,
  faint:    '#52494422' as const,
};

// Concat alpha onto a #RRGGBB to make #RRGGBBAA — typed as HexColor.
const withAlpha = (hex: string, aa: string) => (hex + aa) as `#${string}`;

// ─── Single habit row ─────────────────────────────────────────────────────────
function HabitRow({ habit }: { habit: WidgetHabit }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 16,
        flexGap: 10,
        width: 'match_parent',
      }}
      clickAction="OPEN_HABITS"
    >
      {/* Habit color dot — filled if done, soft tint if not */}
      <FlexWidget
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: habit.doneToday
            ? withAlpha(habit.color, 'DD')
            : withAlpha(habit.color, '28'),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {habit.doneToday ? (
          <TextWidget
            text="✓"
            style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '700' }}
          />
        ) : null}
      </FlexWidget>

      {/* Title */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={habit.title}
          style={{
            fontSize: 13,
            color: habit.doneToday ? C.muted : C.text,
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>

      {habit.doneToday ? (
        <TextWidget
          text="DONE"
          style={{ fontSize: 9, color: C.muted, fontWeight: '600' }}
        />
      ) : null}
    </FlexWidget>
  );
}

// ─── 10-dot progress (replaces %-width bar which isn't supported) ─────────────
function ProgressPips({ done, total }: { done: number; total: number }) {
  const ratio = total > 0 ? done / total : 0;
  const filled = Math.round(ratio * 10);
  const pips = Array.from({ length: 10 }, (_, i) => i);
  return (
    <FlexWidget
      style={{
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 4,
        width: 'match_parent',
      }}
    >
      {pips.map((i) => (
        <FlexWidget
          key={i}
          style={{
            width: 8,
            height: 4,
            borderRadius: 2,
            backgroundColor: i < filled ? C.sage : C.faint,
          }}
        />
      ))}
    </FlexWidget>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return (
    <FlexWidget
      style={{
        height: 1,
        width: 'match_parent',
        backgroundColor: C.hairline,
        marginHorizontal: 16,
      }}
    />
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export function HabitsWidget({ habits, doneCount, totalCount }: Props) {
  const display = habits.slice(0, 5);
  const hidden  = habits.length - display.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.bg,
        borderRadius: 20,
        flexDirection: 'column',
      }}
      clickAction="OPEN_HABITS"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <FlexWidget
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: C.sageTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="◉"
              style={{ fontSize: 12, color: C.sage, fontWeight: '700' }}
            />
          </FlexWidget>
          <TextWidget
            text="Habits"
            style={{ fontSize: 15, color: C.text, fontWeight: '700' }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 4,
            backgroundColor: C.bgAlt,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          }}
        >
          <TextWidget
            text={`${doneCount}`}
            style={{ fontSize: 12, color: C.sage, fontWeight: '700' }}
          />
          <TextWidget
            text={`/ ${totalCount}`}
            style={{ fontSize: 12, color: C.muted }}
          />
        </FlexWidget>
      </FlexWidget>

      <Divider />
      <ProgressPips done={doneCount} total={totalCount} />

      {/* Rows */}
      {display.length === 0 ? (
        <FlexWidget
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="No habits yet. Add one in Beyond."
            style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}
          />
        </FlexWidget>
      ) : (
        display.map((h) => <HabitRow key={h.id} habit={h} />)
      )}

      {hidden > 0 && (
        <FlexWidget style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          <TextWidget
            text={`+${hidden} more`}
            style={{ fontSize: 11, color: C.muted }}
          />
        </FlexWidget>
      )}

      {/* Spacer + footer */}
      <FlexWidget style={{ flex: 1 }} />
      <Divider />
      <FlexWidget
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
        }}
        clickAction="OPEN_HABITS"
      >
        <TextWidget
          text={allDone ? 'All done today 🌿' : 'Open Beyond →'}
          style={{ fontSize: 11, color: C.sage, fontWeight: '600' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
