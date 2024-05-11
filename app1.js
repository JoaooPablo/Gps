const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const dgram = require('dgram');
const moment = require('moment');
const mysql = require('mysql');
const path = require('path');
require('dotenv').config();

app.use(express.static('/home/ubuntu/Gps'));
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
  const match = messageString.match(/FH: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) Lat: (\d+\.\d+) Lon: (-?\d+\.\d+) Alt: (-?\d+\.\d+) RPM: (\d+\.\d+)/);

  if (match) {
    const fechaString = match[1];
    const fecha = moment(fechaString, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
    const latitud = parseFloat(match[2]);
    const longitud = parseFloat(match[3]);
    const altitud = parseFloat(match[4]);
    const rpm = parseFloat(match[5]);

    // Emitir los datos al cliente a través de Socket.IO
    io.emit('coordenadas', { fecha, latitud, longitud, altitud, rpm });

    // Insertar datos en la tabla coordenadas de MySQL
    const sql = 'INSERT INTO coordenadas (fecha, latitud, longitud, altitud, RPM) VALUES (?, ?, ?, ?, ?)';
    const values = [fecha, latitud, longitud, altitud, rpm];

    dbConnection.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error al insertar datos en la base de datos:', err);
        return;
      }
      console.log('Datos insertados correctamente en la tabla coordenadas');
    });
  } else {
    const match1 = messageString.match(/FH: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) Lat: (\d+\.\d+) Lon: (-?\d+\.\d+) Alt: (-?\d+\.\d+)/);

    if (match1) {
      const fechaString1 = match1[1];
      const fecha1 = moment(fechaString1, 'YYYY-MM-DD HH:mm:ss').format('YYYY-MM-DD HH:mm:ss');
      const latitud1 = parseFloat(match1[2]);
      const longitud1 = parseFloat(match1[3]);
      const altitud1 = parseFloat(match1[4]);

      io.emit('coordenadas1', { fecha1, latitud1, longitud1, altitud1});

      // Insertar datos en la tabla coordenadas1 de MySQL
      const sql1 = 'INSERT INTO coordenadas1 (fecha, latitud, longitud, altitud) VALUES (?, ?, ?, ?)';
      const values1 = [fecha1, latitud1, longitud1, altitud1];

      dbConnection.query(sql1, values1, (err1, result1) => {
        if (err1) {
          console.error('Error al insertar datos en la base de datos:', err1);
          return;
        }
        console.log('Datos insertados correctamente en la tabla coordenadas1');
      });
    } else {
      // El mensaje no coincide con ninguno de los formatos esperados
      console.error('Mensaje no reconocido:', messageString);
    }
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

app.get('/last-coordinate1', (req, res) => {
  const sql = 'SELECT * FROM coordenadas1 ORDER BY fecha DESC LIMIT 1';
  dbConnection.query(sql, (err, result) => {
      if (err) {
          console.error('Error al obtener la última coordenada desde la base de datos:', err);
          res.status(500).json({ error: 'Error al obtener la última coordenada' });
          return;
      }
      if (result.length > 0) {
          res.json({ lastCoordinate1: result[0] });
      } else {
          res.json({ lastCoordinate1: null });
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

app.get('/filtrar1', (req, res) => {
  const fechaInicio = req.query.inicio;
  const fechaFin = req.query.fin;

  dbConnection.query('SELECT * FROM coordenadas1 WHERE fecha BETWEEN ? AND ? ORDER BY fecha ASC', [fechaInicio, fechaFin], (error, results) => {
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

app.get('/informacion', (req, res) => {
    res.sendFile(__dirname + '/info.html');
});

// Configurar Socket.IO
io.on('connection', (socket) => {
    console.log('Un cliente se ha conectado');
});

// Iniciar el servidor HTTP en el puerto 80
http.listen(80);
