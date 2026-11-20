const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error("Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.");
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === "true",
        auth: { user, pass }
    });

    return transporter;
}

async function sendVerificationEmail(email, otp) {
    const mailer = getTransporter();
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

    await mailer.sendMail({
        from: `Campus Lens <${from}>`,
        to: email,
        subject: "Verify your Campus Lens account",
        text: `Your Campus Lens email verification code is ${otp}. It expires in 10 minutes. If you did not try to register, you can ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#202438;border:1px solid #e8e8f0;border-radius:16px">
            <div style="font-size:13px;font-weight:bold;letter-spacing:2px;color:#6255d9">CAMPUS LENS</div>
            <h2 style="margin-bottom:8px">Verify your student email</h2>
            <p style="color:#5d6475;line-height:1.6">Enter this one-time code in the Campus Photography Platform to finish creating your account.</p>
            <div style="margin:24px 0;padding:18px;background:#f3f1ff;border-radius:12px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#5142c7">${otp}</div>
            <p style="color:#5d6475;font-size:13px">This code expires in <b>10 minutes</b>. Never share it with anyone.</p>
            <p style="color:#8a90a0;font-size:12px">If you did not request this code, ignore this email.</p>
          </div>`
    });
}

module.exports = { sendVerificationEmail };
