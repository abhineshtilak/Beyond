import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// ─── Types ────────────────────────────────────────────────────────────────────
export type WidgetTask = {
  id: string;
  title: string;
  completed: boolean;
  priority: 1 | 2 | 3;
};

type Props = {
  tasks: WidgetTask[];
  pendingCount: number;
  completedCount: number;
};

// ─── Palette (dark card, readable on any wallpaper) ───────────────────────────
const C = {
  bg:        '#1C1916' as const,
  bgAlt:     '#252119' as const,
  text:      '#F0E8DF' as const,
  muted:     '#8E847A' as const,
  hairline:  '#2E2924' as const,
  sky:       '#9EB7C9' as const,
  sage:      '#A8B89F' as const,
  butter:    '#E8D095' as const,
  rose:      '#D8A4A4' as const,
  done:      '#6A7A6A' as const,
  // 8-char hex (RRGGBBAA) tints — used for soft backgrounds
  skyTint:   '#9EB7C928' as const,
  bgAltTint: '#25211934' as const,
};

const priorityColor = (p: 1 | 2 | 3) => {
  if (p === 3) return C.rose;
  if (p === 2) return C.butter;
  return C.sky;
};

const tintFor = (p: 1 | 2 | 3): `#${string}` => {
  if (p === 3) return '#D8A4A433';
  if (p === 2) return '#E8D09533';
  return '#9EB7C933';
};

// ─── Single task row ──────────────────────────────────────────────────────────
function TaskRow({ task }: { task: WidgetTask }) {
  const pColor = task.completed ? C.done : priorityColor(task.priority);
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
      clickAction="OPEN_TASKS"
    >
      {/* Priority / done dot */}
      <FlexWidget
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: task.completed ? C.bgAlt : tintFor(task.priority),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={task.completed ? '✓' : '•'}
          style={{
            fontSize: 11,
            color: task.completed ? C.done : pColor,
            fontWeight: '700',
          }}
        />
      </FlexWidget>

      {/* Title (wrapped in FlexWidget to take remaining width) */}
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <TextWidget
          text={task.title}
          style={{
            fontSize: 13,
            color: task.completed ? C.done : C.text,
            fontStyle: task.completed ? 'italic' : 'normal',
          }}
          maxLines={1}
          truncate="END"
        />
      </FlexWidget>
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
export function TasksWidget({ tasks, pendingCount, completedCount }: Props) {
  const total   = pendingCount + completedCount;
  const display = tasks.slice(0, 5);
  const hidden  = tasks.length - display.length;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: C.bg,
        borderRadius: 20,
        flexDirection: 'column',
      }}
      clickAction="OPEN_TASKS"
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
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 8,
          }}
        >
          <FlexWidget
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              backgroundColor: C.skyTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="✓"
              style={{ fontSize: 13, color: C.sky, fontWeight: '700' }}
            />
          </FlexWidget>
          <TextWidget
            text="Tasks"
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
            text={`${completedCount}`}
            style={{ fontSize: 12, color: C.sage, fontWeight: '700' }}
          />
          <TextWidget
            text={`/ ${total}`}
            style={{ fontSize: 12, color: C.muted }}
          />
        </FlexWidget>
      </FlexWidget>

      <Divider />

      {/* Task rows */}
      {display.length === 0 ? (
        <FlexWidget
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            width: 'match_parent',
          }}
        >
          <TextWidget
            text="All clear — nothing due today."
            style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}
            maxLines={1}
          />
        </FlexWidget>
      ) : (
        display.map((t) => <TaskRow key={t.id} task={t} />)
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
        clickAction="OPEN_TASKS"
      >
        <TextWidget
          text="Open Beyond →"
          style={{ fontSize: 11, color: C.sky, fontWeight: '600' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
