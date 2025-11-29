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

var AWS = require("aws-sdk");

AWS.config.update({ region: "us-east-2" });



// config de postgress

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'parcial3',
    password: process.env.DB_PASSWORD || 'mysecretpassword',
    port: process.env.DB_PORT || 5432,
});


// enviar correo  TODO amazon ces 

async function enviarCorreo(destinatario, datos) {
    console.log(`[STUB] Enviando correo a ${destinatario}...`);
    console.log(`[DATA] UUID: ${datos.uuid}, Nombre: ${datos.nombre}, Server IP: ${datos.ip}`);

    var params = {
        Destination: {
            /* required */ //TODO
            CcAddresses: [
                "tm22012@ues.edu.sv",
                /* more items */
            ],
            ToAddresses: [
                destinatario,
                /* more items */
            ],
        },
        Message: {
            /* required */
            Body: {
                /* required */
                Html: {
                    Charset: "UTF-8",
                    Data: "Hola desde Amazon SES",
                },
                Text: {
                    Charset: "UTF-8",
                    Data: "TEXT_FORMAT_BODY",
                },
            },
            Subject: {
                Charset: "UTF-8",
                Data: "Test email from Amazon SES",
            },
        },

        //TODO
        Source: "irvintm23@gmail.com" /* required */,
        ReplyToAddresses: [
            "irvintm23@gmail.com",
            /* more items */
        ],
    };

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({ apiVersion: "2010-12-01" })
        .sendEmail(params)
        .promise();

    // Handle promise's fulfilled/rejected states
    sendPromise
        .then(function(data) {
            console.log(data.MessageId);
        })
        .catch(function(err) {
            console.error(err, err.stack);
        });
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

        //  const dbResult = await pool.query(query, values);

        // console.log('datos guardados en la DB:', dbResult.rows[0]);

        const infoNotificacion = {
            uuid: uuid,
            nombre: nombre,
            ip: serverIP
        };

        await enviarCorreo(correo, infoNotificacion);
        await enviarSMS(telefono, infoNotificacion);

        res.status(201).json({
            message: 'datos procesados correctamente',
            //data_guardada: dbResult.rows[0],
            server_ip: serverIP
        });

    } catch (error) {
        console.error('error procesando la solicitud:', error);
        res.status(500).json({ error: 'error interno del servidor' });
    }
});

app.get('/api/health', async (req, res) => {

    res.send(`api ready xdxd
       `)
})

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {

    console.log("la ip es: " + getServerIP())
    console.log(`escuchando en el puerto ${PORT}`);
});

