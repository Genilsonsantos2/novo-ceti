import React, { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SchoolEvent {
  id: string;
  title: string;
  event_type: 'FERIADO' | 'RECESSO' | 'REUNIAO' | 'PEDAGOGICO' | 'OUTRO';
  start_date: string;
  end_date: string;
  affects_school_days: boolean;
  notes: string | null;
}

const eventTypes: Array<{ value: SchoolEvent['event_type']; label: string; color: string }> = [
  { value: 'FERIADO', label: 'Feriado', color: 'bg-rose-100 text-rose-800' },
  { value: 'RECESSO', label: 'Recesso', color: 'bg-amber-100 text-amber-800' },
  { value: 'REUNIAO', label: 'Reunião', color: 'bg-sky-100 text-sky-800' },
  { value: 'PEDAGOGICO', label: 'Dia pedagógico', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'OUTRO', label: 'Outro', color: 'bg-gray-100 text-gray-700' },
];

export const SchoolCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({ title: '', event_type: 'FERIADO' as SchoolEvent['event_type'], start_date: format(new Date(), 'yyyy-MM-dd'), end_date: format(new Date(), 'yyyy-MM-dd'), affects_school_days: true, notes: '' });

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(monthEnd, { weekStartsOn: 1 }) });

  const loadEvents = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('school_calendar_events').select('*').lte('start_date', format(monthEnd, 'yyyy-MM-dd')).gte('end_date', format(monthStart, 'yyyy-MM-dd')).order('start_date');
    if (loadError) {
      setError(`Não foi possível carregar o calendário: ${loadError.message}. Confira se a migração de serviços escolares foi aplicada.`);
      setEvents([]);
    } else {
      setEvents((data || []) as SchoolEvent[]);
      setError('');
    }
    setLoading(false);
  };

  useEffect(() => { loadEvents(); }, [month]);

  const eventsForDay = (date: Date) => events.filter(event => {
    const day = format(date, 'yyyy-MM-dd');
    return event.start_date <= day && event.end_date >= day;
  });

  const selectedEvents = eventsForDay(selectedDate);
  const monthEvents = useMemo(() => events.filter(event => event.start_date <= format(monthEnd, 'yyyy-MM-dd') && event.end_date >= format(monthStart, 'yyyy-MM-dd')), [events, monthEnd, monthStart]);

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || draft.end_date < draft.start_date) {
      setError('Informe um título e um intervalo válido.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const { error: insertError } = await supabase.from('school_calendar_events').insert({ ...draft, title: draft.title.trim(), notes: draft.notes.trim() || null, created_by: user?.id || null });
    if (insertError) {
      setError(`Não foi possível salvar o evento: ${insertError.message}`);
    } else {
      setNotice('Evento adicionado ao calendário.');
      const nextDate = parseISO(draft.start_date);
      setMonth(startOfMonth(nextDate));
      setSelectedDate(nextDate);
      setDraft(current => ({ ...current, title: '', notes: '' }));
      await loadEvents();
    }
    setSaving(false);
  };

  const deleteEvent = async (event: SchoolEvent) => {
    if (!window.confirm(`Excluir o evento "${event.title}"?`)) return;
    const { error: deleteError } = await supabase.from('school_calendar_events').delete().eq('id', event.id);
    if (deleteError) setError(`Não foi possível excluir o evento: ${deleteError.message}`);
    else {
      setEvents(current => current.filter(item => item.id !== event.id));
      setNotice('Evento removido.');
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 md:px-10 md:py-8">
      <header className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Secretaria • Planejamento letivo</p>
        <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface">Calendário escolar</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Feriados, recessos, reuniões e demais datas que contextualizam os períodos dos relatórios.</p>
      </header>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setMonth(value => subMonths(value, 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700" aria-label="Mês anterior"><span className="material-symbols-outlined">chevron_left</span></button>
            <div className="text-center"><h2 className="text-xl font-extrabold capitalize text-gray-900">{format(month, 'MMMM yyyy', { locale: ptBR })}</h2><p className="text-xs text-gray-500">{monthEvents.length} evento(s) no mês</p></div>
            <button type="button" onClick={() => setMonth(value => addMonths(value, 1))} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700" aria-label="Próximo mês"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-gray-200">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => <div key={day} className="border-b border-r border-gray-200 bg-gray-50 py-2 text-center text-[10px] font-black uppercase text-gray-500">{day}</div>)}
            {calendarDays.map(day => {
              const dayEvents = eventsForDay(day);
              const selected = isSameDay(day, selectedDate);
              return <button type="button" key={day.toISOString()} onClick={() => setSelectedDate(day)} className={`min-h-20 border-b border-r border-gray-200 p-1.5 text-left transition md:min-h-24 md:p-2 ${!isSameMonth(day, month) ? 'bg-gray-50/70 text-gray-300' : 'bg-white text-gray-800'} ${selected ? 'ring-2 ring-inset ring-primary' : 'hover:bg-primary/5'}`}>
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isSameDay(day, new Date()) ? 'bg-primary text-white' : ''}`}>{format(day, 'd')}</span>
                <span className="mt-1 block space-y-1">{dayEvents.slice(0, 2).map(item => <span key={item.id} title={item.title} className={`block truncate rounded px-1 py-0.5 text-[9px] font-bold ${eventTypes.find(type => type.value === item.event_type)?.color}`}>{item.title}</span>)}{dayEvents.length > 2 && <span className="block text-[9px] text-gray-500">+{dayEvents.length - 2} eventos</span>}</span>
              </button>;
            })}
          </div>
          {loading && <p className="mt-3 text-xs text-gray-500">Atualizando eventos...</p>}
          {error && <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p>}
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-gray-900">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
            {selectedEvents.length === 0 ? <p className="mt-3 text-sm text-gray-500">Nenhum evento nesta data.</p> : <ul className="mt-3 space-y-3">{selectedEvents.map(event => <li key={event.id} className="flex items-start justify-between gap-3 border-t border-gray-100 pt-3"><div><span className={`rounded px-2 py-1 text-[9px] font-black uppercase ${eventTypes.find(type => type.value === event.event_type)?.color}`}>{eventTypes.find(type => type.value === event.event_type)?.label}</span><p className="mt-2 text-sm font-bold text-gray-900">{event.title}</p><p className="text-xs text-gray-500">{format(parseISO(event.start_date), 'dd/MM/yyyy')} a {format(parseISO(event.end_date), 'dd/MM/yyyy')}</p><p className="text-xs text-gray-500">{event.affects_school_days ? 'Não letivo' : 'Não altera o total de dias letivos'}</p>{event.notes && <p className="mt-1 text-sm text-gray-600">{event.notes}</p>}</div><button type="button" onClick={() => deleteEvent(event)} className="p-2 text-rose-700" aria-label={`Excluir ${event.title}`}><span className="material-symbols-outlined">delete</span></button></li>)}</ul>}
          </section>

          <form onSubmit={saveEvent} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">Adicionar evento</h2>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-600">Título<input required value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" placeholder="Ex.: Recesso junino" /></label>
              <label className="block text-xs font-bold text-gray-600">Tipo<select value={draft.event_type} onChange={event => setDraft({ ...draft, event_type: event.target.value as SchoolEvent['event_type'] })} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">{eventTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-gray-600">Início<input required type="date" value={draft.start_date} onChange={event => setDraft({ ...draft, start_date: event.target.value, end_date: draft.end_date < event.target.value ? event.target.value : draft.end_date })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-2 py-2.5 text-sm" /></label><label className="text-xs font-bold text-gray-600">Fim<input required type="date" min={draft.start_date} value={draft.end_date} onChange={event => setDraft({ ...draft, end_date: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-gray-200 px-2 py-2.5 text-sm" /></label></div>
              <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-900"><input type="checkbox" checked={draft.affects_school_days} onChange={event => setDraft({ ...draft, affects_school_days: event.target.checked })} className="mt-0.5" />Descontar esta data do total de dias letivos do relatório</label>
              <label className="block text-xs font-bold text-gray-600">Observação<textarea rows={2} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm" /></label>
              <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><span className="material-symbols-outlined text-base">event_available</span>{saving ? 'Salvando...' : 'Salvar no calendário'}</button>
              {notice && <p role="status" className="text-sm font-bold text-emerald-700">{notice}</p>}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
