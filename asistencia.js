// Sistema de asistencia — módulo independiente
// Se conecta a event_participants.attended sin duplicar datos.
(function () {
  const supabase = window.supabaseClient || window.supabase;
  if (!supabase || !window.currentUser || !window.currentProfile) return;

  async function confirmarAsistencia(eventId, participantes) {
    if (!participantes?.length) return;
    const seleccionados = new Set(participantes.filter(p => p.attended).map(p => p.id));
    const ids = participantes.map(p => p.id);
    const updates = participantes.map(p => ({ id: p.id, attended: seleccionados.has(p.id) }));
    for (const row of updates) {
      const { error } = await supabase.from('event_participants').update({ attended: row.attended }).eq('id', row.id);
      if (error) throw error;
    }
  }

  window.confirmarAsistencia = confirmarAsistencia;
})();
