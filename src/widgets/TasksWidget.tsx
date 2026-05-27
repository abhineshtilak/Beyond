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

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:       '#1C1916' as const,
  bgAlt:    '#252119' as const,
  text:     '#F0E8DF' as const,
  muted:    '#8E847A' as const,
  faint:    '#524944' as const,
  hairline: '#2E2924' as const,
  sky:      '#9EB7C9' as const,
  sage:     '#A8B89F' as const,
  butter:   '#E8D095' as const,
  rose:     '#D8A4A4' as const,
  done:     '#6A7A6A' as const,
  skyTint:  '#9EB7C928' as const,
};

const priorityColor = (p: 1 | 2 | 3) => {
  if (p === 3) return C.rose;
  if (p === 2) return C.butter;
  return C.sky;
};

const tintFor = (p: 1 | 2 | 3): `#${string}` => {
  if (p === 3) return '#D8A4A430';
  if (p === 2) return '#E8D09530';
  return '#9EB7C930';
};

// ─── Single task row ──────────────────────────────────────────────────────────
// Tapping a pending row marks it complete directly in SQLite (no app launch).
// Tapping a completed row opens the Tasks tab via deep link.
function TaskRow({ task }: { task: WidgetTask }) {
  const pColor = task.completed ? C.done : priorityColor(task.priority);

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
      clickAction={task.completed ? 'OPEN_URI' : 'COMPLETE_TASK'}
      clickActionData={
        task.completed
          ? { uri: 'myapp://tasks' }
          : { id: task.id }
      }
      accessibilityLabel={
        task.completed
          ? `${task.title}: completed`
          : `${task.title}: tap to complete`
      }
    >
      {/* Priority / done indicator */}
      <FlexWidget
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: task.completed ? C.bgAlt : tintFor(task.priority),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={task.completed ? '✓' : '·'}
          style={{
            fontSize: task.completed ? 11 : 14,
            color: task.completed ? C.done : pColor,
            fontWeight: '700',
          }}
        />
      </FlexWidget>

      {/* Title */}
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

      {/* Priority label for pending tasks */}
      {!task.completed && task.priority === 3 && (
        <TextWidget
          text="NOW"
          style={{ fontSize: 9, color: C.rose, fontWeight: '700' }}
        />
      )}
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
export function TasksWidget({ tasks, pendingCount, completedCount }: Props) {
  const total   = pendingCount + completedCount;
  const display = tasks.slice(0, 5);
  const hidden  = tasks.length - display.length;
  const allClear = pendingCount === 0;

  return (
    // Root: tapping empty areas opens Tasks tab via deep link (native, no JS)
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
      clickActionData={{ uri: 'myapp://tasks' }}
    >
      {/* ── Header ── */}
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
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: C.skyTint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text="✓"
              style={{ fontSize: 12, color: C.sky, fontWeight: '700' }}
            />
          </FlexWidget>
          <TextWidget
            text="Tasks"
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

      {/* ── Task rows ── */}
      {display.length === 0 ? (
        <FlexWidget
          style={{ paddingVertical: 12, paddingHorizontal: 16, width: 'match_parent' }}
        >
          <TextWidget
            text="All clear — nothing due today ✓"
            style={{ fontSize: 13, color: C.muted, fontStyle: 'italic' }}
            maxLines={1}
          />
        </FlexWidget>
      ) : (
        display.map((t) => <TaskRow key={t.id} task={t} />)
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
        clickActionData={{ uri: 'myapp://tasks' }}
      >
        <TextWidget
          text={allClear ? 'Nothing left — great work ✓' : 'Open Beyond →'}
          style={{ fontSize: 11, color: C.sky, fontWeight: '600' }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
