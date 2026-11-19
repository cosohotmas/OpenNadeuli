type Hours = { s: number; e: number };

interface TimeRangeProps {
  day: number;
  hours: Hours;
  meal: boolean;
  hotel: boolean;
  onChange: (hours: Hours) => void;
}

export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

export default function TimeRange({ day, hours, meal, hotel, onChange }: TimeRangeProps) {
  const overlaps = (start: number, end: number) => hours.s < end && hours.e > start;
  const activities = [
    overlaps(9, 11) && '오전 산책',
    meal && overlaps(11, 14) && '점심 식사',
    overlaps(14, 19) && '오후 관광',
    hotel && overlaps(17, 18) && '숙소 추천',
  ].filter(Boolean);

  return (
    <fieldset className="time-range">
      <legend>{day}일차 시간대</legend>
      <div className="timeline-values" aria-hidden="true">
        <span>시작 {formatHour(hours.s)}</span><span>종료 {formatHour(hours.e)}</span>
      </div>
      <div className="timeline-controls">
        <div className="timeline-track" aria-hidden="true" onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const hour = Math.max(0, Math.min(24, Math.round((event.clientX - rect.left) / rect.width * 24)));
          if (Math.abs(hour - hours.s) < Math.abs(hour - hours.e)) {
            onChange({ ...hours, s: Math.min(hour, hours.e - 1) });
          } else {
            onChange({ ...hours, e: Math.max(hour, hours.s + 1) });
          }
        }}>
          <span style={{ left: `${hours.s / 24 * 100}%`, width: `${(hours.e - hours.s) / 24 * 100}%` }} />
        </div>
        <input className="time-slider" type="range" min={0} max={24} value={hours.s}
          aria-label={`${day}일차 시작 시각`} aria-valuetext={formatHour(hours.s)}
          onChange={(event) => onChange({ ...hours, s: Math.min(event.target.valueAsNumber, hours.e - 1) })}
        />
        <input className="time-slider" type="range" min={0} max={24} value={hours.e}
          aria-label={`${day}일차 종료 시각`} aria-valuetext={formatHour(hours.e)}
          onChange={(event) => onChange({ ...hours, e: Math.max(event.target.valueAsNumber, hours.s + 1) })}
        />
      </div>
      <div className="timeline-ticks" aria-hidden="true">
        <span>00시</span><span>06시</span><span>12시</span><span>18시</span><span>24시</span>
      </div>
      <p className="timeline-selection" role="status" aria-atomic="true">
        {formatHour(hours.s)}–{formatHour(hours.e)} · {activities.length
          ? `${activities.join(' + ')} 코스 후보`
          : '이 시간대에 선택할 수 있는 활동이 없어요.'}
      </p>
    </fieldset>
  );
}
