// Sistema de asistencia — módulo independiente.
// Este archivo solo contiene la lógica; la interfaz se conecta desde app.js.
(function () {
  async function setAttendance(supabaseClient, participantId, attended) {
    if (!supabaseClient || !participantId) throw new Error('Datos de asistencia incompletos');
    const { error } = await supabaseClient
      .from('event_participants')
      .update({ attended: !!attended })
      .eq('id', participantId);
    if (error) throw error;
  }

  window.GremioAttendance = { setAttendance };
})();
