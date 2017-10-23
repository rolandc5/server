const winston = require('winston');
require('winston-loggly-bulk');
const processAchievements = require('./processAchievements');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const emails = require('./emails');

winston.add(winston.transports.Loggly, { token: process.env.LOGGLY_TOKEN, subdomain: 'parollakay', tags: ['Winston-Nodejs'], json: true });

const sendToUser = (type, to, subject, body) => {
  const from = { name: 'Jorge Pierre fom Parol Lakay', email: 'jorge@parollakay.com' };
  return new Promise((resolve, reject) => {
    const msg = { to, from, subject: type.subject, html: type.html }
    sgMail.send(msg, (err, result) => err ? reject(err) : resolve(result));
  });
}

module.exports = {
  handleErr: (res, status, message, data) => {
    winston.log('Site Error', `${status} - ${message}: ${data}`);
    console.log('error', status, message, data);
    return status === 500 ? res.status(500).send({ message: 'Server error with this operation.'}) : res.status(status).send({ message: message });
  },
  isLoggedIn: function (req, res, next) {
    console.log(req.headers['x-access-token']);
    const message = 'You are not authorized to view this data.';
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) return res.status(403).send({ message });
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) return res.status(403).send({ message });
      req.decoded = decoded;
      next();
    })
  },
  getAchievements: (user) => processAchievements.fn(user),
  sendEmail: {
    welcome: to => sendToUser(emails.welcome, to),
    pwResetSuccess: to => sendToUser(emails.pwResetSuccess, to),
    newDefinition: (to, term) => {
      const type = { subject: emails.newDefinition.subject, html: emails.newDefinition.html(term) }
      return sendToUser(type, to);
    },
    custom: (to, subject, html) => {
      const type = { subject, html }
      return sendToUser(type, to);
    },
    forgotPassword: (to, token) => {
      const type = { subject: emails.resetpassword.subject, html: emails.resetpassword.html(token) };
      return sendToUser(type, to);
    },
    achievement: (to, data) => {
      const type = {
        subject: emails.achievementUnlocked.subject,
        html: emails.achievementUnlocked.html(data)
      }
      return sendToUser(type, to);
    }
  }
}