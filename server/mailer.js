const nodemailer = require("nodemailer");

const createTransporter = (smtp) =>
  nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

const buildHtml = (lead, submissionNumber) => `
  <h2>New Aspire Lead</h2>
  <p><strong>Submission #:</strong> ${submissionNumber}</p>
  <table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse;">
    <tr><td><strong>Full Name</strong></td><td>${lead.full_name}</td></tr>
    <tr><td><strong>Phone Number</strong></td><td>${lead.phone_number || "-"}</td></tr>
    <tr><td><strong>Organization</strong></td><td>${lead.organization_name}</td></tr>
    <tr><td><strong>Email</strong></td><td>${lead.email}</td></tr>
    <tr><td><strong>No. of Employees</strong></td><td>${lead.no_of_emp}</td></tr>
    <tr><td><strong>Submitted At</strong></td><td>${new Date().toISOString()}</td></tr>
  </table>
`;

const sendLeadEmail = async ({ transporter, from, to, lead, submissionNumber }) => {
  await transporter.sendMail({
    from,
    to,
    subject: `Aspire Lead #${submissionNumber} - ${lead.organization_name}`,
    replyTo: lead.email,
    text: [
      `Submission #: ${submissionNumber}`,
      `Full Name: ${lead.full_name}`,
      `Phone Number: ${lead.phone_number || "-"}`,
      `Organization: ${lead.organization_name}`,
      `Email: ${lead.email}`,
      `No. of Employees: ${lead.no_of_emp}`,
      `Submitted At: ${new Date().toISOString()}`,
    ].join("\n"),
    html: buildHtml(lead, submissionNumber),
  });
};

module.exports = { createTransporter, sendLeadEmail };
