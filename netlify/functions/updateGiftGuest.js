// updateGiftGuest.js
const { google } = require("googleapis");

exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Método no permitido" };
    }

    const { id, reservado, invitado } = JSON.parse(event.body || "{}");
    const idStr = (id ?? "").toString().trim();
    if (!idStr) return { statusCode: 400, body: "Id inválido" };
    if (typeof reservado !== "boolean") return { statusCode: 400, body: "Reserva inválida" };
    const invitadoStr = (invitado ?? "").toString().trim();

    // Credenciales
    const credentialsJSON = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, "base64").toString("utf-8");
    const credentials = JSON.parse(credentialsJSON);
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = "Regalos";

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // 1) Buscar fila por ID (columna A)
    const respA = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });
    const rowsA = respA.data.values || [];
    let fila = -1;
    rowsA.forEach((row, i) => {
      if (row[0] && row[0].toLowerCase().trim() === idStr.toLowerCase().trim()) {
        fila = i + 1;
      }
    });
    if (fila === -1) return { statusCode: 404, body: "Id no encontrado" };

    // 2) Leer estado actual H:I y tipo K
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!H${fila}:K${fila}`, // H=estado, I=invitados, J=extra?, K=tipo
    });
    const [h, i, , tipo] = (resp.data.values && resp.data.values[0]) || ["", "", "", ""];
    const estadoActual = (h || "").toString().trim();
    const invitadosActual = (i || "").toString().trim();
    const tipoRegalo = (tipo || "").toLowerCase();

    const isVarios = tipoRegalo === "varios";
    const isUnico = tipoRegalo === "único" || tipoRegalo === "unico" || !isVarios;

    // --- UNICO ---
    if (isUnico) {
      if (reservado) {
        if (estadoActual.toLowerCase() === "reservado" && invitadosActual && invitadosActual.toLowerCase() !== invitadoStr.toLowerCase()) {
          return { statusCode: 409, body: JSON.stringify({ error: `Ya reservado por ${invitadosActual}.` }) };
        }
        const values = [["Reservado", invitadoStr]];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!H${fila}:I${fila}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Reserva OK (único)", fila, invitado: invitadoStr }) };
      } else {
        const values = [["Disponible", ""]];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!H${fila}:I${fila}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Liberado OK (único)", fila }) };
      }
    }

    // --- VARIOS ---
    if (isVarios) {
      let lista = invitadosActual ? invitadosActual.split(",").map(s => s.trim()).filter(Boolean) : [];

      if (reservado) {
        if (!lista.some(n => n.toLowerCase() === invitadoStr.toLowerCase())) {
          lista.push(invitadoStr);
        }
        const values = [["Reservado", lista.join(", ")]];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!H${fila}:I${fila}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Reserva añadida (varios)", fila, invitados: lista }) };
      } else {
        lista = lista.filter(n => n.toLowerCase() !== invitadoStr.toLowerCase());
        const estadoNuevo = lista.length > 0 ? "Reservado" : "Disponible";
        const values = [[estadoNuevo, lista.join(", ")]];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!H${fila}:I${fila}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values },
        });
        return { statusCode: 200, body: JSON.stringify({ message: "Liberación (varios)", fila, invitados: lista }) };
      }
    }

    return { statusCode: 400, body: "Tipo de regalo desconocido" };
  } catch (error) {
    console.error("❌ Error en updateGiftGuest:", error.message);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};