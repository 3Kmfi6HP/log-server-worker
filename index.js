const express = require('express');
const fs = require('fs').promises;
// const fetch = require('node-fetch');

// Create Express app
const app = express();

const TELEGRAM_BOT_TOKEN = '';
const CHAT_ID = '';

let logID = 0;

/**
 * Save parsed log data into files locally on disk.
 * @param {string} instanceId - A UUID representing each instance.
 * @param {*} msg - The logged message content as string or object (converted to JSON).
 */
async function saveLogToFile(instanceId, msg) {
  // const logFilePath = `logs/worker.log`;
  const logFilePath = `/tmp/${instanceId}.log`;

  // Append serialized logged data in a formatted way into file using write stream API
  try {
    await fs.appendFile(logFilePath, `${msg}\n`, 'utf8');

    // Check if the log file exceeds 100 lines
    const logFileContent = await fs.readFile(logFilePath, 'utf8');
    const lines = logFileContent.split('\n');

    if (lines.length >= 10) {
      await sendLogFileToTelegram(instanceId, logFileContent);
      await fs.unlink(logFilePath); // Delete the file after sending to Telegram
    }
  } catch (err) {
    console.error(`Error saving logfile for ${instanceId}`, err);
  }
}

/**
 * Send log file content to Telegram bot.
 * @param {string} instanceId - A UUID representing each instance.
 * @param {string} logFileContent - The content of the log file.
 */
async function sendLogFileToTelegram(instanceId, logFileContent) {
  const message = `Log file for instance ${instanceId}:\n\n${logFileContent}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
    });

    if (!response.ok) {
      console.error('Error sending log file to Telegram:', response.statusText);
    }
  } catch (err) {
    console.error('Error sending log file to Telegram:', err.message);
  }
}

app.use(express.text());

// POST route handler for receiving logs from client side via fetch requests
app.post('/logs', async (req, res) => {
  const [instanceId, , ...logs] = req.body.split(' ');

  const logData = logs.join(' ');

  // Save the parsed log data into a file on disk
  await saveLogToFile(instanceId, logData);

  res.sendStatus(200);
});

// Start listening for incoming requests
app.listen(8080, () => {
  console.log('Receiver-side log server is running.');
});
