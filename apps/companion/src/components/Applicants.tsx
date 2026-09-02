import { Group, Stack } from "@mantine/core";
import { RAID_DIFFICULTY_COLORS } from "@repo/ui";
import type { Lookup, Session } from "../state";
import { keyOf } from "../state";
import { ApplicantRow } from "./ApplicantRow";
import app from "../App.module.css";
import classes from "./Applicants.module.css";

const NEW_BADGE_MS = 8000;

const DIFF_LABEL: Record<string, { text: string; color: string }> = {
  N: { text: "Normal", color: RAID_DIFFICULTY_COLORS.normal },
  H: { text: "Heroic", color: RAID_DIFFICULTY_COLORS.heroic },
  M: { text: "Mythic", color: RAID_DIFFICULTY_COLORS.mythic },
  "+": { text: "Mythic+", color: RAID_DIFFICULTY_COLORS.mythic },
};

const clock = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function Applicants({
  session,
  lookups,
  seenAt,
  dimmed,
  now,
}: {
  session: Session;
  lookups: Record<string, Lookup>;
  seenAt: Record<string, number>;
  /** Sync lost: keep the last list visible but faded. */
  dimmed?: boolean;
  now: number;
}) {
  return (
    <div className={`${app.body} ${dimmed ? classes.dimmed : ""}`}>
      <div className={classes.header}>
        <Group gap={10} wrap="nowrap">
          <span className={app.accentBar} style={{ height: 34 }} />
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <span className={classes.title}>{session.title || "Group finder listing"}</span>
            <Group gap={8}>
              <span className={app.label} style={{ color: DIFF_LABEL[session.difficulty]?.color ?? "var(--mantine-color-accent-3)" }}>
                {DIFF_LABEL[session.difficulty]?.text ?? session.region}
              </span>
              <span className={app.mono}>· session started {clock(session.startedAt)}</span>
            </Group>
          </Stack>
          <Stack gap={1} align="flex-end" style={{ whiteSpace: "nowrap" }}>
            <span className={classes.count}>{session.applicants.length}</span>
            <span className={app.label}>{session.applicants.length === 1 ? "applicant" : "applicants"}</span>
          </Stack>
        </Group>
      </div>

      {session.applicants.length === 0 ? (
        <div className={classes.empty}>
          <span className={`${app.dot} ${app.dotAccent}`} style={{ width: 7, height: 7 }} />
          Waiting for the first applicant
        </div>
      ) : (
        <>
          <div className={classes.columns}>
            <span />
            <span>Applicant</span>
            <span style={{ textAlign: "right" }}>ilvl</span>
            <span style={{ textAlign: "right" }}>rio</span>
            <span style={{ textAlign: "right" }}>logs</span>
            <span style={{ textAlign: "right" }}>{session.difficulty === "+" ? "best" : "prog"}</span>
            <span />
          </div>
          <div className={classes.list}>
            {session.applicants.map((a, i, all) => {
              const key = keyOf(a);
              const size = all.filter((x) => x.group === a.group).length;
              // The game lists a group's members in sign-up order; the first is its leader.
              const groupRole = size < 2 ? undefined : all.findIndex((x) => x.group === a.group) === i ? "leader" : "member";
              return (
                <ApplicantRow
                  key={key}
                  region={session.region}
                  difficulty={session.difficulty}
                  applicant={a}
                  lookup={lookups[key]}
                  isNew={now - (seenAt[key] ?? 0) < NEW_BADGE_MS}
                  group={groupRole && { role: groupRole, size }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
