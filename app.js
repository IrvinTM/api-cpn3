const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const os = require('os');

const app = express();
app.use(bodyParser.json());
require('dotenv').config()

const twillio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twillio(accountSid, authToken);


// config de postgress

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'parcial3_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});


// enviar correo  TODO amazon ces 
 
async function enviarCorreo(destinatario, datos) {
    console.log(`[STUB] Enviando correo a ${destinatario}...`);
    console.log(`[DATA] UUID: ${datos.uuid}, Nombre: ${datos.nombre}, Server IP: ${datos.ip}`);
    return true;
}

// enviar el sms con twillio 

async function enviarSMS(telefono, datos) {
    console.log(`[STUB] Enviando SMS a ${telefono}...`);
    console.log(`[DATA] UUID: ${datos.uuid}, Nombre: ${datos.nombre}, Server IP: ${datos.ip}`);

    const message = await client.messages.create({
        body: "Hola desde twillio xd xd ",
        from: "+16592004724",
        to: telefono,
    })

    console.log(message.body)
}


// obtener la ip 

function getServerIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

app.post('/api/contacto', async (req, res) => {
    try {
        const contacto = req.body.contacto;

        if (!contacto) {
            return res.status(400).json({ error: 'formato JSON invalido' });
        }

        const { uuid, nombre, correo, telefono } = contacto;
        const serverIP = getServerIP();

        const query = `
            INSERT INTO contactos (uuid, nombre, correo, telefono, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *;
        `;
        
        const values = [uuid, nombre, correo, telefono];
        
        //const dbResult = await pool.query(query, values);

        //console.log('datos guardados en la DB:', dbResult.rows[0]);

        const infoNotificacion = {
            uuid: uuid,
            nombre: nombre,
            ip: serverIP  
        };

        await enviarCorreo(correo, infoNotificacion);
        await enviarSMS(telefono, infoNotificacion);

        res.status(201).json({
            message: 'datos procesados correctamente',
            data_guardada: dbResult.rows[0],
            server_ip: serverIP
        });

    } catch (error) {
        console.error('error procesando la solicitud:', error);
        res.status(500).json({ error: 'error interno del servidor' });
    }
});

app.get('/api/health', async (req, res)=>{

    res.send(`api ready xdxd
       `)
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`escuchando en el puerto ${PORT}`);
});