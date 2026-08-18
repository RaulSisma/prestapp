var sheetName = 'datos';
var scriptProp = PropertiesService.getScriptProperties();

function initialSetup() {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProp.setProperty('key', activeSpreadsheet.getId());
  scriptProp.setProperty('adminEmail', 'Raulsaldarriagaa@gmail.com');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.openById(scriptProp.getProperty('key'));
    var sheet = doc.getSheetByName(sheetName);

    // Captura segura de parámetros (soporta nombres en español e inglés)
    var p = e.parameter || {};
    var nombre = p.nombre || p.name || p.Nombre || 'Cliente';
    var email = p.email || p.correo || p.Email || '';
    var movil = p.movil || p.mobile || p.telefono || p.phone || 'No especificado';
    var servicio = p.servicio || p.subject || p.Servicio || 'Auditoría Visual / Growth';
    var mensaje = p.mensaje || p.message || p.Mensaje || 'Sin detalles adicionales';

    // Registro de datos en la hoja de cálculo
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var nextRow = sheet.getLastRow() + 1;

    var newRow = headers.map(function(header) {
      var h = header.toString().toLowerCase().trim();
      if (h === 'timestamp' || h === 'fecha') return new Date();
      if (h === 'nombre' || h === 'name') return nombre;
      if (h === 'email' || h === 'correo') return email;
      if (h === 'movil' || h === 'mobile' || h === 'telefono' || h === 'phone') return movil;
      if (h === 'servicio' || h === 'subject') return servicio;
      if (h === 'mensaje' || h === 'message') return mensaje;
      return p[header] || p[h] || '';
    });

    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    // -------------------------------------------------------------
    // 1. Notificación para el Administrador
    // -------------------------------------------------------------
    var adminEmail = scriptProp.getProperty('adminEmail') || 'Raulsaldarriagaa@gmail.com';
    var subjectAdmin = '🚀 Nuevo lead interesado: ' + nombre + ' (' + servicio + ')';
    var messageAdmin = '¡Atención Raúl!\n\n' +
                      'Se ha recibido un nuevo registro de prospecto a través del sitio web:\n\n' +
                      '📌 DETALLES DEL PROSPECTO:\n' +
                      '----------------------------------------\n' +
                      '👤 Nombre / Empresa: ' + nombre + '\n' +
                      '✉️ Correo Electrónico: ' + email + '\n' +
                      '📱 WhatsApp / Móvil: ' + movil + '\n' +
                      '🎯 Servicio de Interés: ' + servicio + '\n' +
                      '📝 Notas / Objetivos: ' + mensaje + '\n' +
                      '----------------------------------------\n\n' +
                      '💡 Acción sugerida: Contactar en menos de 24 horas para agendar la auditoría inicial.\n\n' +
                      'Revisa la hoja de cálculo para más detalles.';

    MailApp.sendEmail(adminEmail, subjectAdmin, messageAdmin);

    // -------------------------------------------------------------
    // 2. Correo Confirmatorio y Persuasivo para el Usuario
    // -------------------------------------------------------------
    if (email) {
      var subjectUser = '⚡ ¡Hemos recibido tu solicitud de Auditoría! - IMPRONTA Growth Agency';
      var messageUser = '¡Hola ' + nombre + '! 👋\n\n' +
                        'Gracias por dar el primer paso para escalar tu marca y conectar con tu audiencia ideal.\n\n' +
                        'En IMPRONTA Growth Agency nos especializamos en transformar la presencia digital de negocios ambiciosos mediante sistemas de contenido de alta conversión y embudos estratégicos.\n\n' +
                        '🔎 ¿QUÉ SIGUE AHORA?\n' +
                        'Uno de nuestros estrategas principales analizará la información de tu negocio para preparar una sesión de diagnóstico personalizada enfocada en el servicio solicitado: "' + servicio + '".\n\n' +
                        '📌 CONFIRMACIÓN DE TUS DATOS:\n' +
                        '----------------------------------------\n' +
                        '• Nombre / Empresa: ' + nombre + '\n' +
                        '• Correo Electrónico: ' + email + '\n' +
                        '• WhatsApp / Teléfono: ' + movil + '\n' +
                        '• Servicio Solicitado: ' + servicio + '\n' +
                        '• Detalles compartidos: ' + mensaje + '\n' +
                        '----------------------------------------\n\n' +
                        '💬 Si deseas realizar algún ajuste en la información o agendar de inmediato por WhatsApp, puedes responder directamente a este correo.\n\n' +
                        'Estamos entusiasmados de ayudarte a dejar una huella imborrable en tu mercado.\n\n' +
                        'Atentamente,\n' +
                        'Raúl Saldarriaga & El equipo de IMPRONTA Growth Agency\n' +
                        'https://sites.google.com/view/raulsa/';

      MailApp.sendEmail(userEmail || email, subjectUser, messageUser);
    }

    // Respuesta JSON
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success', 'row': nextRow }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Error en doPost: ' + err); 

    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
