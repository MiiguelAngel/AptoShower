const { google } = require('googleapis');

exports.handler = async function (event, context) {
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  const spreadsheetId = process.env.SHEET_ID;
  const sheetName = 'Invitados'; // cambia si tu hoja tiene otro nombre

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`, // primera columna con los invitados
    });

    const values = response.data.values || [];
    const invitados = values.map(row => row[0]);

    return {
      statusCode: 200,
      body: JSON.stringify(invitados),
    };
  } catch (error) {
    console.error("Error en getGuests:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo obtener la lista de invitados" }),
    };
  }
};
