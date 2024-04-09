const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const dgram = require('dgram');
const moment = require('moment');
const mysql = require('mysql');
const path = require('path');
require('dotenv').config();


// Crear una conexión a la base de datos MySQL
const dbConnection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

// Conectar a la base de datos
dbConnection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos MySQL');
});

// Crear un servidor UDP
const udpServer = dgram.createSocket('udp4');

// Escuchar mensajes UDP en el puerto 7002
udpServer.on('message', async (msg, rinfo) => {
  const messageString = msg.toString();

  const match = messageString.match(/FH: (\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) Lat: (\d+\.\d+) Lon: (-?\d+\.\d+) Alt: (-?\d+\.\d+)/);

  if (match) {
    const fechaString = match[1];
    const fecha = moment(fechaString, 'DD/MM/YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
    const latitud = parseFloat(match[2]);
    const longitud = parseFloat(match[3]);
    const altitud = parseFloat(match[4]);

    // Emitir los datos al cliente a través de Socket.IO
    io.emit('coordenadas', { fecha, latitud, longitud, altitud });

    // Insertar datos en la tabla coordenadas de MySQL
    const sql = 'INSERT INTO coordenadas (fecha, latitud, longitud, altitud) VALUES (?, ?, ?, ?)';
    const values = [fecha, latitud, longitud, altitud];

    dbConnection.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error al insertar datos en la base de datos:', err);
        return;
      }
      console.log('Datos insertados correctamente en la tabla coordenadas');
    });
  }
});

// Iniciar el servidor UDP en el puerto 7002
udpServer.bind(7002);

// Ruta para obtener la última coordenada
app.get('/last-coordinate', (req, res) => {
    const sql = 'SELECT * FROM coordenadas ORDER BY fecha DESC LIMIT 1';
    dbConnection.query(sql, (err, result) => {
        if (err) {
            console.error('Error al obtener la última coordenada desde la base de datos:', err);
            res.status(500).json({ error: 'Error al obtener la última coordenada' });
            return;
        }
        if (result.length > 0) {
            res.json({ lastCoordinate: result[0] });
        } else {
            res.json({ lastCoordinate: null });
        }
    });
});
app.get('/Historicos', (req, res) => {
  res.sendFile(path.join(__dirname, 'Historicos.html'));
});

app.get('/filtrar', (req, res) => {
  const fechaInicio = req.query.inicio;
  const fechaFin = req.query.fin;

  dbConnection.query('SELECT * FROM coordenadas WHERE fecha BETWEEN ? AND ? ORDER BY fecha ASC', [fechaInicio, fechaFin], (error, results) => {
    if (error) {
      console.error('Error al filtrar datos:', error);
      res.status(500).json({ error: 'Error al filtrar datos' });
      return;
    }
    res.json(results);
  });
});

// Ruta para el cliente web
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index1.html');
});

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado');
});

// Iniciar el servidor HTTP en el puerto 3000
http.listen(80);
