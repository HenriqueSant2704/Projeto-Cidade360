const nodemailer = require("nodemailer");

async function enviarEmail(destinatario, assunto, html) {
    if (!process.env.SMTP_HOST) {
        console.log("SMTP não configurado.");
        console.log("Destinatário:", destinatario);
        console.log("Assunto:", assunto);
        console.log("Conteúdo:", html);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: destinatario,
        subject: assunto,
        html
    });
}

module.exports = enviarEmail;