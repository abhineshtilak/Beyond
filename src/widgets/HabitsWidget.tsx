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
  faint:    '#524944' as const,
  hairline: '#2E2924' as const,
  sage:     '#A8B89F' as const,
  sageTint: '#A8B89F28' as const,
  pip:      '#52494422' as const,
};

const withAlpha = (hex: string, aa: string) => (hex + aa) as `#${string}`;

// ─── Single habit row — tapping toggles done state without opening app ────────
function HabitRow({ habit }: { habit: WidgetHabit }) {
  const dotBg = habit.doneToday
    ? withAlpha(habit.color, 'DD')
    : withAlpha(habit.color, '26');

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 16,
        flexGap: 10,
        width: 'match_parent',
      }}
      // Per-row action: toggle this habit's log for today.
      // The widgetTaskHandler receives clickAction="TOGGLE_HABIT"
      // and clickActionData.id = habit.id, then writes to SQLite
      // and re-renders the widget — no app launch needed.
      clickAction="TOGGLE_HABIT"
      clickActionData={{ id: habit.id }}
      accessibilityLabel={habit.doneToday ? `${habit.title}: done` : `${habit.title}: tap to mark done`}
    >
      {/* Filled dot when done, colour-tinted ring when pending */}
      <FlexWidget
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: dotBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {habit.doneToday ? (
          <TextWidget
            text="✓"
            style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}
          />
        ) : (
          // Empty dot shows colour hint so user knows it's tappable
          <TextWidget
            text="·"
            style={{ fontSize: 14, color: withAlpha(habit.color, 'AA'), fontWeight: '700' }}
          />
        )}
      </FlexWidget>

      {/* Title */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={habit.title}
          style={{
            fontSize: 13,
            color: habit.doneToday ? C.muted : C.text,
            fontStyle: habit.doneToday ? 'italic' : 'normal',
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>

      {/* Status badge */}
      {habit.doneToday ? (
        <TextWidget
          text="✓"
          style={{ fontSize: 11, color: C.sage, fontWeight: '700' }}
        />
      ) : (
        <TextWidget
          text="○"
          style={{ fontSize: 11, color: C.faint }}
        />
      )}
    </FlexWidget>
  );
}

// ─── 10-pip progress bar ───────────────────────────────────────────────────────
function ProgressPips({ done, total }: { done: number; total: number }) {
  const ratio  = total > 0 ? done / total : 0;
  const filled = Math.round(ratio * 10);
  return (
    <FlexWidget
      style={{
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        flexGap: 4,
        width: 'match_parent',
      }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <FlexWidget
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < filled ? C.sage : C.pip,
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
    // Root: tapping empty areas opens the Habits tab via deep link (native, no JS)
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.bg,
        borderRadius: 20,
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'myapp://habits' }}
    >
      {/* ── Header ── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 8,
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <FlexWidget
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: C.sageTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="◉"
              style={{ fontSize: 11, color: C.sage, fontWeight: '700' }}
            />
          </FlexWidget>
          <TextWidget
            text="Habits"
            style={{ fontSize: 15, color: C.text, fontWeight: '700' }}
          />
        </FlexWidget>

        {/* Done / total pill */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 3,
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

      {/* ── Habit rows ── */}
      {display.length === 0 ? (
        <FlexWidget
          style={{ paddingHorizontal: 16, paddingVertical: 12, width: 'match_parent' }}
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
        <FlexWidget style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
          <TextWidget
            text={`+${hidden} more`}
            style={{ fontSize: 11, color: C.muted }}
          />
        </FlexWidget>
      )}

      {/* ── Spacer ── */}
      <FlexWidget style={{ flex: 1 }} />

      {/* ── Footer ── */}
      <Divider />
      <FlexWidget
        style={{
          paddingHorizontal: 16,
          paddingVertical: 10,
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
        }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'myapp://habits' }}
      >
        <TextWidget
          text={allDone ? 'All done today 🌿' : 'Open Beyond →'}
          style={{ fontSize: 11, color: C.sage, fontWeight: '600' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
