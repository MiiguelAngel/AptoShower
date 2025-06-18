const { google } = require('googleapis');

exports.handler = async function () {
  try {
    console.log("🔄 Iniciando función getGuests...");

    // Validación de variables de entorno
    if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
      throw new Error("Falta la variable GOOGLE_CREDENTIALS_BASE64");
    }
    if (!process.env.SHEET_ID) {
      throw new Error("Falta la variable SHEET_ID");
    }

    console.log("✅ Variables de entorno presentes");

    // Decodifica la clave Base64 y la convierte a JSON
    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJSON);

    console.log("🔐 Credenciales parseadas con éxito");

    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = 'Invitados';

    // Configura autenticación
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    console.log("🔑 Autenticación configurada");

    const sheets = google.sheets({ version: 'v4', auth });

    // Intenta acceder a la hoja
    console.log(`📄 Consultando hoja: ${sheetName} del documento ${spreadsheetId}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rawValues = response.data.values;
    console.log("📥 Datos crudos recibidos desde Google Sheets:");
    console.log(JSON.stringify(rawValues, null, 2));

    // Filtra los valores válidos
    const invitados = (rawValues || [])
      .map(row => row[0])
      .filter(nombre => typeof nombre === 'string' && nombre.trim() !== '');

    console.log(`🎉 Lista final procesada (${invitados.length} nombres):`);
    console.log(invitados);

    return {
      statusCode: 200,
      body: JSON.stringify(invitados),
    };

  } catch (error) {
    console.error("🚨 Error en getGuests:", error.message);
    console.error(error.stack); // Log completo del stack
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
